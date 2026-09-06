"""Unit tests for SimPy Microscopic Railway Simulator."""
import pytest
from src.models.data_generator import (
    generate_corridor_stations,
    generate_block_sections,
    generate_train_schedule,
)
from src.models.schemas import BlockAssignment
from src.simulation.railway_sim import RailwayCorridorSimulator


def test_simulation_runs_cleanly():
    stations = generate_corridor_stations()
    sections = generate_block_sections(stations)
    trains = generate_train_schedule()[:10]  # First 10 trains
    
    # Simple block
    test_block = BlockAssignment(
        block_id="TEST_BLK_01",
        block_section_id="BLK_KRJ_DAR_DN",
        line_id="DN",
        start_time_mins=100,
        end_time_mins=180,
        duration_mins=80,
        is_shadow_block=False,
        status="EXECUTED",
    )
    
    sim = RailwayCorridorSimulator(
        sections=sections,
        trains=trains,
        blocks=[test_block],
    )
    
    res = sim.run_simulation(until_mins=600)
    assert res["total_trains_simulated"] > 0
    assert "total_delay_minutes" in res
