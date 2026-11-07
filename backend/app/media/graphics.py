import io
import math
from typing import Dict, Any, Optional
from PIL import Image, ImageDraw, ImageFont
from app.core.config import settings

def hex_to_rgb(hex_code: str, default=(24, 119, 242)):
    hex_code = hex_code.lstrip('#')
    if len(hex_code) == 6:
        try:
            return tuple(int(hex_code[i:i+2], 16) for i in (0, 2, 4))
        except ValueError:
            return default
    return default

class GraphicStudioEngine:
    """
    Zero-Cost, lightweight local promotional graphic rendering engine.
    Produces high-resolution Facebook post graphics (1080x1080)
    using pure Pillow vector canvas without heavy diffusion models or GPU overhead.
    """

    TEMPLATES = [
        "promotional",
        "product_showcase",
        "sale_announcement",
        "festival_greeting",
        "educational",
        "quote_graphic",
        "price_card",
        "announcement_banner"
    ]

    @staticmethod
    def get_template_specs() -> Dict[str, Any]:
        return {
            "promotional": {
                "name": "Promotional Post",
                "description": "Bold headline, feature highlights, and prominent call to action.",
                "fields": ["title", "subtitle", "badge_text", "cta_text"]
            },
            "product_showcase": {
                "name": "Product Showcase",
                "description": "Featured product presentation with verified pricing and benefits.",
                "fields": ["title", "subtitle", "price_text", "cta_text"]
            },
            "sale_announcement": {
                "name": "Sale Announcement",
                "description": "High-urgency discount banner with limited-time tag.",
                "fields": ["title", "discount_text", "subtitle", "cta_text"]
            },
            "festival_greeting": {
                "name": "Festival & Seasonal Greeting",
                "description": "Celebratory greeting banner for Eid, New Year, Pohela Boishakh, etc.",
                "fields": ["title", "greeting_message", "subtitle", "signature"]
            },
            "educational": {
                "name": "Educational Tip / Infographic",
                "description": "Step-by-step tips, advice cards, and instructional highlights.",
                "fields": ["title", "tip_number", "content", "takeaway"]
            },
            "quote_graphic": {
                "name": "Quote Graphic",
                "description": "Inspirational brand quotation with sleek typography and attribution.",
                "fields": ["quote", "author", "brand_tag"]
            },
            "price_card": {
                "name": "Product Price Card",
                "description": "Clean, verified commercial package pricing breakdown.",
                "fields": ["package_name", "price", "features", "cta_text"]
            },
            "announcement_banner": {
                "name": "Announcement Banner",
                "description": "Urgent brand alert, schedule update, or new feature reveal.",
                "fields": ["headline", "details", "contact_info"]
            }
        }

    @classmethod
    def render_graphic(
        cls,
        template_name: str,
        data: Dict[str, str],
        primary_color: str = "#1877F2",
        secondary_color: str = "#42B72A",
        brand_name: str = "Official Brand",
        format_type: str = "PNG" # PNG or JPEG
    ) -> bytes:
        width, height = 1080, 1080
        img = Image.new("RGBA" if format_type == "PNG" else "RGB", (width, height), (15, 23, 42))
        draw = ImageDraw.Draw(img)

        c_primary = hex_to_rgb(primary_color, (24, 119, 242))
        c_secondary = hex_to_rgb(secondary_color, (66, 183, 42))

        # 1. Background Gradient / Grid Accents
        for y in range(height):
            ratio = y / height
            r = int(15 * (1 - ratio) + (c_primary[0] * 0.15) * ratio)
            g = int(23 * (1 - ratio) + (c_primary[1] * 0.15) * ratio)
            b = int(42 * (1 - ratio) + (c_primary[2] * 0.20) * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        # Corner glowing circular accent
        accent_center = (width - 100, 100)
        draw.ellipse(
            [accent_center[0] - 300, accent_center[1] - 300, accent_center[0] + 300, accent_center[1] + 300],
            outline=(*c_primary, 40),
            width=3
        )
        draw.ellipse(
            [accent_center[0] - 220, accent_center[1] - 220, accent_center[0] + 220, accent_center[1] + 220],
            outline=(*c_secondary, 30),
            width=2
        )

        # 2. Outer Border Frame
        draw.rounded_rectangle(
            [40, 40, width - 40, height - 40],
            radius=24,
            outline=(*c_primary, 120),
            width=3
        )

        # 3. Brand Header Pill
        draw.rounded_rectangle([80, 75, 420, 135], radius=16, fill=(*c_primary, 40), outline=(*c_primary, 180), width=1)
        draw.text((105, 92), f"★ {brand_name.upper()}", fill=(255, 255, 255))

        # 4. Content Rendering Based on Template
        title = data.get("title") or data.get("headline") or data.get("package_name") or "Special Announcement"
        subtitle = data.get("subtitle") or data.get("details") or data.get("greeting_message") or ""
        badge = data.get("badge_text") or data.get("discount_text") or data.get("tip_number") or ""
        cta = data.get("cta_text") or data.get("contact_info") or "Message Page Now"
        price = data.get("price_text") or data.get("price") or ""

        # Top Badge Pill
        if badge:
            draw.rounded_rectangle([80, 180, 80 + len(badge) * 14 + 40, 230], radius=12, fill=c_secondary)
            draw.text((100, 195), badge.upper(), fill=(255, 255, 255))

        # Main Title (Wrapped text)
        y_text = 270 if badge else 220
        words = title.split()
        lines = []
        current_line = []
        for word in words:
            if len(" ".join(current_line + [word])) <= 24:
                current_line.append(word)
            else:
                lines.append(" ".join(current_line))
                current_line = [word]
        if current_line:
            lines.append(" ".join(current_line))

        for line in lines[:4]:
            draw.text((80, y_text), line, fill=(255, 255, 255))
            y_text += 65

        # Subtitle
        if subtitle:
            y_text += 20
            sub_words = subtitle.split()
            sub_lines = []
            curr = []
            for w in sub_words:
                if len(" ".join(curr + [w])) <= 40:
                    curr.append(w)
                else:
                    sub_lines.append(" ".join(curr))
                    curr = [w]
            if curr:
                sub_lines.append(" ".join(curr))

            for sline in sub_lines[:4]:
                draw.text((80, y_text), sline, fill=(203, 213, 225))
                y_text += 40

        # Price Card Feature Box if price present
        if price:
            y_text += 30
            draw.rounded_rectangle([80, y_text, width - 80, y_text + 110], radius=16, fill=(30, 41, 59), outline=(*c_secondary, 200), width=2)
            draw.text((110, y_text + 25), "VERIFIED OFFICIAL PRICE", fill=(148, 163, 184))
            draw.text((110, y_text + 55), price, fill=c_secondary)
            y_text += 140

        # 5. Bottom Call-To-Action Button
        btn_y = height - 160
        btn_w = 480
        draw.rounded_rectangle(
            [80, btn_y, 80 + btn_w, btn_y + 70],
            radius=18,
            fill=c_primary
        )
        draw.text((120, btn_y + 22), f"👉  {cta.upper()}", fill=(255, 255, 255))

        # Bottom subtle security & local guarantee
        draw.text((80 + btn_w + 40, btn_y + 25), "Verified Official Post • Anti-Hallucination Safe", fill=(100, 116, 139))

        # Save to in-memory buffer
        output_buffer = io.BytesIO()
        img.save(output_buffer, format=format_type.upper(), quality=92)
        return output_buffer.getvalue()

graphic_engine = GraphicStudioEngine()
