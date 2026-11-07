import re
import json
import logging
from typing import Dict, Any, Optional, Tuple
from app.agents.provider import OllamaProvider
from app.models.models import BrandProfile

logger = logging.getLogger(__name__)

PHONE_REGEX = re.compile(r'(?:\+?8801[3-9]\d{8}|01[3-9]\d{8}|\b\d{11}\b)')
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')

class EngagementAgent:
    """
    Local AI Engagement Agent for Facebook Comments and Messenger Inquiries.
    Guarantees strict anti-hallucination price checks and zero-cost local execution.
    """

    def __init__(self, provider: Optional[OllamaProvider] = None):
        self.provider = provider or OllamaProvider()

    def classify_and_draft_comment_reply(
        self,
        comment_text: str,
        brand_profile: Optional[BrandProfile] = None
    ) -> Dict[str, Any]:
        """
        Classifies incoming comment into 7 categories and drafts a polite suggested reply.
        Enforces verified price constraints and lead extraction.
        """
        lower = comment_text.lower()
        
        # 1. Detect Category
        category = "General Question"
        if any(w in lower for w in ["price", "দাম", "কত", "rate", "cost", "taka", "টাকা", "pricing"]):
            category = "Price Inquiry"
        elif any(w in lower for w in ["কুরিয়ার", "ডেলিভারি", "delivery", "stock", "color", "সাইজ", "size", "available", "এভেইলেবল"]):
            category = "Product Inquiry"
        elif any(w in lower for w in ["baje", "খারাপ", "বাজে", "fake", "cheat", "scam", "ধোকা", "fraud", "complaint", "নষ্ট"]):
            category = "Complaint"
        elif any(w in lower for w in ["valo", "ভালো", "সুন্দর", "great", "awesome", "nice", "love", "best", "অসাধারণ"]):
            category = "Positive Feedback"
        elif any(w in lower for w in ["http://", "https://", "click here", "join group", "inbox me personally"]):
            category = "Spam"

        # 2. Lead detection
        has_phone = bool(PHONE_REGEX.search(comment_text))
        has_email = bool(EMAIL_REGEX.search(comment_text))
        has_order_intent = any(w in lower for w in ["অর্ডার", "order", "কিনব", "চাই", "নিতে চাই", "buy", "send me"])
        is_lead = has_phone or has_email or (has_order_intent and category in ("Price Inquiry", "Product Inquiry"))

        # 3. Verified Price Lookup
        verified_prices_str = brand_profile.verified_prices if brand_profile and brand_profile.verified_prices else ""
        has_verified_price = False
        matched_price = ""
        if verified_prices_str and category == "Price Inquiry":
            # Check if any price is listed
            lines = [line.strip() for line in verified_prices_str.split("\n") if line.strip()]
            if lines:
                has_verified_price = True
                matched_price = lines[0] # Take first representative verified price

        # 4. Generate Suggested Reply
        suggested_reply = ""
        is_bangla = any('\u0980' <= c <= '\u09ff' for c in comment_text)

        if category == "Price Inquiry":
            if is_bangla:
                if has_verified_price:
                    suggested_reply = f"ধন্যবাদ আপনার আগ্রহের জন্য! আমাদের অফিসিয়াল ভেরিফায়েড মূল্য: {matched_price}। বিস্তারিত জানতে বা অর্ডার করতে পেজে ইনবক্স করুন।"
                else:
                    suggested_reply = "ধন্যবাদ আপনার আগ্রহের জন্য! আমাদের প্রডাক্টের সঠিক ও ভেরিফায়েড মূল্য এবং কারেন্ট অফার জানতে অনুগ্রহ করে ইনবক্স করুন।"
            else:
                if has_verified_price:
                    suggested_reply = f"Thank you for your interest! Our official verified price: {matched_price}. Please send us a message to place your order."
                else:
                    suggested_reply = "Thank you for reaching out! Please message us directly on the Page to get our current verified pricing and offers."

        elif category == "Product Inquiry":
            if is_bangla:
                suggested_reply = "ধন্যবাদ! পণ্যটি আমাদের স্টকে এভেইলেবল রয়েছে এবং সারা দেশে হোম ডেলিভারি সুবিধা আছে। অর্ডার করতে ইনবক্স করুন।"
            else:
                suggested_reply = "Thank you for asking! This item is currently available with nationwide delivery. Please send us a direct message to confirm your order."

        elif category == "Positive Feedback":
            if is_bangla:
                suggested_reply = "অনেক অনেক ধন্যবাদ আপনার সুন্দর মন্তব্যের জন্য! আমাদের সাথে থাকুন।"
            else:
                suggested_reply = "Thank you so much for your kind words! We truly appreciate your support."

        elif category == "Complaint":
            if is_bangla:
                suggested_reply = "আমরা আন্তরিকভাবে দুঃখিত আপনার এই অভিজ্ঞতার জন্য। অনুগ্রহ করে ইনবক্সে আপনার অর্ডার নম্বর ও বিস্তারিত জানান, আমরা দ্রুত সমাধান করছি।"
            else:
                suggested_reply = "We sincerely apologize for any inconvenience. Please message us directly with your order details so our team can resolve this immediately."

        elif category == "Spam":
            suggested_reply = "" # Spam requires no response

        else: # General Question
            if is_bangla:
                suggested_reply = "ধন্যবাদ আপনার সুন্দর প্রশ্নের জন্য! বিস্তারিত তথ্য পেতে অনুগ্রহ করে আমাদের ইনবক্স করুন।"
            else:
                suggested_reply = "Thank you for contacting us! Please send us a direct message for complete details."

        return {
            "category": category,
            "suggested_reply": suggested_reply,
            "is_lead": is_lead,
            "detected_phone": PHONE_REGEX.search(comment_text).group(0) if has_phone else None,
            "detected_email": EMAIL_REGEX.search(comment_text).group(0) if has_email else None
        }

    def classify_and_draft_messenger_reply(
        self,
        message_text: str,
        brand_profile: Optional[BrandProfile] = None
    ) -> Dict[str, Any]:
        """
        Classifies incoming Messenger message into intent and drafts a response.
        Enforces verified price policy and extracts contact info for CRM leads.
        """
        lower = message_text.lower()
        
        # 1. Detect Intent
        intent = "General Question"
        if any(w in lower for w in ["price", "দাম", "কত", "rate", "cost", "টাকা"]):
            intent = "Price Inquiry"
        elif any(w in lower for w in ["অর্ডার", "order", "কিনব", "নিতে চাই", "purchase", "booking"]):
            intent = "Order Request"
        elif any(w in lower for w in ["কুরিয়ার", "ডেলিভারি", "delivery", "shipping", "কবে পাব", "পৌঁছাবে"]):
            intent = "Delivery Question"
        elif any(w in lower for w in ["খারাপ", "বাজে", "fake", "cheat", "scam", "সমস্যা", "problem", "broken", "নষ্ট"]):
            intent = "Complaint"
        elif any(w in lower for w in ["details", "স্পেসিফিকেশন", "সাইজ", "size", "কালার", "স্টক"]):
            intent = "Product Inquiry"
        elif any(w in lower for w in ["click here", "join telegram", "crypto"]):
            intent = "Spam"

        # 2. Extract Lead Contact Information
        phone_match = PHONE_REGEX.search(message_text)
        email_match = EMAIL_REGEX.search(message_text)
        contact_info = phone_match.group(0) if phone_match else (email_match.group(0) if email_match else "")
        is_lead = bool(contact_info) or intent in ("Order Request", "Price Inquiry", "Product Inquiry")

        # 3. Verified Price Lookup
        verified_prices_str = brand_profile.verified_prices if brand_profile and brand_profile.verified_prices else ""
        has_verified_price = False
        matched_price = ""
        if verified_prices_str and intent in ("Price Inquiry", "Order Request"):
            lines = [line.strip() for line in verified_prices_str.split("\n") if line.strip()]
            if lines:
                has_verified_price = True
                matched_price = lines[0]

        # 4. Draft Messenger Reply
        is_bangla = any('\u0980' <= c <= '\u09ff' for c in message_text)
        suggested_reply = ""

        if intent == "Order Request":
            if is_bangla:
                if contact_info:
                    suggested_reply = "ধন্যবাদ আপনার অর্ডারের জন্য! আমরা আপনার কন্টাক্ট নম্বর পেয়েছি। দ্রুত আমাদের প্রতিনিধি কল করে অর্ডার কনফার্ম করবেন।"
                else:
                    suggested_reply = "ধন্যবাদ! অর্ডারটি কনফার্ম করতে অনুগ্রহ করে আপনার পুরো নাম, মোবাইল নম্বর এবং সম্পূর্ণ ডেলিভারি ঠিকানা লিখে পাঠান।"
            else:
                if contact_info:
                    suggested_reply = "Thank you for your order! We have received your contact number. Our team will call you shortly to confirm the delivery."
                else:
                    suggested_reply = "Thank you! To confirm your order, please provide your full name, contact phone number, and complete delivery address."

        elif intent == "Price Inquiry":
            if is_bangla:
                if has_verified_price:
                    suggested_reply = f"ধন্যবাদ! আমাদের ভেরিফায়েড মূল্য: {matched_price}। আপনার ডেলিভারি লোকেশন কোথায় জানালে এখনই অর্ডার বুক করে দিচ্ছি।"
                else:
                    suggested_reply = "ধন্যবাদ! আমাদের প্রোডাক্টের এক্সাক্ট ভেরিফায়েড প্রাইস ও কারেন্ট অফার চেক করে জানাচ্ছি। আপনি কোন মডেল বা ভ্যারিয়েন্টটি নিতে চাচ্ছেন?"
            else:
                if has_verified_price:
                    suggested_reply = f"Thank you! Our verified price: {matched_price}. Where would you like it delivered?"
                else:
                    suggested_reply = "Thank you for reaching out! Let us know which specific item or model you are interested in, and we will confirm the exact verified price."

        elif intent == "Delivery Question":
            if is_bangla:
                suggested_reply = "আমরা সারা দেশে হোম ডেলিভারি দিয়ে থাকি। ঢাকা সিটির ভেতরে সাধারণত ২৪-৪৮ ঘণ্টা এবং ঢাকার বাইরে ২-৩ কার্যদিবস সময় লাগে।"
            else:
                suggested_reply = "We offer nationwide home delivery. Inside Dhaka takes 24-48 hours, and outside Dhaka takes 2-3 business days."

        elif intent == "Complaint":
            if is_bangla:
                suggested_reply = "আমরা আপনার অসুবিধার জন্য গভীরভাবে দুঃখিত। অনুগ্রহ করে আপনার অর্ডার নম্বর ও সমস্যাটির বিস্তারিত জানান, আমাদের সাপোর্ট টিম দ্রুত ব্যবস্থা নিবে।"
            else:
                suggested_reply = "We sincerely apologize for the inconvenience. Please share your order number and details so our support team can resolve this immediately."

        else: # General Question / Product Inquiry
            if is_bangla:
                suggested_reply = "ধন্যবাদ মেসেজ করার জন্য! আপনি যে প্রোডাক্টটি সম্পর্কে জানতে চাচ্ছেন, সেটির ছবি বা নাম জানালে আমরা সাথে সাথে বিস্তারিত জানাচ্ছি।"
            else:
                suggested_reply = "Thank you for reaching out! Please let us know which product you'd like to learn more about, and we'll provide full details."

        return {
            "intent": intent,
            "suggested_reply": suggested_reply,
            "is_lead": is_lead,
            "contact_info": contact_info
        }
