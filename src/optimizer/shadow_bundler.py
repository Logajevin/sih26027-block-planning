"""Cross-Departmental Shadow Block Bundling Algorithm.
Identifies and clusters co-located Civil (P-Way), Electrical (TRD), and S&T (Signals)
maintenance demands into unified integrated corridor blocks.
"""
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from ..models.schemas import MaintenanceJob, BlockType, Department


class BundledMaintenanceDemand(BaseModel):
    bundle_id: str
    block_section_id: str
    primary_job: MaintenanceJob
    shadow_jobs: List[MaintenanceJob] = Field(default_factory=list)
    all_job_ids: List[str] = Field(default_factory=list)
    combined_departments: List[str] = Field(default_factory=list)
    effective_duration_mins: int
    min_viable_duration_mins: int
    deadline_mins: int
    requires_power_isolation: bool
    requires_traffic_block: bool
    requires_signal_disconnection: bool
    combined_priority_score: float
    time_saved_mins: int  # Separate sequential time minus bundled concurrent time


def cluster_shadow_blocks(jobs: List[MaintenanceJob]) -> List[BundledMaintenanceDemand]:
    """
    Scans maintenance demands and bundles co-located jobs on identical block sections.
    """
    # Group jobs by block section
    section_groups: Dict[str, List[MaintenanceJob]] = {}
    for job in jobs:
        sec = job.block_section_id
        if sec not in section_groups:
            section_groups[sec] = []
        section_groups[sec].append(job)
        
    bundled_demands: List[BundledMaintenanceDemand] = []
    bundle_counter = 1
    
    for sec_id, group in section_groups.items():
        if len(group) == 1:
            # Standalone job
            single_job = group[0]
            bundled_demands.append(
                BundledMaintenanceDemand(
                    bundle_id=f"BUNDLE_{bundle_counter:03d}",
                    block_section_id=sec_id,
                    primary_job=single_job,
                    shadow_jobs=[],
                    all_job_ids=[single_job.job_id],
                    combined_departments=[single_job.department.value],
                    effective_duration_mins=single_job.requested_duration_mins,
                    min_viable_duration_mins=single_job.min_viable_duration_mins,
                    deadline_mins=single_job.deadline_mins,
                    requires_power_isolation=single_job.requires_power_isolation,
                    requires_traffic_block=(single_job.required_block_type != BlockType.POWER_ONLY),
                    requires_signal_disconnection=single_job.requires_signal_disconnection,
                    combined_priority_score=single_job.priority_score,
                    time_saved_mins=0,
                )
            )
            bundle_counter += 1
        else:
            # Multi-departmental co-located jobs -> BUNDLE THEM!
            # Sort by priority score descending (highest priority becomes primary)
            sorted_group = sorted(group, key=lambda j: j.priority_score, reverse=True)
            primary = sorted_group[0]
            shadows = sorted_group[1:]
            
            # The effective duration is the max of the requested durations
            max_duration = max(j.requested_duration_mins for j in sorted_group)
            max_min_duration = max(j.min_viable_duration_mins for j in sorted_group)
            min_deadline = min(j.deadline_mins for j in sorted_group)
            
            # Sum of individual separate times
            separate_sum = sum(j.requested_duration_mins for j in sorted_group)
            saved_mins = separate_sum - max_duration
            
            req_power = any(
                j.requires_power_isolation or j.required_block_type in (BlockType.POWER_ONLY, BlockType.COMBINED_TRAFFIC_POWER)
                for j in sorted_group
            )
            req_traffic = any(j.required_block_type != BlockType.POWER_ONLY for j in sorted_group)
            req_signal = any(
                j.requires_signal_disconnection or j.required_block_type == BlockType.S_AND_T_DISCONNECTION
                for j in sorted_group
            )
            
            depts = list(set(j.department.value for j in sorted_group))
            combined_prio = max(j.priority_score for j in sorted_group) + 10.0 * (len(sorted_group) - 1)
            
            bundled_demands.append(
                BundledMaintenanceDemand(
                    bundle_id=f"BUNDLE_{bundle_counter:03d}_SHADOW",
                    block_section_id=sec_id,
                    primary_job=primary,
                    shadow_jobs=shadows,
                    all_job_ids=[j.job_id for j in sorted_group],
                    combined_departments=depts,
                    effective_duration_mins=max_duration,
                    min_viable_duration_mins=max_min_duration,
                    deadline_mins=min_deadline,
                    requires_power_isolation=req_power,
                    requires_traffic_block=req_traffic,
                    requires_signal_disconnection=req_signal,
                    combined_priority_score=combined_prio,
                    time_saved_mins=saved_mins,
                )
            )
            bundle_counter += 1
            
    return bundled_demands
