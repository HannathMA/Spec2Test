import os
import json
import logging
from typing import Optional, Dict, Any
import httpx
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class AIProvider:
    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self.api_key = settings.AI_API_KEY or os.environ.get("OPENAI_API_KEY", "")
        self.base_url = settings.AI_BASE_URL
        self.model = settings.AI_MODEL

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.provider != "local")

    async def complete_chat(self, system_prompt: str, user_prompt: str, response_format: Optional[Dict[str, Any]] = None) -> Optional[str]:
        if not self.is_configured:
            return None

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2
        }

        if response_format:
            payload["response_format"] = response_format

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.warning(f"AI API request failed: {res.status_code} - {res.text}")
                    return None
        except Exception as e:
            logger.warning(f"Error calling AI API: {e}")
            return None

ai_provider = AIProvider()
