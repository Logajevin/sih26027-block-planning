"""Unit tests for Google OR-Tools CP-SAT Block Planning Solver."""
import pytest
from src.models.data_generator import (
    generate_corridor_stations,
    generate_block_sections,
    generate_train_schedule,
    generate_maintenance_jobs,
    generate_resources,
)
from src.optimizer.shadow_bundler import cluster_shadow_blocks
from src.optimizer.cp_sat_engine import BlockPlanningCPSATSolver


def test_cp_sat_solver_execution():
    stations = generate_corridor_stations()
    sections = generate_block_sections(stations)
    trains = generate_train_schedule()
    jobs = generate_maintenance_jobs()
    resources = generate_resources()
    
    bundles = cluster_shadow_blocks(jobs)
    
    solver = BlockPlanningCPSATSolver(
        sections=sections,
        trains=trains,
        bundles=bundles,
        resources=resources,
        time_limit_seconds=10.0,
    )
    
    result = solver.solve()
    
    assert result is not None
    assert len(result.assignments) > 0, "Expected at least one scheduled maintenance block"
    assert result.execution_time_seconds <= 15.0, "Solver exceeded time limit"
    assert result.net_asset_availability_pct >= 70.0, "Availability index should be > 70%"
    
    # Verify no block has zero duration
    for b in result.assignments:
        assert b.duration_mins > 0
        assert b.end_time_mins > b.start_time_mins
