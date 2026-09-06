"""FastAPI Backend Application for SIH26027 Block Planning Engine.
Serves REST APIs for network data, CP-SAT optimization, dynamic replanning,
simulation benchmarks, and the web dashboard.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os

from ..models.data_generator import (
    generate_corridor_stations,
    generate_block_sections,
    generate_assets,
    generate_train_schedule,
    generate_maintenance_jobs,
    generate_resources,
    get_complete_network_dataset,
)
from ..models.schemas import BlockAssignment
from ..optimizer.shadow_bundler import cluster_shadow_blocks
from ..optimizer.cp_sat_engine import BlockPlanningCPSATSolver
from ..optimizer.xai_engine import generate_plan_comparison, format_operator_briefing
from ..replanner.dynamic_replanner import DynamicReplanner
from ..simulation.benchmark_runner import run_benchmark_experiment

app = FastAPI(
    title="SIH26027: AI-Powered Automatic Block Planning Engine",
    description="Ministry of Railways | Smart India Hackathon Decision Support System",
    version="1.0.0",
)

# Enable CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory operational state
stations_data = generate_corridor_stations()
sections_data = generate_block_sections(stations_data)
assets_data = generate_assets(sections_data)
trains_data = generate_train_schedule()
jobs_data = generate_maintenance_jobs()
resources_data = generate_resources()

replanner_engine = DynamicReplanner(
    sections=sections_data,
    trains=trains_data,
    jobs=jobs_data,
    resources=resources_data,
)


class DelayInjectionRequest(BaseModel):
    train_id: str
    delay_mins: int


class EmergencyFractureRequest(BaseModel):
    block_section_id: str
    location_km: float


class BlockApprovalRequest(BaseModel):
    block_id: str
    officer_name: str
    designation: str = "Sr. DOM / Operating"
    private_number: str = "PN-7842"


@app.get("/api/health")
def health_check():
    return {
        "status": "OPERATIONAL",
        "corridor": "Ghaziabad - Aligarh (120 km)",
        "stations_count": len(stations_data),
        "trains_count": len(trains_data),
        "maintenance_jobs_count": len(jobs_data),
    }


@app.get("/api/network")
def get_network():
    """Returns the complete network topology, assets, trains, and resources."""
    return get_complete_network_dataset()


@app.get("/api/demands")
def get_demands():
    """Returns maintenance requests and bundled shadow blocks."""
    bundles = cluster_shadow_blocks(jobs_data)
    return {
        "raw_jobs": [j.model_dump() for j in jobs_data],
        "bundled_demands": [b.model_dump() for b in bundles],
        "shadow_bundling_summary": {
            "total_raw_jobs": len(jobs_data),
            "bundled_groups_count": len(bundles),
            "bundled_with_shadows": sum(1 for b in bundles if len(b.shadow_jobs) > 0),
            "net_track_closure_mins_saved": sum(b.time_saved_mins for b in bundles),
        },
    }


@app.post("/api/optimize")
def run_optimization():
    """Executes CP-SAT optimizer and returns Plan A, B, C with XAI scorecards."""
    bundles = cluster_shadow_blocks(jobs_data)
    
    # 1. Plan A (Balanced AI Optimization)
    solver_a = BlockPlanningCPSATSolver(
        sections=sections_data,
        trains=trains_data,
        bundles=bundles,
        resources=resources_data,
        time_limit_seconds=12.0,
    )
    plan_a = solver_a.solve(
        weight_train_delay=1.0,
        weight_maintenance_risk=2.5,
        weight_shadow_bundling=1.8,
        plan_name="Plan A (Recommended Multi-Objective Optimization)",
    )
    
    # 2. Plan B (Daytime Priority)
    plan_b = solver_a.solve(
        weight_train_delay=0.4,
        weight_maintenance_risk=3.0,
        weight_shadow_bundling=1.0,
        plan_name="Plan B (Daytime Workforce Preference)",
    )
    
    # 3. Plan C (Continuous Block Priority)
    plan_c = solver_a.solve(
        weight_train_delay=0.2,
        weight_maintenance_risk=3.5,
        weight_shadow_bundling=0.8,
        plan_name="Plan C (Extended Continuous Window)",
    )
    
    comparison = generate_plan_comparison(plan_a, plan_b, plan_c)
    
    return {
        "recommended_plan": plan_a.model_dump(),
        "alternative_plans": [plan_b.model_dump(), plan_c.model_dump()],
        "xai_comparison": comparison,
    }


@app.post("/api/replan/delay")
def inject_train_delay(req: DelayInjectionRequest):
    """Dynamic replanning triggered by live train delay."""
    result = replanner_engine.handle_train_delay(req.train_id, req.delay_mins)
    return result


@app.post("/api/replan/emergency")
def inject_emergency(req: EmergencyFractureRequest):
    """Dynamic replanning triggered by emergency rail fracture."""
    result = replanner_engine.handle_emergency_fracture(req.block_section_id, req.location_km)
    return result


@app.get("/api/benchmark")
def get_benchmark_results():
    """Runs 3-way comparative simulation benchmark."""
    return run_benchmark_experiment()


@app.post("/api/approve-block")
def approve_block(req: BlockApprovalRequest):
    """Logs formal officer digital approval & generates Private Number."""
    return {
        "status": "APPROVED",
        "block_id": req.block_id,
        "authorized_by": req.officer_name,
        "designation": req.designation,
        "private_number_exchanged": req.private_number,
        "message": f"Block {req.block_id} formally approved. Private Number {req.private_number} issued to Station Masters and Traction Power Controller.",
    }


# Mount web front-end static files
web_dir = os.path.join(os.path.dirname(__file__), "..", "web")
if os.path.exists(web_dir):
    app.mount("/static", StaticFiles(directory=web_dir), name="static")
    js_dir = os.path.join(web_dir, "js")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")

    @app.get("/")
    def serve_frontend():
        return FileResponse(os.path.join(web_dir, "index.html"))

