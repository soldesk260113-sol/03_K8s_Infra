from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/healthz/global-status")
def global_status():
    from fastapi import HTTPException
    from app.services.db import execute
    import os

    # 1. DB Check
    db_status = "connected"
    db_error = None
    try:
        execute("SELECT 1")
    except Exception as e:
        db_status = "disconnected"
        db_error = str(e)
        # Don't raise 500, just report status


    # 2. Storage Check (Write to /tmp)
    try:
        test_file = "/tmp/health_check_storage"
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage Mount Error: {str(e)}")

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "db": db_status,
        "db_error": db_error,
        "storage": "mounted"
    }

