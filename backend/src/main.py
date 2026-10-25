from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes.transactions import router as tx_router
from src.routes.forecast import router as fc_router
from src.routes.engine1_path import router as engine1_router
from src.routes.engine2_stress import router as engine2_router
from src.routes.engine3_emergency import router as engine3_router
from src.routes.engine1_dual_mode import router as engine1_dual_router
from src.routes.stress_routes import router as stress_router
from src.emergency_recovery.recovery_routes import router as recovery_router
from src.path_optimizer.optimizer_routes import router as engine1_router

app = FastAPI(title="F-02: Multi-Goal Financial Planning API", version="1.0.0")
app.include_router(engine1_router)
app.include_router(engine2_router)
app.include_router(engine3_router)
app.include_router(engine1_dual_router)
app.include_router(stress_router)
app.include_router(recovery_router)
app.include_router(engine1_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tx_router)
app.include_router(fc_router)

@app.get("/")
def root():
    return {"status": "Active", "architecture": "4 Engines + 2 ML Models operational"}