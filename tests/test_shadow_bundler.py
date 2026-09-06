"""Unit tests for Cross-Departmental Shadow Block Bundler."""
import pytest
from src.models.schemas import MaintenanceJob, Department, MaintenanceType, BlockType
from src.optimizer.shadow_bundler import cluster_shadow_blocks


def test_shadow_block_bundling():
    # Create two co-located jobs on BLK_KRJ_DAR_DN
    job_pway = MaintenanceJob(
        job_id="JOB_TEST_PWAY_01",
        asset_id="AST_TRK_01",
        block_section_id="BLK_KRJ_DAR_DN",
        department=Department.CIVIL_ENG,
        maintenance_type=MaintenanceType.TAMPING,
        required_block_type=BlockType.COMBINED_TRAFFIC_POWER,
        requested_duration_mins=120,
        min_viable_duration_mins=90,
        deadline_mins=400,
        priority_score=90.0,
    )
    job_ohe = MaintenanceJob(
        job_id="JOB_TEST_OHE_01",
        asset_id="AST_OHE_01",
        block_section_id="BLK_KRJ_DAR_DN",
        department=Department.ELECTRICAL_TRD,
        maintenance_type=MaintenanceType.OHE_INSPECTION,
        required_block_type=BlockType.POWER_ONLY,
        requested_duration_mins=90,
        min_viable_duration_mins=60,
        deadline_mins=500,
        priority_score=65.0,
    )
    # A standalone job on a different section
    job_other = MaintenanceJob(
        job_id="JOB_TEST_OTHER_01",
        asset_id="AST_TRK_02",
        block_section_id="BLK_DER_BRKY_DN",
        department=Department.CIVIL_ENG,
        maintenance_type=MaintenanceType.TAMPING,
        required_block_type=BlockType.TRAFFIC_ONLY,
        requested_duration_mins=60,
        min_viable_duration_mins=45,
        deadline_mins=600,
        priority_score=70.0,
    )
    
    bundles = cluster_shadow_blocks([job_pway, job_ohe, job_other])
    
    assert len(bundles) == 2, "Expected 2 bundles (1 merged, 1 standalone)"
    
    # Find the merged bundle
    merged = [b for b in bundles if b.block_section_id == "BLK_KRJ_DAR_DN"][0]
    assert len(merged.shadow_jobs) == 1, "Expected 1 shadow job"
    assert merged.effective_duration_mins == 120, "Effective duration should be max(120, 90)"
    assert merged.time_saved_mins == 90, "Bundling 120m + 90m saves 90 minutes of separate closure"
    assert merged.requires_power_isolation is True
    assert merged.requires_traffic_block is True
    assert set(merged.combined_departments) == {"CIVIL_ENG", "ELECTRICAL_TRD"}
