def test_make_user_defaults_to_user_role(make_user):
    user = make_user()
    assert user.role == "user"


def test_make_user_can_be_created_as_admin(make_user):
    admin = make_user(email="admin@example.com", role="admin")
    assert admin.role == "admin"


def test_app_setting_helpers_roundtrip(db):
    from app.models.models import get_active_model, set_active_model

    assert get_active_model(db, default="openai/gpt-4o-mini") == "openai/gpt-4o-mini"

    set_active_model(db, "anthropic/claude-3-haiku")
    assert get_active_model(db, default="openai/gpt-4o-mini") == "anthropic/claude-3-haiku"
