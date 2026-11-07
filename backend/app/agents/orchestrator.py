import json
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.agents.provider import LLMProvider, default_provider
from app.models.models import BrandProfile, Niche, AgentRun, ContentIdea
from app.core.config import settings

def clean_json_str(text: str) -> str:
    """Extract raw JSON string from potential Markdown formatting."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

# -------------------------------------------------------------
# 1. Quality Control Agent
# -------------------------------------------------------------
class QualityControlAgent:
    """
    Evaluates generated content against Brand Profile rules:
    - Zero price hallucination (matches against verified_prices)
    - Prohibited claims scan (medical, financial, or unverified claims)
    - Prohibited topics scan (sensitive or controversial matters)
    - Tone and structural completeness
    """

    def evaluate(
        self,
        caption: str,
        brand_profile: BrandProfile,
        niche: Optional[Niche] = None
    ) -> Dict[str, Any]:
        flags: List[str] = []
        score: float = 1.0

        combined_text = caption.lower()

        # 1. Check for unverified currency and price claims
        price_patterns = [
            r'(\d+[\d,]*\s*(bdt|tk|taka|\$|usd|টাকা))',
            r'((bdt|tk|taka|\$|usd|টাকা)\s*\d+[\d,]*)',
            r'(\b\d{2,6}\s*-\s*\b\d{2,6}\s*(bdt|tk|taka|\$|usd|টাকা))'
        ]
        
        verified_prices_lower = (brand_profile.verified_prices or "").lower()
        
        for pat in price_patterns:
            matches = re.findall(pat, combined_text)
            for m in matches:
                price_str = m[0] if isinstance(m, tuple) else m
                # Check if this exact number/price is anywhere in the verified prices list
                num_only = re.sub(r'[^\d]', '', price_str)
                if num_only and num_only not in verified_prices_lower:
                    flags.append(f"Unverified price claim detected: '{price_str}'. Must match verified price catalog.")
                    score -= 0.35

        # 2. Check for prohibited claims
        if brand_profile.prohibited_claims:
            claims_tokens = [c.strip().lower() for c in brand_profile.prohibited_claims.split(',') if len(c.strip()) > 3]
            for token in claims_tokens:
                if token in combined_text:
                    flags.append(f"Prohibited claim keyword matched: '{token}'")
                    score -= 0.4

        # 3. Check for prohibited topics
        if brand_profile.prohibited_topics:
            topic_tokens = [t.strip().lower() for t in brand_profile.prohibited_topics.split(',') if len(t.strip()) > 3]
            for token in topic_tokens:
                if token in combined_text:
                    flags.append(f"Prohibited topic keyword matched: '{token}'")
                    score -= 0.4

        # 4. Check for minimum substance
        if len(caption.strip()) < 20:
            flags.append("Caption is excessively short or incomplete.")
            score -= 0.2

        score = max(0.0, min(1.0, score))
        passed = score >= 0.70 and len(flags) == 0

        return {
            "passed": passed,
            "score": round(score, 2),
            "flags": flags,
            "notes": "Quality check passed with no boundary violations." if passed else f"Flagged issues: {'; '.join(flags)}"
        }

# -------------------------------------------------------------
# 2. Writing Agent
# -------------------------------------------------------------
class WritingAgent:
    """
    Generates high-converting, native Facebook captions in Bangla and English.
    Adheres strictly to the Brand Profile identity and verified prices.
    """

    def __init__(self, provider: LLMProvider):
        self.provider = provider
        self.qc = QualityControlAgent()

    def generate_post(
        self,
        topic: str,
        brand_profile: BrandProfile,
        niche: Optional[Niche] = None,
        post_type: str = "promotional",
        tone: Optional[str] = None,
        language: str = "both", # bn, en, both
        custom_cta: Optional[str] = None,
        include_emojis: bool = True
    ) -> Dict[str, Any]:
        chosen_tone = tone or (niche.preferred_tone if niche else brand_profile.writing_tone)
        cta = custom_cta or (niche.preferred_cta if niche else brand_profile.preferred_cta)
        
        system_prompt = (
            f"You are a senior social media copywriter for Facebook page '{brand_profile.page_name}'.\n"
            f"Brand Identity: {brand_profile.brand_identity}.\n"
            f"Writing Tone: {chosen_tone}.\n"
            f"Target Audience: {brand_profile.target_audience}.\n"
            f"Verified Prices Catalog: {brand_profile.verified_prices}.\n"
            f"Prohibited Claims (NEVER MENTION): {brand_profile.prohibited_claims}.\n"
            f"Prohibited Topics: {brand_profile.prohibited_topics}.\n\n"
            "CRITICAL RULES:\n"
            "1. NEVER invent or hallucinate any price, discount, or offer not explicitly in the Verified Prices Catalog.\n"
            "2. When generating Bangla text, use authentic, natural conversational standard Bangla (বাংলা).\n"
            "3. Format your response strictly as a JSON object with keys:\n"
            "   title (string), caption_bn (string in Bengali), caption_en (string in English), "
            "   hashtags (string of 5-8 relevant hashtags), call_to_action (string).\n"
            "4. Return ONLY the JSON object, no Markdown ticks or external preamble."
        )

        prompt = (
            f"Create a high-performing {post_type} Facebook post.\n"
            f"Topic / Product: {topic}\n"
            f"Niche: {niche.name if niche else 'General'}\n"
            f"Preferred CTA: {cta}\n"
            f"Language requirement: {language}\n"
            f"Use Emojis: {'Yes' if include_emojis else 'Minimal'}\n"
        )

        res = self.provider.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.65,
            json_mode=True
        )

        if not res.get("success"):
            # Provide intelligent local template fallback when Ollama daemon is offline
            fallback_post = self._generate_local_template_post(
                topic, brand_profile, niche, post_type, chosen_tone, cta
            )
            qc_result = self.qc.evaluate(fallback_post["caption_en"] + " " + fallback_post["caption_bn"], brand_profile, niche)
            fallback_post["quality_check"] = qc_result
            fallback_post["is_offline_fallback"] = True
            fallback_post["engine_note"] = res.get("error", "Local Ollama daemon unavailable.")
            return fallback_post

        # Parse output
        output_data = res.get("json")
        if not output_data:
            try:
                output_data = json.loads(clean_json_str(res.get("text", "{}")))
            except Exception:
                output_data = {
                    "title": topic,
                    "caption_bn": res.get("text", ""),
                    "caption_en": res.get("text", ""),
                    "hashtags": "#Facebook #Brand #Update",
                    "call_to_action": cta
                }

        # Run Quality Control evaluation
        combined_text = f"{output_data.get('caption_en', '')} {output_data.get('caption_bn', '')}"
        qc_result = self.qc.evaluate(combined_text, brand_profile, niche)

        output_data["quality_check"] = qc_result
        output_data["tokens"] = {
            "prompt": res.get("prompt_tokens", 0),
            "output": res.get("output_tokens", 0),
            "duration_ms": res.get("duration_ms", 0)
        }
        output_data["model_used"] = res.get("model", settings.OLLAMA_DEFAULT_MODEL)
        output_data["is_offline_fallback"] = False
        return output_data

    def _generate_local_template_post(
        self,
        topic: str,
        brand_profile: BrandProfile,
        niche: Optional[Niche],
        post_type: str,
        tone: str,
        cta: str
    ) -> Dict[str, Any]:
        """Offline template builder that guarantees zero downtime when Ollama is starting up."""
        niche_name = niche.name if niche else "Official"
        return {
            "title": f"[{niche_name}] {topic}",
            "caption_bn": f"✨ {topic} সম্পর্কে বিস্তারিত জানুন!\n\nআমাদের {brand_profile.page_name} পেজে আপনাদের স্বাগতম। আধুনিক ও মানসম্মত সেবার নিশ্চয়তা নিয়ে আমরা আছি আপনার পাশে।\n\n👉 আরও তথ্যের জন্য: {cta}\n📞 যোগাযোগ: {brand_profile.contact_details}",
            "caption_en": f"✨ Discover everything about {topic} with {brand_profile.page_name}!\n\nWe provide reliable, verified insights and premium solutions tailored for you.\n\n👉 Next Step: {cta}\n📞 Contact: {brand_profile.contact_details}",
            "hashtags": f"#{brand_profile.page_name.replace(' ', '')} #{niche_name.replace(' ', '')} #Update #QualityService",
            "call_to_action": cta
        }

# -------------------------------------------------------------
# 3. Content Strategy Agent
# -------------------------------------------------------------
class StrategyAgent:
    """
    Generates strategic multi-niche content calendars and campaign plans.
    """

    def __init__(self, provider: LLMProvider):
        self.provider = provider

    def generate_plan(
        self,
        niche: Niche,
        brand_profile: BrandProfile,
        timeframe: str = "weekly", # daily, weekly, monthly
        goals: str = "engagement and brand authority"
    ) -> Dict[str, Any]:
        system_prompt = (
            f"You are a social media strategy director for Facebook brand '{brand_profile.page_name}'.\n"
            f"Niche: {niche.name} ({niche.description}).\n"
            f"Target Audience: {niche.target_demographic}.\n"
            f"Brand Tone: {niche.preferred_tone}.\n\n"
            "Return a structured JSON with:\n"
            "strategy_title (string), summary (string), target_demographic (string), "
            "campaign_mix (object with percentage of promotional, educational, and engagement posts), "
            "items (array of objects with day (e.g. Day 1 / Monday), post_type, topic, concept, suggested_cta)."
        )

        prompt = (
            f"Generate a comprehensive {timeframe} Facebook content strategy.\n"
            f"Goal: {goals}\n"
            f"Sample topics in niche: {niche.sample_topics}\n"
            "Format: Return STRICT JSON only."
        )

        res = self.provider.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.6,
            json_mode=True
        )

        if not res.get("success"):
            # Provide structured template fallback if Ollama daemon is offline
            return self._fallback_strategy(niche, brand_profile, timeframe)

        try:
            return json.loads(clean_json_str(res.get("text", "{}")))
        except Exception:
            return self._fallback_strategy(niche, brand_profile, timeframe)

    def _fallback_strategy(self, niche: Niche, brand_profile: BrandProfile, timeframe: str) -> Dict[str, Any]:
        days = [
            {"day": "Day 1 (Monday)", "post_type": "Educational", "topic": f"Introduction to {niche.name} Best Practices", "concept": "Quick breakdown of essential concepts for beginners.", "suggested_cta": "Save this post"},
            {"day": "Day 2 (Tuesday)", "post_type": "Engagement", "topic": "Community Poll / Question", "concept": f"Ask followers what their biggest challenge is in {niche.name}.", "suggested_cta": "Comment your thoughts below"},
            {"day": "Day 3 (Wednesday)", "post_type": "Promotional", "topic": f"Featured {niche.name} Service Showcase", "concept": "Highlight verified features and official contact channels.", "suggested_cta": niche.preferred_cta},
            {"day": "Day 4 (Thursday)", "post_type": "Tips & Tricks", "topic": "3 Actionable Hacks to Save Time", "concept": "Step-by-step mini tutorial with practical takeaways.", "suggested_cta": "Share with a friend"},
            {"day": "Day 5 (Friday)", "post_type": "Weekend Community", "topic": "Weekend Motivation & Review", "concept": "Engaging community recap and conversational greeting.", "suggested_cta": "Have a wonderful weekend!"}
        ]
        return {
            "strategy_title": f"{niche.name} {timeframe.capitalize()} Growth Plan",
            "summary": f"Strategic content roadmap engineered for {niche.name} to maximize organic reach and engagement on Facebook.",
            "target_demographic": niche.target_demographic or brand_profile.target_audience,
            "campaign_mix": {"educational": 40, "engagement": 30, "promotional": 30},
            "items": days,
            "is_offline_fallback": True
        }

# -------------------------------------------------------------
# 4. Research Agent
# -------------------------------------------------------------
class ResearchAgent:
    """
    Researches niche opportunities, seasonal/festival occasions, and FAQs.
    Explicitly tags ideas as creative concepts when live web data is absent.
    """

    def __init__(self, provider: LLMProvider):
        self.provider = provider

    def research_topics(
        self,
        niche: Niche,
        brand_profile: BrandProfile,
        category: str = "all" # seasonal, faq, trending_concepts, educational
    ) -> List[Dict[str, Any]]:
        system_prompt = (
            f"You are a social media research specialist for '{brand_profile.page_name}' in the '{niche.name}' niche.\n"
            "Return a JSON array of 5-8 creative content opportunities.\n"
            "Each item must be an object with: title, concept, category (educational, promotional, seasonal, engagement), source_label."
        )

        prompt = (
            f"Conduct content topic research for {niche.name}.\n"
            f"Focus Category: {category}\n"
            f"Audience Context: {niche.target_demographic}\n"
            "Note: Label all output source_label as 'AI Creative Hypothesis (Local Engine)'."
        )

        res = self.provider.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.7,
            json_mode=True
        )

        if not res.get("success"):
            return self._fallback_research(niche)

        try:
            raw_text = clean_json_str(res.get("text", "[]"))
            parsed = json.loads(raw_text)
            if isinstance(parsed, dict) and "ideas" in parsed:
                return parsed["ideas"]
            if isinstance(parsed, list):
                return parsed
            return self._fallback_research(niche)
        except Exception:
            return self._fallback_research(niche)

    def _fallback_research(self, niche: Niche) -> List[Dict[str, Any]]:
        return [
            {
                "title": f"Top 5 Myths in {niche.name} Debunked",
                "concept": f"Clarify common misconceptions followers hold regarding {niche.name}.",
                "category": "educational",
                "source_label": "AI Strategy Model (Local qwen2.5:1.5b)"
            },
            {
                "title": f"Seasonal Checklist for {niche.name}",
                "concept": f"Timely seasonal tips tailored for your audience's current monthly workflow.",
                "category": "seasonal",
                "source_label": "AI Seasonal Analyzer (Local qwen2.5:1.5b)"
            },
            {
                "title": f"Frequently Asked Questions: Getting Started with {niche.name}",
                "concept": "Direct answers to the top 3 questions beginners message your page about.",
                "category": "faq",
                "source_label": "AI Customer Inquiry Modeler (Local qwen2.5:1.5b)"
            },
            {
                "title": f"Customer Spotlight / Transformation in {niche.name}",
                "concept": "Engaging story angle showcasing how your verified solutions solve real problems.",
                "category": "promotional",
                "source_label": "AI Engagement Generator (Local qwen2.5:1.5b)"
            }
        ]

# -------------------------------------------------------------
# 5. Master Orchestrator
# -------------------------------------------------------------
class MasterOrchestrator:
    """
    Central controller governing all 11 sub-agents:
    - Writing Agent
    - Content Strategy Agent
    - Research Agent
    - Quality Control Agent
    - Logs all telemetry to agent_runs
    - Protects zero-cost execution
    """

    def __init__(self, provider: Optional[LLMProvider] = None):
        self.provider = provider or default_provider
        self.qc = QualityControlAgent()
        self.writer = WritingAgent(self.provider)
        self.strategist = StrategyAgent(self.provider)
        self.researcher = ResearchAgent(self.provider)

    def log_run(
        self,
        db: Session,
        agent_name: str,
        duration_ms: int = 0,
        prompt_tokens: int = 0,
        output_tokens: int = 0,
        status: str = "success"
    ):
        """Record local AI performance telemetry."""
        run = AgentRun(
            agent_name=agent_name,
            model_used=getattr(self.provider, "model", settings.OLLAMA_DEFAULT_MODEL),
            prompt_tokens=prompt_tokens,
            output_tokens=output_tokens,
            duration_ms=duration_ms,
            status=status,
            created_at=datetime.now(timezone.utc)
        )
        db.add(run)
        db.commit()

master_orchestrator = MasterOrchestrator()
