from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from src.path_optimizer.optimizer_service import PathOptimizerService

router = APIRouter(prefix="/api/path-optimizer", tags=["Path Optimizer - Engine 1"])

@router.post("/generate-paths")
def generate_paths_endpoint(payload: Dict[str, Any]):
    """
    Takes bank-extracted profile data + user inputs/goals and returns 3 strategic paths.
    """
    try:
        result = PathOptimizerService.generate_paths(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))