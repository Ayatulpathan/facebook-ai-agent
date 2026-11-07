import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMProvider(ABC):
    """Abstract provider interface for zero-cost local LLM inference."""
    
    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        json_mode: bool = False
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        pass

class OllamaProvider(LLMProvider):
    """
    Local-only Ollama LLM provider.
    Binds strictly to localhost (127.0.0.1:11434).
    Zero external API calls. Zero cloud costs.
    Memory-budgeted for Windows 8 GB RAM / 4 GB VRAM GPU.
    """

    def __init__(
        self,
        base_url: str = settings.OLLAMA_BASE_URL,
        model: str = settings.OLLAMA_DEFAULT_MODEL,
        timeout: int = settings.OLLAMA_TIMEOUT_SECONDS
    ):
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.timeout = timeout

    def health_check(self) -> Dict[str, Any]:
        """Check Ollama service connectivity and available models."""
        try:
            with httpx.Client(timeout=3.0) as client:
                res = client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name") for m in res.json().get("models", [])]
                    model_installed = any(self.model in m for m in models)
                    return {
                        "status": "online",
                        "base_url": self.base_url,
                        "current_model": self.model,
                        "available_models": models,
                        "model_ready": model_installed,
                        "zero_cost_verified": True
                    }
        except Exception as e:
            return {
                "status": "offline",
                "base_url": self.base_url,
                "current_model": self.model,
                "available_models": [],
                "model_ready": False,
                "error": "Local Ollama engine is not running on 127.0.0.1:11434. To enable local AI: install Ollama and run 'ollama run qwen2.5:1.5b'."
            }
        return {
            "status": "offline",
            "base_url": self.base_url,
            "current_model": self.model,
            "available_models": [],
            "model_ready": False,
            "error": "Unexpected Ollama status response"
        }

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        json_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Generate text locally via Ollama generate endpoint.
        Uses 2048 context window limit for minimal memory footprint.
        """
        # Strict zero-cost safeguard: verify local binding
        if "127.0.0.1" not in self.base_url and "localhost" not in self.base_url:
            raise ValueError("Zero-Cost Violation: Non-local LLM base URL rejected.")

        payload: Dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": 2048, # Memory safety cap for 8 GB RAM
                "low_vram": True # Optimizes for 4 GB VRAM GPU
            }
        }
        if system_prompt:
            payload["system"] = system_prompt
        if json_mode:
            payload["format"] = "json"

        try:
            with httpx.Client(timeout=float(self.timeout)) as client:
                res = client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    response_text = data.get("response", "").strip()
                    
                    parsed_json = None
                    if json_mode:
                        try:
                            parsed_json = json.loads(response_text)
                        except json.JSONDecodeError:
                            # Attempt extraction if model wrapped in markdown
                            if "```json" in response_text:
                                raw_json = response_text.split("```json")[1].split("```")[0].strip()
                                parsed_json = json.loads(raw_json)

                    return {
                        "text": response_text,
                        "json": parsed_json,
                        "model": self.model,
                        "prompt_tokens": data.get("prompt_eval_count", 0),
                        "output_tokens": data.get("eval_count", 0),
                        "duration_ms": int(data.get("total_duration", 0) / 1_000_000),
                        "success": True
                    }
                else:
                    return {
                        "text": "",
                        "error": f"Ollama returned HTTP {res.status_code}: {res.text}",
                        "success": False
                    }
        except httpx.ConnectError:
            return {
                "text": "",
                "error": "Ollama service unavailable. Please ensure 'ollama serve' is running locally on 127.0.0.1:11434.",
                "success": False
            }
        except httpx.TimeoutException:
            return {
                "text": "",
                "error": f"Ollama request timed out after {self.timeout}s. Consider switching to lighter model qwen2.5:0.5b.",
                "success": False
            }
        except Exception as e:
            return {
                "text": "",
                "error": f"Local AI generation error: {str(e)}",
                "success": False
            }

# Default singleton provider instance
default_provider = OllamaProvider()
