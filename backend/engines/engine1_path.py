from ortools.linear_solver import pywraplp

def generate_path_allocations(profile: dict, goals: list) -> list:
    solver = pywraplp.Solver.CreateSolver('GLOP')
    if not solver:
        return [{"plan_name": "Fallback Balanced Plan", "status": "solver_unavailable"}]
    
    # Simple multi-goal allocation stub
    plans = [
        {"plan_name": "Balanced Plan", "feasibility": "92%"},
        {"plan_name": "Goal-First Priority", "feasibility": "85%"},
        {"plan_name": "Emergency-Fund-First", "feasibility": "98%"}
    ]
    return plans