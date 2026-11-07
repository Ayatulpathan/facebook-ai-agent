import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.models import (
    Content, ContentVersion, Approval, PublishingQueue, PublishedPost,
    MediaAsset, AuditLog, Notification, AppSetting, PageConnection
)
from app.facebook.meta_client import (
    BaseMetaClient, LiveMetaClient, MockMetaClient,
    MetaAPIError, MetaPermissionError, MetaTokenExpiredError
)
from app.core.config import settings

logger = logging.getLogger(__name__)

class UnapprovedContentError(Exception):
    """Raised when an attempt is made to publish content without explicit human approval."""
    pass

class GlobalPauseActiveError(Exception):
    """Raised when publishing is attempted while the emergency Global Pause is enabled."""
    pass

class PublisherGatekeeper:
    """
    Mandatory Security and Compliance Gatekeeper for Facebook Content Publishing.
    Enforces the zero-trust human-in-the-loop invariant before any byte touches the Meta API.
    """

    def __init__(self, db: Session, meta_client: Optional[BaseMetaClient] = None):
        self.db = db
        self.meta_client = meta_client

    def _get_active_client(self) -> BaseMetaClient:
        if self.meta_client:
            return self.meta_client

        conn = self.db.query(PageConnection).first()
        if not conn or conn.is_mock_mode or not conn.access_token_encrypted:
            page_id = conn.page_id if conn and conn.page_id else "mock_page_1020304050"
            page_name = conn.page_name if conn and conn.page_name else "Local AI Brand Sandbox"
            missing = json.loads(conn.missing_permissions) if conn and conn.missing_permissions else []
            return MockMetaClient(page_id=page_id, page_name=page_name, simulated_missing_perms=missing)

        return LiveMetaClient(
            page_id=conn.page_id or "",
            access_token=conn.access_token_encrypted or "",
            app_id=conn.app_id,
            app_secret=conn.app_secret_masked
        )

    def publish_approved_content(
        self,
        content_id: int,
        triggered_by: str = "scheduler"
    ) -> Dict[str, Any]:
        """
        Validates approvals, runs safety checks, and transmits to Facebook Page.
        """
        # 1. Global Pause verification
        pause_setting = self.db.query(AppSetting).filter(AppSetting.key == "global_pause").first()
        if pause_setting and pause_setting.value.lower() == "true":
            raise GlobalPauseActiveError("Publishing is blocked: Emergency Global Pause is currently ACTIVE.")

        # 2. Content existence verification
        content = self.db.query(Content).filter(Content.id == content_id).first()
        if not content:
            raise ValueError(f"Content with id {content_id} not found.")

        # 3. Retrieve latest/current version
        current_version = self.db.query(ContentVersion).filter(
            ContentVersion.id == content.current_version_id
        ).first()

        if not current_version:
            # Fallback to the latest version by version_num
            current_version = self.db.query(ContentVersion).filter(
                ContentVersion.content_id == content.id
            ).order_by(ContentVersion.version_num.desc()).first()

        if not current_version:
            raise ValueError(f"No version found for content {content_id}.")

        # 4. Mandatory Human Approval Verification
        approval = self.db.query(Approval).filter(
            Approval.content_id == content.id,
            Approval.version_num == current_version.version_num,
            Approval.status == "APPROVED"
        ).first()

        if not approval:
            raise UnapprovedContentError(
                f"Content {content_id} (v{current_version.version_num}) cannot be published: "
                "No valid human approval record found for this exact version."
            )

        if not approval.reviewer_id:
            raise UnapprovedContentError(
                f"Content {content_id} was not approved by an authenticated human administrator."
            )

        # 5. Publishing Queue state verification & locking
        queue_item = self.db.query(PublishingQueue).filter(
            PublishingQueue.content_id == content.id
        ).first()

        if queue_item and queue_item.state == "PUBLISHED":
            return {
                "success": True,
                "already_published": True,
                "message": "Content is already published."
            }

        if queue_item:
            queue_item.state = "PUBLISHING"
            self.db.commit()

        content.status = "Publishing"
        self.db.commit()

        # 6. Prepare payload & message
        caption = current_version.caption_bn if content.language == "bn" else current_version.caption_en
        if not caption:
            caption = current_version.caption_bn or current_version.caption_en

        full_message = caption
        if current_version.hashtags:
            full_message = f"{full_message}\n\n{current_version.hashtags}"
        if current_version.call_to_action:
            full_message = f"{full_message}\n\n👉 {current_version.call_to_action}"

        # Resolve media assets if any
        media_ids = []
        try:
            media_ids = json.loads(current_version.media_asset_ids)
        except Exception:
            pass

        media_asset: Optional[MediaAsset] = None
        if media_ids:
            media_asset = self.db.query(MediaAsset).filter(MediaAsset.id == media_ids[0]).first()

        client = self._get_active_client()

        # 7. Dispatch to Meta API
        try:
            meta_res: Dict[str, Any] = {}
            if media_asset and media_asset.file_type == "video/mp4" and os.path.exists(media_asset.file_path):
                meta_res = client.publish_video(
                    video_path=media_asset.file_path,
                    description=full_message,
                    title=content.title
                )
            elif media_asset and media_asset.file_type.startswith("image/") and os.path.exists(media_asset.file_path):
                meta_res = client.publish_photo(
                    image_path=media_asset.file_path,
                    caption=full_message
                )
            else:
                meta_res = client.publish_text(message=full_message)

            meta_post_id = meta_res.get("meta_post_id", f"post_{content_id}_{int(datetime.now(timezone.utc).timestamp())}")
            permalink_url = meta_res.get("permalink_url", f"https://www.facebook.com/{meta_post_id}")

            # 8. Record success state in database
            published_record = PublishedPost(
                content_id=content.id,
                meta_post_id=meta_post_id,
                permalink_url=permalink_url,
                published_at=datetime.now(timezone.utc)
            )
            self.db.add(published_record)

            content.status = "Published"
            if queue_item:
                queue_item.state = "PUBLISHED"

            # Audit Log
            audit_entry = AuditLog(
                action="POST_PUBLISHED",
                entity="content",
                entity_id=str(content.id),
                actor=triggered_by,
                details=f"Successfully published to Facebook. Meta Post ID: {meta_post_id}, URL: {permalink_url}"
            )
            self.db.add(audit_entry)

            # Notification
            notif = Notification(
                title="Post Published to Facebook",
                message=f"Post '{content.title}' was successfully published to Facebook.",
                severity="success",
                link=permalink_url
            )
            self.db.add(notif)
            self.db.commit()

            return {
                "success": True,
                "content_id": content.id,
                "meta_post_id": meta_post_id,
                "permalink_url": permalink_url,
                "published_at": published_record.published_at.isoformat()
            }

        except Exception as e:
            self.db.rollback()
            error_str = str(e)
            logger.error(f"Failed to publish content {content.id}: {error_str}")

            if queue_item:
                queue_item.state = "FAILED"
                queue_item.retry_count += 1
                queue_item.error_message = error_str
            
            content.status = "Failed"

            audit_fail = AuditLog(
                action="POST_PUBLISH_FAILED",
                entity="content",
                entity_id=str(content.id),
                actor=triggered_by,
                details=f"Publishing failed: {error_str}"
            )
            self.db.add(audit_fail)

            notif_fail = Notification(
                title="Post Publishing Failed",
                message=f"Failed to publish '{content.title}': {error_str}",
                severity="error",
                link="/approvals"
            )
            self.db.add(notif_fail)
            self.db.commit()

            raise e
