"""Realistic Indian Railways Network & Timetable Synthesizer for SIH26027.
Modeled on the 120 km Ghaziabad (GZB) to Aligarh (ALJN) High-Density Double-Track Corridor.
"""
from typing import List, Dict, Any, Tuple
from .schemas import (
    Station,
    BlockSection,
    Asset,
    TrainSchedule,
    MaintenanceJob,
    Resource,
    TrainCategory,
    Department,
    MaintenanceType,
    BlockType,
)


def generate_corridor_stations() -> List[Station]:
    """Generates the 10 contiguous stations from GZB to ALJN."""
    stations_data = [
        ("GZB", "Ghaziabad Junction", 0.0, True, True, 4, 28.6692, 77.4538),
        ("MTC", "Maripat", 10.5, False, True, 2, 28.5833, 77.5167),
        ("DER", "Dadri Junction", 17.2, True, True, 3, 28.5500, 77.5500),
        ("BRKY", "Boraki", 21.8, False, True, 2, 28.5167, 77.5833),
        ("CHL", "Chola", 44.5, True, True, 2, 28.4000, 77.7167),
        ("WAIR", "Wair", 49.8, False, True, 2, 28.3667, 77.7500),
        ("KRJ", "Khurja Junction", 63.5, True, True, 4, 28.2500, 77.8500),
        ("DAR", "Danwar", 79.2, False, True, 2, 28.1167, 77.9667),
        ("SOM", "Somna", 89.8, False, True, 2, 28.0167, 78.0167),
        ("ALJN", "Aligarh Junction", 120.0, True, True, 5, 27.8974, 78.0880),
    ]
    return [
        Station(
            code=code,
            name=name,
            km_post=km,
            has_siding=siding,
            has_loop_line=loop,
            loop_capacity=cap,
            latitude=lat,
            longitude=lon,
        )
        for code, name, km, siding, loop, cap, lat, lon in stations_data
    ]


def generate_block_sections(stations: List[Station]) -> List[BlockSection]:
    """Generates contiguous block sections for Down Line (GZB -> ALJN)."""
    sections = []
    for i in range(len(stations) - 1):
        st_a = stations[i]
        st_b = stations[i + 1]
        sec_id = f"BLK_{st_a.code}_{st_b.code}_DN"
        sections.append(
            BlockSection(
                section_id=sec_id,
                station_a=st_a.code,
                station_b=st_b.code,
                line_id="DN",
                start_km=st_a.km_post,
                end_km=st_b.km_post,
                max_speed_kmh=130,
            )
        )
    return sections


