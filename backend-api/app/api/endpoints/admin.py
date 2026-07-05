# app/api/endpoints/admin.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies import require_admin
from app.models.models import User

router = APIRouter()


def _paginate(query, page: int, page_size: int):
    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total, page, page_size


@router.get("/users")
def list_users(
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = db.query(User)
    if search:
        query = query.filter(User.email.ilike(f"%{search}%"))
    query = query.order_by(User.created_at.desc())
    items, total, page, page_size = _paginate(query, page, page_size)

    return {
        "items": [
            {
                "user_id": u.user_id,
                "email": u.email,
                "given_name": u.given_name,
                "role": u.role,
                "credit_balance_cents": u.credit_balance_cents,
                "message_count": u.message_count,
                "is_deleted": u.is_deleted,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
