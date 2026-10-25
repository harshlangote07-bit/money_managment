from fastapi import APIRouter, HTTPException
from src.schemas.contracts import RecoveryInput, RecoveryOutput
from src.emergency_recovery.recovery_service import EmergencyRecoveryService

router = APIRouter(prefix="/api/emergency-recovery", tags=["Feature 6 - Emergency Recovery"])

@router.post("/re-optimize", response_model=RecoveryOutput)
def emergency_reoptimize_endpoint(payload: RecoveryInput):
    """
    Executes crisis simulation and returns recovery alternatives and a revised plan version.
    """
    try:
        result = EmergencyRecoveryService.generate_recovery_plan(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))