from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List

router = APIRouter(prefix="/api/engine1", tags=["Engine 1 - Path Optimizer"])

class PathSelectionRequest(BaseModel):
    selected_path_id: str
    user_id: str = "default_user"
    path_metadata: Dict[str, Any] = {}

@router.post("/select-path")
def select_optimal_path(payload: PathSelectionRequest):
    """
    Feature 4: Allows the user to select and lock in a specific candidate path 
    from Engine 1's multi-goal allocation options (e.g., Balanced vs Aggressive).
    """
    try:
        # In-memory or database state persistence for the selected plan version
        locked_plan = {
            "user_id": payload.user_id,
            "selected_path_id": payload.selected_path_id,
            "status": "locked",
            "metadata": payload.path_metadata
        }
        
        return {
            "status": "success",
            "message": f"Successfully locked plan path: {payload.selected_path_id}",
            "data": locked_plan
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))