def generate_assets(sections: List[BlockSection]) -> List[Asset]:
    """Generates track, OHE, and S&T physical assets along the corridor."""
    assets = []
    
    # Critical asset on Section KRJ_DAR (Khurja to Danwar)
    assets.append(
        Asset(
            asset_id="AST_TRK_KRJ_DAR_01",
            block_section_id="BLK_KRJ_DAR_DN",
            department=Department.CIVIL_ENG,
            asset_type="CWR_60KG_90UTS_RAIL",
            location_km=71.4,
            cumulative_gmt=420.5,
            tgi_score=61.2,  # Low TGI score! Needs urgent tamping
            failure_probability_7d=0.78,
            criticality_tier="TIER_1",
        )
    )
    # Co-located OHE asset on Section KRJ_DAR
    assets.append(
        Asset(
            asset_id="AST_OHE_KRJ_DAR_01",
            block_section_id="BLK_KRJ_DAR_DN",
            department=Department.ELECTRICAL_TRD,
            asset_type="OHE_CONTACT_107SQMM",
            location_km=72.0,
            cumulative_gmt=420.5,
            tgi_score=85.0,
            failure_probability_7d=0.35,
            criticality_tier="TIER_2",
        )
    )
    # Co-located S&T asset on Section KRJ_DAR
    assets.append(
        Asset(
            asset_id="AST_SIG_KRJ_DAR_01",
            block_section_id="BLK_KRJ_DAR_DN",
            department=Department.SIGNAL_ST,
            asset_type="POINT_MACHINE_143MM",
            location_km=79.2,
            cumulative_gmt=310.0,
            tgi_score=90.0,
            failure_probability_7d=0.25,
            criticality_tier="TIER_2",
        )
    )
    # Asset on Section DER_BRKY
    assets.append(
        Asset(
            asset_id="AST_TRK_DER_BRKY_01",
            block_section_id="BLK_DER_BRKY_DN",
            department=Department.CIVIL_ENG,
            asset_type="TURNOUT_1_IN_12_CMS",
            location_km=18.5,
            cumulative_gmt=510.2,
            tgi_score=64.0,
            failure_probability_7d=0.65,
            criticality_tier="TIER_1",
        )
    )
    # Asset on Section CHL_WAIR
    assets.append(
        Asset(
            asset_id="AST_OHE_CHL_WAIR_01",
            block_section_id="BLK_CHL_WAIR_DN",
            department=Department.ELECTRICAL_TRD,
            asset_type="OHE_CANTILEVER_INSULATOR",
            location_km=46.2,
            cumulative_gmt=380.0,
            tgi_score=88.0,
            failure_probability_7d=0.20,
            criticality_tier="TIER_3",
        )
    )
    # Asset on Section SOM_ALJN
    assets.append(
        Asset(
            asset_id="AST_TRK_SOM_ALJN_01",
            block_section_id="BLK_SOM_ALJN_DN",
            department=Department.CIVIL_ENG,
            asset_type="CWR_60KG_BALLAST_BED",
            location_km=104.5,
            cumulative_gmt=550.0,
            tgi_score=58.5,  # Very low TGI!
            failure_probability_7d=0.85,
            criticality_tier="TIER_1",
        )
    )
    return assets


def generate_train_schedule() -> List[TrainSchedule]:
    """Generates 60 scheduled trains traversing the corridor over 24 hours (0-1440 mins)."""
    trains: List[TrainSchedule] = []
    
    # Real Indian Railways train profiles (Down Direction: GZB -> ALJN)
    templates = [
        # (Number, Name, Category, Priority, NormalRuntimeMins)
        ("22436", "Vande Bharat Express (NDLS-BSB)", TrainCategory.PREMIUM_PASSENGER, 100, 68),
        ("12004", "Lucknow Swarna Shatabdi Express", TrainCategory.PREMIUM_PASSENGER, 95, 70),
        ("12424", "Dibrugarh Rajdhani Express", TrainCategory.PREMIUM_PASSENGER, 95, 69),
        ("12418", "Prayagraj Express", TrainCategory.MAIL_EXPRESS, 80, 80),
        ("12562", "Swatantrata Senani Express", TrainCategory.MAIL_EXPRESS, 75, 82),
        ("12420", "Gomti Express", TrainCategory.MAIL_EXPRESS, 70, 85),
        ("14218", "Unchahar Express", TrainCategory.MAIL_EXPRESS, 65, 90),
        ("04414", "GZB-ALJN MEMU Local Passenger", TrainCategory.SUBURBAN, 50, 110),
        ("04416", "DLI-ALJN Special Passenger", TrainCategory.SUBURBAN, 50, 115),
        ("FRT_BOXN_1", "Heavy Coal Loaded Freight Rake", TrainCategory.FREIGHT_LOADED, 35, 125),
        ("FRT_CONT_1", "CONCOR Container Express", TrainCategory.FREIGHT_LOADED, 40, 115),
        ("FRT_BCN_EMPTY", "Empty BCNHL Rake to Dadri", TrainCategory.FREIGHT_EMPTY, 20, 130),
    ]
    
    train_counter = 1
    # Distribute trains across the 24-hour horizon (every 20-30 mins on average)
    entry_times = [
        # Morning peak (05:00 - 11:00) -> 300 to 660 mins
        310, 335, 360, 385, 410, 430, 455, 480, 505, 530, 560, 590, 620, 650,
        # Afternoon valley (11:00 - 16:00) -> 660 to 960 mins
        685, 720, 760, 800, 840, 880, 920, 955,
        # Evening peak (16:00 - 22:00) -> 960 to 1320 mins
        980, 1005, 1025, 1045, 1070, 1095, 1120, 1145, 1170, 1195, 1220, 1250, 1280, 1310,
        # Night freight & overnight mail (22:00 - 05:00) -> 1320 to 1440 and 0 to 300 mins
        1335, 1365, 1400, 1430,
        15, 40, 70, 100, 125, 150, 180, 210, 235, 260, 285
    ]
    
    for i, entry_min in enumerate(entry_times):
        tmpl = templates[i % len(templates)]
        num, name, cat, prio, rtime = tmpl
        train_id = f"TRN_{num}_{entry_min}"
        
        trains.append(
            TrainSchedule(
                train_id=train_id,
                train_number=f"{num}-{i+1}",
                name=f"{name} #{i+1}",
                category=cat,
                priority_weight=prio,
                direction="DN",
                entry_station="GZB",
                exit_station="ALJN",
                scheduled_entry_mins=entry_min,
                expected_entry_mins=entry_min,
                running_time_mins=rtime,
                max_speed_kmh=130 if prio >= 75 else 100,
            )
        )
    return trains


