"""Integration tests for FastAPI REST API endpoints."""
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OPERATIONAL"
    assert data["corridor"] == "Ghaziabad - Aligarh (120 km)"


def test_get_network():
    res = client.get("/api/network")
    assert res.status_code == 200
    data = res.json()
    assert len(data["stations"]) == 10
    assert len(data["block_sections"]) == 9
    assert len(data["trains"]) > 40
    assert len(data["maintenance_jobs"]) >= 6


def test_get_demands():
    res = client.get("/api/demands")
    assert res.status_code == 200
    data = res.json()
    assert "shadow_bundling_summary" in data
    assert data["shadow_bundling_summary"]["net_track_closure_mins_saved"] > 0


def test_optimize_endpoint():
    res = client.post("/api/optimize")
    assert res.status_code == 200
    data = res.json()
    assert "recommended_plan" in data
    assert "alternative_plans" in data
    assert "xai_comparison" in data
    plan_a = data["recommended_plan"]
    assert len(plan_a["assignments"]) > 0
    assert plan_a["execution_time_seconds"] <= 15.0


def test_dynamic_replan_delay():
    req_body = {
        "train_id": "12562",
        "delay_mins": 35,
    }
    res = client.post("/api/replan/delay", json=req_body)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["solve_latency_seconds"] <= 10.0


def test_emergency_fracture():
    req_body = {
        "block_section_id": "BLK_KRJ_DAR_DN",
        "location_km": 71.4,
    }
    res = client.post("/api/replan/emergency", json=req_body)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["emergency_block"]["block_id"] == "EMERGENCY_RAIL_FRACTURE_01"


def test_approve_block():
    req_body = {
        "block_id": "BLK_GRANT_BUNDLE_001",
        "officer_name": "A. K. Sharma",
        "designation": "Sr. DOM",
        "private_number": "PN-9123",
    }
    res = client.post("/api/approve-block", json=req_body)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "APPROVED"
    assert data["private_number_exchanged"] == "PN-9123"
