"""Data models and Pydantic schemas for SIH26027 block planning."""
from __future__ import annotations
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class TrainCategory(str, Enum):
    PREMIUM_PASSENGER = "PREMIUM_PASSENGER"  # Vande Bharat, Rajdhani, Shatabdi
    MAIL_EXPRESS = "MAIL_EXPRESS"            # Superfast, Mail/Express
    SUBURBAN = "SUBURBAN"                    # MEMU, Local
    FREIGHT_LOADED = "FREIGHT_LOADED"        # Coal, Iron Ore, Container
    FREIGHT_EMPTY = "FREIGHT_EMPTY"          # Empty rakes


class Department(str, Enum):
    CIVIL_ENG = "CIVIL_ENG"          # Permanent Way, Track Machines, Works
    ELECTRICAL_TRD = "ELECTRICAL_TRD"  # Traction Distribution, OHE, Substations
    SIGNAL_ST = "SIGNAL_ST"          # Signalling & Telecom, Points, Interlocking


class MaintenanceType(str, Enum):
    TAMPING = "TAMPING"                      # 09-3X / CSM Plain Track Tamping
    TURNOUT_TAMPING = "TURNOUT_TAMPING"      # Unimat Point & Crossing Tamping
    BALLAST_CLEANING = "BALLAST_CLEANING"    # BCM / Deep screening
    RAIL_GRINDING = "RAIL_GRINDING"          # RGM Rail Profile Grinding
    WELD_REPAIR = "WELD_REPAIR"              # AT / Flash-Butt Weld Excision
    OHE_INSPECTION = "OHE_INSPECTION"        # Contact wire height & stagger check
    OHE_WIRING = "OHE_WIRING"                # Contact & catenary wire replacement
    POINT_OVERHAUL = "POINT_OVERHAUL"        # Point machine internal maintenance
    TRACK_CIRCUIT_CHECK = "TRACK_CIRCUIT_CHECK" # Glued joint & axle counter tune


class BlockType(str, Enum):
    TRAFFIC_ONLY = "TRAFFIC_ONLY"
    POWER_ONLY = "POWER_ONLY"
    COMBINED_TRAFFIC_POWER = "COMBINED_TRAFFIC_POWER"
    S_AND_T_DISCONNECTION = "S_AND_T_DISCONNECTION"


class Station(BaseModel):
    code: str
    name: str
    km_post: float
    has_siding: bool = False
    has_loop_line: bool = True
    loop_capacity: int = 2
    latitude: float
    longitude: float


class BlockSection(BaseModel):
    section_id: str
    station_a: str
    station_b: str
    line_id: str = "DN"  # "DN" or "UP"
    start_km: float
    end_km: float
    max_speed_kmh: int = 130
    is_power_isolated: bool = False
    is_traffic_blocked: bool = False


class Asset(BaseModel):
    asset_id: str
    block_section_id: str
    department: Department
    asset_type: str
    location_km: float
    cumulative_gmt: float = 0.0
    tgi_score: float = 85.0  # Track Geometry Index (0 - 100)
    failure_probability_7d: float = 0.05
    criticality_tier: str = "TIER_2"  # TIER_1 (Safety Critical), TIER_2 (Warning), TIER_3 (Routine)


class TrainSchedule(BaseModel):
    train_id: str
    train_number: str
    name: str
    category: TrainCategory
    priority_weight: int
    direction: str = "DN"  # "DN" (GZB -> ALJN) or "UP" (ALJN -> GZB)
    entry_station: str
    exit_station: str
    scheduled_entry_mins: int  # Minutes from 00:00 (0 to 1440)
    expected_entry_mins: int   # Factoring dynamic live delay
    running_time_mins: int     # Normal runtime across the 120km corridor
    max_speed_kmh: int = 130
    is_delayed: bool = False
    delay_minutes: int = 0


class MaintenanceJob(BaseModel):
    job_id: str
    asset_id: str
    block_section_id: str
    department: Department
    maintenance_type: MaintenanceType
    required_block_type: BlockType
    requested_duration_mins: int
    min_viable_duration_mins: int
    deadline_mins: int  # Operational deadline in minutes from 00:00
    required_machine: Optional[str] = None
    requires_power_isolation: bool = False
    requires_signal_disconnection: bool = False
    priority_score: float = 50.0  # 0 to 100
    is_scheduled: bool = False


class Resource(BaseModel):
    resource_id: str
    resource_type: str  # "TRACK_MACHINE", "TOWER_WAGON", "PWAY_GANG", "ST_MAINTAINER"
    name: str
    current_station: str
    is_available: bool = True
    speed_kmh: int = 50
    shift_start_mins: int = 0
    shift_end_mins: int = 1440


class BlockAssignment(BaseModel):
    block_id: str
    block_section_id: str
    line_id: str
    start_time_mins: int
    end_time_mins: int
    duration_mins: int
    is_shadow_block: bool = False
    bundled_job_ids: List[str] = Field(default_factory=list)
    assigned_resource_id: Optional[str] = None
    status: str = "RECOMMENDED"  # RECOMMENDED, APPROVED, EXECUTED, REJECTED
    affected_train_ids: List[str] = Field(default_factory=list)
    delay_impact_mins: int = 0
    xai_score: float = 85.0
    xai_rationale: List[str] = Field(default_factory=list)


class ScheduleResult(BaseModel):
    plan_id: str
    plan_name: str
    assignments: List[BlockAssignment]
    total_train_delay_mins: int
    total_maintenance_completed_mins: int
    shadow_blocks_count: int
    unserviced_job_ids: List[str]
    net_asset_availability_pct: float
    execution_time_seconds: float
