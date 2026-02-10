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
    try:
        execute("SELECT 1")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Connection Error: {str(e)}")

    # 2. Storage Check (Write to /tmp)
    try:
        test_file = "/tmp/health_check_storage"
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage Mount Error: {str(e)}")

    return {"status": "ok", "db": "connected", "storage": "mounted"}