def generate_maintenance_jobs() -> List[MaintenanceJob]:
    """Generates 15 maintenance demands across Civil, Electrical, and S&T."""
    jobs = [
        # Job 1: Urgent Tamping on KRJ_DAR (Civil P-Way)
        MaintenanceJob(
            job_id="JOB_PWAY_TMP_KRJ_01",
            asset_id="AST_TRK_KRJ_DAR_01",
            block_section_id="BLK_KRJ_DAR_DN",
            department=Department.CIVIL_ENG,
            maintenance_type=MaintenanceType.TAMPING,
            required_block_type=BlockType.COMBINED_TRAFFIC_POWER,
            requested_duration_mins=120,
            min_viable_duration_mins=90,
            deadline_mins=360,  # Deadline 06:00 AM
            required_machine="MCH_CSM_912",
            requires_power_isolation=True,
            requires_signal_disconnection=True,
            priority_score=92.0,
        ),
        # Job 2: Co-located OHE inspection on KRJ_DAR (Electrical TRD) -> SHADOW BLOCK CANDIDATE!
        MaintenanceJob(
            job_id="JOB_OHE_INSP_KRJ_01",
            asset_id="AST_OHE_KRJ_DAR_01",
            block_section_id="BLK_KRJ_DAR_DN",
            department=Department.ELECTRICAL_TRD,
            maintenance_type=MaintenanceType.OHE_INSPECTION,
            required_block_type=BlockType.POWER_ONLY,
            requested_duration_mins=90,
            min_viable_duration_mins=60,
            deadline_mins=420,
            required_machine="MCH_TW_08",
            requires_power_isolation=True,
            requires_signal_disconnection=False,
            priority_score=68.0,
        ),
        # Job 3: Co-located S&T point machine check at Danwar yard (S&T) -> SHADOW BLOCK CANDIDATE!
        MaintenanceJob(
            job_id="JOB_SIG_PNT_DAR_01",
            asset_id="AST_SIG_KRJ_DAR_01",
            block_section_id="BLK_KRJ_DAR_DN",
            department=Department.SIGNAL_ST,
            maintenance_type=MaintenanceType.POINT_OVERHAUL,
            required_block_type=BlockType.S_AND_T_DISCONNECTION,
            requested_duration_mins=60,
            min_viable_duration_mins=45,
            deadline_mins=480,
            required_machine=None,
            requires_power_isolation=False,
            requires_signal_disconnection=True,
            priority_score=60.0,
        ),
        # Job 4: Turnout Tamping on DER_BRKY (Civil)
        MaintenanceJob(
            job_id="JOB_PWAY_TNT_DER_01",
            asset_id="AST_TRK_DER_BRKY_01",
            block_section_id="BLK_DER_BRKY_DN",
            department=Department.CIVIL_ENG,
            maintenance_type=MaintenanceType.TURNOUT_TAMPING,
            required_block_type=BlockType.COMBINED_TRAFFIC_POWER,
            requested_duration_mins=150,
            min_viable_duration_mins=100,
            deadline_mins=720,  # 12:00 PM
            required_machine="MCH_UNIMAT_451",
            requires_power_isolation=True,
            requires_signal_disconnection=True,
            priority_score=85.0,
        ),
        # Job 5: Ballast Tamping on SOM_ALJN (Civil)
        MaintenanceJob(
            job_id="JOB_PWAY_TMP_SOM_01",
            asset_id="AST_TRK_SOM_ALJN_01",
            block_section_id="BLK_SOM_ALJN_DN",
            department=Department.CIVIL_ENG,
            maintenance_type=MaintenanceType.TAMPING,
            required_block_type=BlockType.COMBINED_TRAFFIC_POWER,
            requested_duration_mins=140,
            min_viable_duration_mins=90,
            deadline_mins=840,
            required_machine="MCH_CSM_912",
            requires_power_isolation=True,
            requires_signal_disconnection=True,
            priority_score=94.0,
        ),
        # Job 6: OHE Insulator Cleaning on CHL_WAIR (TRD)
        MaintenanceJob(
            job_id="JOB_OHE_INS_CHL_01",
            asset_id="AST_OHE_CHL_WAIR_01",
            block_section_id="BLK_CHL_WAIR_DN",
            department=Department.ELECTRICAL_TRD,
            maintenance_type=MaintenanceType.OHE_INSPECTION,
            required_block_type=BlockType.POWER_ONLY,
            requested_duration_mins=75,
            min_viable_duration_mins=50,
            deadline_mins=960,
            required_machine="MCH_TW_08",
            requires_power_isolation=True,
            requires_signal_disconnection=False,
            priority_score=55.0,
        ),
    ]
    return jobs


