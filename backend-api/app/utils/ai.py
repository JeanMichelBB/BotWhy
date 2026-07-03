import os
import math
from openai import OpenAI, NotFoundError, BadRequestError
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")


def cost_to_cents(cost_usd: float) -> float:
    return cost_usd * 100


def call_openrouter(messages: list, model: str | None = None) -> tuple[str, int]:
    try:
        response = client.chat.completions.create(
            model=model or MODEL,
            messages=messages,
        )
    except (NotFoundError, BadRequestError):
        raise HTTPException(status_code=400, detail=f"Model '{model or MODEL}' not available on OpenRouter.")
    content = response.choices[0].message.content
    cost_usd = (response.usage.model_extra or {}).get("cost", 0.0) or 0.0
    cost_cents = cost_to_cents(cost_usd)
    return content, cost_cents
