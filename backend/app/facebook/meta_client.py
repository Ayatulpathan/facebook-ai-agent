import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger(__name__)

# Required and optional Meta permissions
REQUIRED_PERMISSIONS = {
    "pages_manage_posts": {
        "name": "Publish Posts & Reels",
        "description": "Required to publish captions, graphics, and video Reels directly to your Page feed.",
        "required": True,
        "impact_if_missing": "Direct publishing to Facebook Page will be blocked."
    },
    "pages_read_engagement": {
        "name": "Read Comments & Engagement",
        "description": "Required to retrieve comments, reactions, and post engagement data.",
        "required": True,
        "impact_if_missing": "Comment management and response drafting will be disabled."
    },
    "pages_show_list": {
        "name": "Discover & Connect Pages",
        "description": "Required to list and link the Facebook Pages managed by your Meta account.",
        "required": True,
        "impact_if_missing": "Automated Page discovery and OAuth account selection will be disabled."
    },
    "pages_messaging": {
        "name": "Messenger Customer Support",
        "description": "Required to receive customer inquiries and send approved Messenger replies.",
        "required": False,
        "impact_if_missing": "Messenger automation is inactive. Manual replies via Meta Business Suite required."
    },
    "read_insights": {
        "name": "Page Performance & Analytics",
        "description": "Required to retrieve reach, impressions, follower growth, and post metrics.",
        "required": False,
        "impact_if_missing": "Historical page reach and performance analytics charts will be disabled."
    }
}

class MetaAPIError(Exception):
    """Raised when the Meta Graph API returns an error response."""
    def __init__(self, message: str, code: Optional[int] = None, subcode: Optional[int] = None):
        super().__init__(message)
        self.code = code
        self.subcode = subcode

class MetaPermissionError(MetaAPIError):
    """Raised when an operation lacks the required Meta Graph API permission."""
    pass

class MetaTokenExpiredError(MetaAPIError):
    """Raised when the Meta access token has expired or is invalid."""
    pass


