from fastapi import APIRouter, HTTPException
from src.schemas.contracts import StressInput, StressOutput
from src.services.stress_engine import StressEngineService

router = APIRouter(prefix="/api/engine2", tags=["Engine 2 - Stress Test"])

@router.post("/simulate", response_model=StressOutput)
def execute_stress_test(payload: StressInput):
    """
    Simulates user-defined financial shocks against the baseline plan and returns failure boundaries.
    """
    try:
        results = StressEngineService.run_stress_simulation(payload)
        
        return StressOutput(
            engine="engine2_stress",
            scenario_id=payload.scenario_id,
            status="success",
            stress_results=results
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))