def generate_resources() -> List[Resource]:
    """Generates heavy machines and maintenance crews stabled along the corridor."""
    return [
        Resource(
            resource_id="MCH_CSM_912",
            resource_type="TRACK_MACHINE",
            name="09-3X Continuous Action Tamper CSM-912",
            current_station="KRJ",
            is_available=True,
            speed_kmh=50,
            shift_start_mins=0,
            shift_end_mins=1440,
        ),
        Resource(
            resource_id="MCH_UNIMAT_451",
            resource_type="TRACK_MACHINE",
            name="Unimat 08-4S Turnout Tamper 451",
            current_station="ALJN",
            is_available=True,
            speed_kmh=45,
            shift_start_mins=0,
            shift_end_mins=1440,
        ),
        Resource(
            resource_id="MCH_TW_08",
            resource_type="TOWER_WAGON",
            name="4-Wheeler OHE Tower Wagon TW-08",
            current_station="DER",
            is_available=True,
            speed_kmh=60,
            shift_start_mins=0,
            shift_end_mins=1440,
        ),
        Resource(
            resource_id="GANG_PWAY_04",
            resource_type="PWAY_GANG",
            name="Khurja P-Way Maintenance Gang No. 4",
            current_station="KRJ",
            is_available=True,
            speed_kmh=30,
            shift_start_mins=0,
            shift_end_mins=1440,
        ),
    ]


def get_complete_network_dataset() -> Dict[str, Any]:
    """Assembles and returns the complete baseline corridor dataset."""
    stations = generate_corridor_stations()
    sections = generate_block_sections(stations)
    assets = generate_assets(sections)
    trains = generate_train_schedule()
    jobs = generate_maintenance_jobs()
    resources = generate_resources()
    
    return {
        "corridor_name": "Ghaziabad (GZB) - Aligarh (ALJN) 120km Trunk Corridor",
        "stations": [s.model_dump() for s in stations],
        "block_sections": [sec.model_dump() for sec in sections],
        "assets": [a.model_dump() for a in assets],
        "trains": [t.model_dump() for t in trains],
        "maintenance_jobs": [j.model_dump() for j in jobs],
        "resources": [r.model_dump() for r in resources],
    }