class BaseMetaClient:
    """Abstract interface for Meta Graph API operations."""

    def get_page_info(self) -> Dict[str, Any]:
        raise NotImplementedError

    def verify_token(self) -> Dict[str, Any]:
        raise NotImplementedError

    def publish_text(self, message: str) -> Dict[str, Any]:
        raise NotImplementedError

    def publish_photo(self, image_path: str, caption: str) -> Dict[str, Any]:
        raise NotImplementedError

    def publish_video(self, video_path: str, description: str, title: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError

    def get_recent_comments(self, post_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get_page_insights(self) -> Dict[str, Any]:
        raise NotImplementedError

    def reply_to_comment(self, comment_id: str, message: str) -> Dict[str, Any]:
        raise NotImplementedError

    def send_messenger_message(self, recipient_id: str, message: str) -> Dict[str, Any]:
        raise NotImplementedError

    def get_messenger_conversations(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get_conversation_messages(self, thread_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError


class LiveMetaClient(BaseMetaClient):
    """Official Meta Graph API v20.0 Client."""

    def __init__(
        self,
        page_id: str,
        access_token: str,
        app_id: Optional[str] = None,
        app_secret: Optional[str] = None,
        api_version: str = "v20.0"
    ):
        self.page_id = page_id
        self.access_token = access_token
        self.app_id = app_id
        self.app_secret = app_secret
        self.api_version = api_version
        self.base_url = f"https://graph.facebook.com/{api_version}"
        self.timeout = 30.0

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json"
        }

    def _handle_response(self, response: httpx.Response) -> Dict[str, Any]:
        try:
            data = response.json()
        except Exception:
            response.raise_for_status()
            return {"success": True}

        if "error" in data:
            error = data["error"]
            code = error.get("code")
            subcode = error.get("error_subcode")
            message = error.get("message", "Unknown Meta Graph API error")

            # 190 = Invalid/Expired OAuth Token
            if code == 190:
                raise MetaTokenExpiredError(f"Meta token invalid or expired: {message}", code=code, subcode=subcode)
            # 200-299 = Permission errors
            elif code in (200, 210, 220, 230) or "permission" in message.lower():
                raise MetaPermissionError(f"Missing required permission: {message}", code=code, subcode=subcode)
            else:
                raise MetaAPIError(f"Meta API error ({code}): {message}", code=code, subcode=subcode)

        return data

    def get_page_info(self) -> Dict[str, Any]:
        url = f"{self.base_url}/{self.page_id}"
        params = {"fields": "id,name,category,fan_count,about,picture{url}"}
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, headers=self._headers(), params=params)
            if resp.status_code == 400 and "(#100)" in resp.text:
                # Graceful fallback if certain fields (e.g. category/fan_count) are unsupported by the node type
                resp = client.get(url, headers=self._headers(), params={"fields": "id,name,picture{url}"})
            data = self._handle_response(resp)
            picture_url = ""
            if "picture" in data and "data" in data["picture"]:
                picture_url = data["picture"]["data"].get("url", "")
            return {
                "page_id": data.get("id", self.page_id),
                "page_name": data.get("name", "Unknown Page"),
                "category": data.get("category", "Business"),
                "followers_count": data.get("fan_count", 0),
                "avatar_url": picture_url,
                "about": data.get("about", "")
            }

    def verify_token(self) -> Dict[str, Any]:
        """Inspects token validity and granted permissions."""
        url = f"{self.base_url}/me/permissions"
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, headers=self._headers())
            data = self._handle_response(resp)
            
            granted: List[str] = []
            declined: List[str] = []
            
            for item in data.get("data", []):
                perm = item.get("permission")
                status = item.get("status")
                if status == "granted":
                    granted.append(perm)
                else:
                    declined.append(perm)

            missing: List[str] = [
                k for k, v in REQUIRED_PERMISSIONS.items() if v["required"] and k not in granted
            ]

            return {
                "is_valid": True,
                "token_status": "VALID" if not missing else "DEGRADED",
                "permissions_granted": granted,
                "missing_permissions": missing,
                "declined_permissions": declined,
                "checked_at": datetime.now(timezone.utc).isoformat()
            }

    def publish_text(self, message: str) -> Dict[str, Any]:
        url = f"{self.base_url}/{self.page_id}/feed"
        payload = {"message": message}
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, headers=self._headers(), data=payload)
            data = self._handle_response(resp)
            post_id = data.get("id")
            return {
                "success": True,
                "meta_post_id": post_id,
                "permalink_url": f"https://www.facebook.com/{post_id}",
                "published_at": datetime.now(timezone.utc).isoformat()
            }

    def publish_photo(self, image_path: str, caption: str) -> Dict[str, Any]:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at: {image_path}")
        
        url = f"{self.base_url}/{self.page_id}/photos"
        with open(image_path, "rb") as img_file:
            files = {"source": (os.path.basename(image_path), img_file, "image/png")}
            data = {"caption": caption}
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(url, headers=self._headers(), data=data, files=files)
                res_data = self._handle_response(resp)
                post_id = res_data.get("post_id") or res_data.get("id")
                return {
                    "success": True,
                    "meta_post_id": post_id,
                    "permalink_url": f"https://www.facebook.com/{post_id}",
                    "published_at": datetime.now(timezone.utc).isoformat()
                }

    def publish_video(self, video_path: str, description: str, title: Optional[str] = None) -> Dict[str, Any]:
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at: {video_path}")
        
        url = f"{self.base_url}/{self.page_id}/videos"
        with open(video_path, "rb") as vid_file:
            files = {"source": (os.path.basename(video_path), vid_file, "video/mp4")}
            data = {"description": description}
            if title:
                data["title"] = title
            with httpx.Client(timeout=60.0) as client:
                resp = client.post(url, headers=self._headers(), data=data, files=files)
                res_data = self._handle_response(resp)
                post_id = res_data.get("id")
                return {
                    "success": True,
                    "meta_post_id": post_id,
                    "permalink_url": f"https://www.facebook.com/{post_id}",
                    "published_at": datetime.now(timezone.utc).isoformat()
                }

    def get_recent_comments(self, post_id: str) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/{post_id}/comments"
        params = {"fields": "id,from,message,created_time,like_count,comment_count", "limit": 25}
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, headers=self._headers(), params=params)
            data = self._handle_response(resp)
            return data.get("data", [])

    def get_page_insights(self) -> Dict[str, Any]:
        url = f"{self.base_url}/{self.page_id}/insights"
        params = {
            "metric": "page_impressions,page_post_engagements",
            "period": "day"
        }
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, headers=self._headers(), params=params)
            data = self._handle_response(resp)
            return data

    def reply_to_comment(self, comment_id: str, message: str) -> Dict[str, Any]:
        url = f"{self.base_url}/{comment_id}/comments"
        payload = {"message": message}
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, headers=self._headers(), data=payload)
            data = self._handle_response(resp)
            reply_id = data.get("id")
            return {
                "success": True,
                "meta_reply_id": reply_id,
                "sent_at": datetime.now(timezone.utc).isoformat()
            }

    def send_messenger_message(self, recipient_id: str, message: str) -> Dict[str, Any]:
        url = f"{self.base_url}/me/messages"
        payload = {
            "recipient": {"id": recipient_id},
            "message": {"text": message}
        }
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, headers=self._headers(), json=payload)
            data = self._handle_response(resp)
            msg_id = data.get("message_id")
            return {
                "success": True,
                "meta_message_id": msg_id,
                "sent_at": datetime.now(timezone.utc).isoformat()
            }

    def get_messenger_conversations(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/{self.page_id}/conversations"
        params = {"fields": "id,snippet,updated_time,senders", "limit": 20}
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, headers=self._headers(), params=params)
            data = self._handle_response(resp)
            return data.get("data", [])

    def get_conversation_messages(self, thread_id: str) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/{thread_id}/messages"
        params = {"fields": "id,message,created_time,from", "limit": 50}
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, headers=self._headers(), params=params)
            data = self._handle_response(resp)
            return data.get("data", [])


