from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.orm import Session
from db import get_db
from security import make_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SignupReq(BaseModel):
    username: str
    password: str
    email: EmailStr | None = None
    display_name: str | None = None

class LoginReq(BaseModel):
    username: str
    password: str

@router.post("/signup")
def signup(req: SignupReq, db: Session = Depends(get_db)):
    ph = pwd.hash(req.password)
    try:
        row = db.execute(text("""
            insert into app.users(username, password_hash, email, display_name)
            values (:u, :ph, :email, :dn)
            returning user_id::text, role, status
        """), {"u": req.username, "ph": ph, "email": req.email, "dn": req.display_name}).fetchone()
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="username already exists or insert failed")

    user_id, role, status = row[0], row[1], row[2]
    if status != "active":
        raise HTTPException(status_code=403, detail="user inactive")

    token = make_access_token(user_id, role)
    return {"ok": True, "user_id": user_id, "role": role, "access_token": token}

@router.post("/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    row = db.execute(text("""
        select user_id::text, password_hash, role, status
        from app.users
        where username = :u
    """), {"u": req.username}).fetchone()

    if not row:
        raise HTTPException(status_code=401, detail="invalid credentials")

    user_id, password_hash, role, status = row[0], row[1], row[2], row[3]
    if status != "active":
        raise HTTPException(status_code=403, detail="user inactive")
    if not password_hash or not pwd.verify(req.password, password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")

    db.execute(text("update app.users set updated_at = now() where user_id = :uid"), {"uid": user_id})
    db.commit()

    token = make_access_token(user_id, role)
    return {"ok": True, "user_id": user_id, "role": role, "access_token": token}

@router.get("/me")
def me(db: Session = Depends(get_db), cur=Depends(get_current_user)):
    row = db.execute(text("""
        select user_id::text, username, email, display_name, role, status, created_at, updated_at
        from app.users
        where user_id = :uid::uuid
    """), {"uid": cur["user_id"]}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="user not found")
    return {"ok": True, "user": {
        "user_id": row[0],
        "username": row[1],
        "email": row[2],
        "display_name": row[3],
        "role": row[4],
        "status": row[5],
        "created_at": row[6].isoformat(),
        "updated_at": row[7].isoformat(),
    }}

