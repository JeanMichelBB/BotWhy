# app/api/endpoints/admin.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies import require_admin
from app.models.models import User, CreditTransaction
from app.api.endpoints.user import _soft_delete_user, _admin_reactivate_user

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


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter_by(user_id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    recent_transactions = (
        db.query(CreditTransaction)
        .filter_by(user_id=user_id)
        .order_by(CreditTransaction.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "user_id": user.user_id,
        "email": user.email,
        "given_name": user.given_name,
        "role": user.role,
        "credit_balance_cents": user.credit_balance_cents,
        "message_count": user.message_count,
        "trending_conversation_count": user.trending_conversation_count,
        "is_deleted": user.is_deleted,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "recent_transactions": [
            {
                "id": t.id,
                "amount_cents": t.amount_cents,
                "type": t.type,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in recent_transactions
        ],
    }


@router.post("/users/{user_id}/credit-adjustment")
def adjust_user_credit(
    user_id: str,
    amount_cents: float,
    reason: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter_by(user_id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not reason.strip():
        raise HTTPException(status_code=400, detail="Reason is required")

    user.credit_balance_cents += amount_cents
    txn = CreditTransaction(
        user_id=user_id,
        amount_cents=amount_cents,
        type="admin_adjustment",
        description=reason,
    )
    db.add(txn)
    db.commit()
    db.refresh(user)
    return {"balance_cents": user.credit_balance_cents}


@router.post("/users/{user_id}/soft-delete")
def admin_soft_delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter_by(user_id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    _soft_delete_user(db, user)
    return {"message": "User soft-deleted"}


@router.post("/users/{user_id}/reactivate")
def admin_reactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter_by(user_id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    _admin_reactivate_user(db, user)
    return {"message": "User reactivated"}


@router.post("/users/{user_id}/role")
def change_user_role(
    user_id: str,
    role: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="role must be 'user' or 'admin'")
    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    user = db.query(User).filter_by(user_id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = role
    db.commit()
    return {"user_id": user.user_id, "role": user.role}
