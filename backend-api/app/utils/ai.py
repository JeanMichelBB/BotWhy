import os
import math
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")


def cost_to_cents(cost_usd: float) -> int:
    # Use epsilon to avoid banker's rounding on exact 0.5 cases (e.g. 0.005 * 100 = 0.5)
    return int(round(cost_usd * 100 + 1e-9))


def call_openrouter(messages: list) -> tuple[str, int]:
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
    )
    content = response.choices[0].message.content
    cost_cents = cost_to_cents(getattr(response.usage, "cost", 0.0) or 0.0)
    return content, cost_cents
