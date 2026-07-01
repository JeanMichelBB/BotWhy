import pytest
from unittest.mock import MagicMock, patch


def make_openrouter_response(content="Answer", cost=0.0234):
    response = MagicMock()
    response.choices[0].message.content = content
    response.usage.cost = cost
    return response


def test_cost_cents_rounding():
    from app.utils.ai import cost_to_cents
    assert cost_to_cents(0.0234) == 2
    assert cost_to_cents(0.005) == 1   # rounds up, not 0
    assert cost_to_cents(0.0) == 0
    assert cost_to_cents(0.01) == 1


def test_call_openrouter_returns_content_and_cost(monkeypatch):
    from app.utils import ai as ai_module
    mock_response = make_openrouter_response(content="Hello", cost=0.01)
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    monkeypatch.setattr(ai_module, "client", mock_client)

    from app.utils.ai import call_openrouter
    content, cost_cents = call_openrouter(messages=[{"role": "user", "content": "hi"}])
    assert content == "Hello"
    assert cost_cents == 1
