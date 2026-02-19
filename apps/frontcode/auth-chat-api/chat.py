from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from db import get_db
from security import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

ALLOWED = {"infra","weather","energy","fx","security","general"}

class AddLogReq(BaseModel):
    category: str = Field(..., max_length=20)
    question: str
    answer: str

@router.post("/logs")
def add_log(req: AddLogReq, db: Session = Depends(get_db), cur=Depends(get_current_user)):
    if req.category not in ALLOWED:
        raise HTTPException(status_code=400, detail="invalid category")

    db.execute(text("""
        insert into app.chat_logs(user_id, category, question, answer)
        values (CAST(:uid AS uuid), :cat, :q, :a)
    """), {"uid": cur["user_id"], "cat": req.category, "q": req.question, "a": req.answer})
    db.commit()
    return {"ok": True}

@router.get("/logs")
def list_logs(
    category: str = Query(..., max_length=20),
    limit: int = Query(200, ge=1, le=2000),
    db: Session = Depends(get_db),
    cur=Depends(get_current_user),
):
    if category not in ALLOWED:
        raise HTTPException(status_code=400, detail="invalid category")

    rows = db.execute(text("""
        select id, category, question, answer, created_at
        from app.chat_logs
        where user_id = CAST(:uid AS uuid) and category = :cat
        order by id desc
        limit :lim
    """), {"uid": cur["user_id"], "cat": category, "lim": limit}).fetchall()

    items = [{
        "id": r[0], "category": r[1], "question": r[2], "answer": r[3],
        "created_at": (r[4].isoformat() if r[4] else None),
    } for r in rows]
    items.reverse()
    return {"ok": True, "items": items}

