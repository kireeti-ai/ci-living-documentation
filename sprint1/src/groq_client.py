#!/usr/bin/env python3
"""
Groq LLM client (OpenAI-compatible API).
Provides deterministic, safe generation for documentation narratives.
"""
import os
from typing import Optional, List, Dict, Any

import requests


DEFAULT_MODEL = "llama-3.3-70b-versatile"
DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"


class GroqClient:
    def __init__(self, api_key: str, model: str = DEFAULT_MODEL, base_url: str = DEFAULT_BASE_URL):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")

    @classmethod
    def from_env(cls) -> Optional["GroqClient"]:
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            return None
        model = os.getenv("GROQ_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
        base_url = os.getenv("GROQ_BASE_URL", DEFAULT_BASE_URL).strip() or DEFAULT_BASE_URL
        return cls(api_key=api_key, model=model, base_url=base_url)

    def chat(
        self,
        system: str,
        user: str,
        temperature: float = 0.0,
        max_tokens: int = 512,
        seed: Optional[int] = None
    ) -> str:
        url = f"{self.base_url}/chat/completions"
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if seed is not None:
            payload["seed"] = seed

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        response = requests.post(url, json=payload, headers=headers, timeout=45)
        response.raise_for_status()
        data = response.json()
        choices: List[Dict[str, Any]] = data.get("choices", [])
        if not choices:
            return ""
        message = choices[0].get("message", {})
        return message.get("content", "")


def llm_available() -> bool:
    return bool(os.getenv("GROQ_API_KEY", "").strip())
