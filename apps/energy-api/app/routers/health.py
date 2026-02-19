from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
import os

router = APIRouter()

# =========================
# Dependency (예시)
# =========================
def get_db():
    # 실제 프로젝트의 DB 세션 생성 로직 사용
    # 예: SessionLocal()
    pass


# =========================
# 1️⃣ Liveness Probe
# =========================
@router.get("/health", status_code=status.HTTP_200_OK)
def health():
    """
    - 프로세스 살아있는지만 확인
    - 절대 500 반환 금지
    # """
    return {"status": "ok"}


# =========================
# 2️⃣ Global Health (Failover 기준)
# =========================
@router.get("/health/global-status")
def global_health(db: Session = Depends(get_db)):
    """
    - Route53 / 외부 모니터링 / DR 판단 기준
    - 하나라도 실패하면 HTTP 500 반환
    """

    result = {
        "status": "ok",
        "db": "connected",
        "storage": "mounted",
        "role": os.getenv("SERVICE_ROLE", "onprem"),
    }

    unhealthy = False

    # ---- DB 체크 ----
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as e:
        result["db"] = "disconnected"
        result["db_error"] = str(e)
        unhealthy = True

    # ---- 스토리지 체크 ----
    if not os.path.ismount("/data"):
        result["storage"] = "unmounted"
        unhealthy = True

    # ---- 최종 판단 ----
    if unhealthy:
        result["status"] = "fail"
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=result,
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=result,
    )