class MockMetaClient(BaseMetaClient):
    """
    High-Fidelity Mock Meta Graph API Sandbox.
    Enables complete zero-cost offline local testing, approval verification,
    and workflow evaluation without requiring live Meta App registration.
    """

    def __init__(
        self,
        page_id: str = "mock_page_1020304050",
        page_name: str = "Local AI Brand Sandbox",
        simulated_missing_perms: Optional[List[str]] = None
    ):
        self.page_id = page_id
        self.page_name = page_name
        self.simulated_missing_perms = simulated_missing_perms or []

    def get_page_info(self) -> Dict[str, Any]:
        return {
            "page_id": self.page_id,
            "page_name": self.page_name,
            "category": "E-Commerce & Digital Brand",
            "followers_count": 3450,
            "avatar_url": "https://placehold.co/200x200/1877f2/ffffff?text=FB",
            "about": "Official Facebook Page running in Privacy-First Local AI Sandbox Mode."
        }

    def verify_token(self) -> Dict[str, Any]:
        all_perms = list(REQUIRED_PERMISSIONS.keys())
        granted = [p for p in all_perms if p not in self.simulated_missing_perms]
        missing = [p for p in self.simulated_missing_perms if REQUIRED_PERMISSIONS.get(p, {}).get("required", False)]
        
        status = "VALID"
        if missing:
            status = "DEGRADED"

        return {
            "is_valid": True,
            "token_status": status,
            "token_type": "PAGE_LONG_LIVED_MOCK_TOKEN",
            "expires_in_days": 58,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=58)).isoformat(),
            "permissions_granted": granted,
            "missing_permissions": missing,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }

    def publish_text(self, message: str) -> Dict[str, Any]:
        if "pages_manage_posts" in self.simulated_missing_perms:
            raise MetaPermissionError("pages_manage_posts permission is missing. Publishing blocked.")
        
        timestamp = int(datetime.now(timezone.utc).timestamp())
        mock_id = f"{self.page_id}_{timestamp}_text"
        return {
            "success": True,
            "meta_post_id": mock_id,
            "permalink_url": f"https://www.facebook.com/{self.page_id}/posts/{mock_id}",
            "published_at": datetime.now(timezone.utc).isoformat()
        }

    def publish_photo(self, image_path: str, caption: str) -> Dict[str, Any]:
        if "pages_manage_posts" in self.simulated_missing_perms:
            raise MetaPermissionError("pages_manage_posts permission is missing. Publishing blocked.")
        
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image asset does not exist: {image_path}")

        timestamp = int(datetime.now(timezone.utc).timestamp())
        mock_id = f"{self.page_id}_{timestamp}_photo"
        return {
            "success": True,
            "meta_post_id": mock_id,
            "permalink_url": f"https://www.facebook.com/{self.page_id}/photos/{mock_id}",
            "published_at": datetime.now(timezone.utc).isoformat()
        }

    def publish_video(self, video_path: str, description: str, title: Optional[str] = None) -> Dict[str, Any]:
        if "pages_manage_posts" in self.simulated_missing_perms:
            raise MetaPermissionError("pages_manage_posts permission is missing. Publishing blocked.")
        
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video asset does not exist: {video_path}")

        timestamp = int(datetime.now(timezone.utc).timestamp())
        mock_id = f"{self.page_id}_{timestamp}_reel"
        return {
            "success": True,
            "meta_post_id": mock_id,
            "permalink_url": f"https://www.facebook.com/{self.page_id}/videos/{mock_id}",
            "published_at": datetime.now(timezone.utc).isoformat()
        }

    def get_recent_comments(self, post_id: str) -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        return [
            {
                "id": f"comment_{post_id}_1",
                "from": {"name": "Rafiqul Islam", "id": "user_101"},
                "message": "এই প্রোডাক্টটির প্রাইস কত? হোম ডেলিভারি কি এভেইলেবল?",
                "created_time": now,
                "like_count": 3,
                "comment_count": 0
            },
            {
                "id": f"comment_{post_id}_2",
                "from": {"name": "Sadia Rahman", "id": "user_102"},
                "message": "Really loved the video design! Do you deliver to Chittagong?",
                "created_time": now,
                "like_count": 5,
                "comment_count": 1
            }
        ]

    def get_page_insights(self) -> Dict[str, Any]:
        return {
            "page_impressions": 4820,
            "page_engaged_users": 640,
            "page_post_engagements": 395,
            "page_video_views": 1820
        }

    def reply_to_comment(self, comment_id: str, message: str) -> Dict[str, Any]:
        timestamp = int(datetime.now(timezone.utc).timestamp())
        return {
            "success": True,
            "meta_reply_id": f"mock_comment_reply_{comment_id}_{timestamp}",
            "sent_at": datetime.now(timezone.utc).isoformat()
        }

    def send_messenger_message(self, recipient_id: str, message: str) -> Dict[str, Any]:
        timestamp = int(datetime.now(timezone.utc).timestamp())
        return {
            "success": True,
            "meta_message_id": f"mock_msg_out_{recipient_id}_{timestamp}",
            "sent_at": datetime.now(timezone.utc).isoformat()
        }

    def get_messenger_conversations(self) -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        return [
            {
                "id": "thread_mock_001",
                "snippet": "ভাইয়া এই প্রোডাক্টটা কি স্টকে আছে? ডেলিভারি কত দিন লাগবে?",
                "updated_time": now,
                "senders": {"data": [{"name": "Farhan Ahmed", "id": "cust_mock_001"}]}
            },
            {
                "id": "thread_mock_002",
                "snippet": "Hello! Can you please confirm the warranty and delivery charge to Sylhet?",
                "updated_time": now,
                "senders": {"data": [{"name": "Tanvir Hasan", "id": "cust_mock_002"}]}
            },
            {
                "id": "thread_mock_003",
                "snippet": "আমি ২টি অর্ডার করতে চাই, ফোন নাম্বার: 01711223344",
                "updated_time": now,
                "senders": {"data": [{"name": "Nusrat Jahan", "id": "cust_mock_003"}]}
            }
        ]

    def get_conversation_messages(self, thread_id: str) -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        if thread_id == "thread_mock_003":
            return [
                {
                    "id": "msg_003_1",
                    "message": "আমি ২টি অর্ডার করতে চাই, ফোন নাম্বার: 01711223344",
                    "created_time": now,
                    "from": {"name": "Nusrat Jahan", "id": "cust_mock_003"}
                }
            ]
        elif thread_id == "thread_mock_002":
            return [
                {
                    "id": "msg_002_1",
                    "message": "Hello! Can you please confirm the warranty and delivery charge to Sylhet?",
                    "created_time": now,
                    "from": {"name": "Tanvir Hasan", "id": "cust_mock_002"}
                }
            ]
        return [
            {
                "id": "msg_001_1",
                "message": "ভাইয়া এই প্রোডাক্টটা কি স্টকে আছে? ডেলিভারি কত দিন লাগবে?",
                "created_time": now,
                "from": {"name": "Farhan Ahmed", "id": "cust_mock_001"}
            }
        ]


def build_meta_oauth_url(app_id: str, redirect_uri: str, state: str = "local_auth") -> str:
    """Constructs the official Meta dialog login URL with required scopes."""
    scopes = ",".join(REQUIRED_PERMISSIONS.keys())
    return (
        f"https://www.facebook.com/v20.0/dialog/oauth?"
        f"client_id={app_id}&"
        f"redirect_uri={redirect_uri}&"
        f"state={state}&"
        f"scope={scopes}&"
        f"response_type=code"
    )
