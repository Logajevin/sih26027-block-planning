"""Maintenance Activity Duration & Overrun Predictor.
Implements 80th-percentile quantile duration forecasting to prevent block bursting.
"""
from typing import Dict, Any


def predict_80th_percentile_duration(
    requested_duration_mins: int,
    maintenance_type: str,
    machine_type: str | None,
    track_curvature_degree: float = 0.0,
    is_night_shift: bool = True,
    weather_condition: str = "CLEAR"
) -> Dict[str, Any]:
    """
    Predicts the realistic 80th-percentile execution time in minutes.
    Planning on the mean (50th percentile) causes 50% of blocks to burst!
    Planning on the 80th percentile provides an operational safety buffer.
    """
    # 1. Base machine setup & unlimbering / packing overhead
    if machine_type and "CSM" in machine_type:
        overhead_mins = 25  # 15m unlimbering + 10m packing & clearance
        speed_factor = 0.95
    elif machine_type and "UNIMAT" in machine_type:
        overhead_mins = 35  # Point machines require intricate tamping setup
        speed_factor = 1.05
    elif machine_type and "TW" in machine_type:
        overhead_mins = 20  # Tower wagon ladder raising & discharge rod earthing
        speed_factor = 0.90
    else:
        overhead_mins = 15  # Manual gang setup
        speed_factor = 1.15
        
    # 2. Geometric complexity adjustment (curves require slower machine passes)
    curve_penalty = int(track_curvature_degree * 5.0)
    
    # 3. Night-shift visibility adjustment
    night_factor = 1.08 if is_night_shift else 1.00
    
    # 4. Weather adjustment
    if weather_condition == "FOG":
        weather_factor = 1.15
    elif weather_condition == "RAIN":
        weather_factor = 1.25
    else:
        weather_factor = 1.00
        
    estimated_actual_mins = int(
        (requested_duration_mins * speed_factor + overhead_mins + curve_penalty)
        * night_factor
        * weather_factor
    )
    
    # Bound within logical operational margins
    q80_duration = max(requested_duration_mins, estimated_actual_mins)
    buffer_mins = q80_duration - requested_duration_mins
    
    return {
        "nominal_requested_mins": requested_duration_mins,
        "q80_recommended_mins": q80_duration,
        "buffer_allocated_mins": buffer_mins,
        "primary_risk_factor": "Machine setup & site clearance buffer" if buffer_mins > 0 else "Optimal conditions",
    }


def estimate_overrun_risk(allocated_duration_mins: int, q80_duration_mins: int) -> float:
    """Estimates the probability (0.0 to 1.0) of bursting the block if given allocated duration."""
    if allocated_duration_mins >= q80_duration_mins:
        return 0.10  # Low risk (<10%)
    deficit = q80_duration_mins - allocated_duration_mins
    risk = 0.20 + (deficit / q80_duration_mins) * 0.70
    return round(min(0.95, risk), 2)
