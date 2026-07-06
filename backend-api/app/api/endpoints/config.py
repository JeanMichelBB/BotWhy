import os
import httpx
from fastapi import APIRouter

router = APIRouter()

FALLBACK_TIERS = {
    "openai/gpt-4o-mini": 1,
    "openai/gpt-4o": 2,
    "openai/gpt-4": 2,
    "anthropic/claude-3-haiku": 1,
    "anthropic/claude-3-sonnet": 2,
    "anthropic/claude-3-opus": 3,
    "anthropic/claude-3-5-sonnet": 2,
    "google/gemini-flash-1.5": 1,
    "google/gemini-pro-1.5": 2,
    "meta-llama/llama-3-8b-instruct": 1,
    "meta-llama/llama-3-70b-instruct": 1,
}

def get_model_tier(prompt_price_per_token: float) -> int:
    """Return 1 (cheap), 2 (medium), or 3 (expensive) based on prompt price per token."""
    price_per_million = prompt_price_per_token * 1_000_000
    if price_per_million < 1.0:
        return 1
    elif price_per_million < 10.0:
        return 2
    else:
        return 3

@router.get("")
def get_config():
    model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    tier = None

    try:
        api_key = os.getenv("OPENROUTER_API_KEY", "")
        response = httpx.get(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=3.0,
        )
        if response.status_code == 200:
            models = response.json().get("data", [])
            for m in models:
                if m.get("id") == model:
                    prompt_price = float(m.get("pricing", {}).get("prompt", 0) or 0)
                    tier = get_model_tier(prompt_price)
                    break
    except Exception:
        pass

    if tier is None:
        tier = FALLBACK_TIERS.get(model, 1)

    return {
        "stripe_publishable_key": os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
        "model": model,
        "model_tier": tier,
    }
