from fastapi import FastAPI

from app.routers.dust import router as dust_router
from app.routers.ultra_ncst import router as ultra_router
from app.routers.short_fcst import router as short_router
from app.routers.mid_land import router as mid_land_router
from app.routers.mid_temp import router as mid_temp_router

app = FastAPI(
    title="KMA Weather API",
    description="KMA Weather API Wrapper (Ultra/Short/Mid)",
    version="1.1.0",
)

@app.get("/health")
def health():
    return {"status": "ok"}

# ✅ Dust 라우터 등록 (이게 없어서 404)
app.include_router(dust_router)

app.include_router(ultra_router, prefix="/weather", tags=["ultra"])
app.include_router(short_router, prefix="/weather", tags=["short"])
app.include_router(mid_land_router, prefix="/weather", tags=["mid"])
app.include_router(mid_temp_router, prefix="/weather", tags=["mid"])

