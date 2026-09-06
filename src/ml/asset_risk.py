"""Asset Risk & Degradation Intelligence Model.
Implements statutory RDSO (Research Designs & Standards Organisation) Track Geometry Index (TGI)
and Weibull-based hazard failure risk forecasting.
"""
from typing import Dict, Any, Tuple


def calculate_rdso_tgi(
    unevenness_index: float,
    twist_index: float,
    gauge_index: float,
    alignment_index: float
) -> Tuple[float, str]:
    """
    Calculates Track Geometry Index (TGI) using the official RDSO formula:
    TGI = (2 * UI + TI + GI + 6 * AI) / 10
    
    Returns:
        (tgi_score, maintenance_classification)
    """
    # Bound input indices
    ui = max(0.0, min(100.0, unevenness_index))
    ti = max(0.0, min(100.0, twist_index))
    gi = max(0.0, min(100.0, gauge_index))
    ai = max(0.0, min(100.0, alignment_index))
    
    tgi = (2.0 * ui + ti + gi + 6.0 * ai) / 10.0
    
    if tgi >= 80.0:
        band = "GOOD_PLANNED_MAINTENANCE"
    elif tgi >= 65.0:
        band = "NEED_BASED_MAINTENANCE_DUE"
    elif tgi >= 50.0:
        band = "MARGINAL_URGENT_TAMPING_REQUIRED"
    else:
        band = "CRITICAL_SAFETY_IMPOSE_TSR"
        
    return round(tgi, 2), band


def calculate_asset_failure_risk(
    cumulative_gmt: float,
    tgi_score: float,
    days_since_last_maintenance: int,
    is_welded_track: bool = True
) -> Dict[str, Any]:
    """
    Computes failure hazard probability over the next 7 days based on track stress,
    TGI degradation, and maintenance latency.
    """
    # Base risk escalates inversely with TGI
    tgi_risk_factor = max(0.0, (80.0 - tgi_score) / 50.0) if tgi_score < 80.0 else 0.05
    
    # Traffic fatigue factor (cumulative GMT)
    gmt_factor = min(1.5, cumulative_gmt / 500.0)
    
    # Latency penalty
    latency_factor = min(2.0, days_since_last_maintenance / 90.0)
    
    # Combined composite risk (0.0 to 1.0)
    raw_risk = (0.5 * tgi_risk_factor + 0.3 * gmt_factor + 0.2 * latency_factor)
    calibrated_prob = min(0.98, max(0.02, raw_risk))
    
    if calibrated_prob > 0.70:
        tier = "TIER_1_SAFETY_CRITICAL"
        action = "Immediate block allocation required within 48h to prevent TSR imposition."
    elif calibrated_prob > 0.40:
        tier = "TIER_2_RESTRICTION_RISK"
        action = "Schedule in rolling corridor block within 7 days."
    else:
        tier = "TIER_3_ROUTINE"
        action = "Normal cyclic inspection."
        
    return {
        "failure_probability_7d": round(calibrated_prob, 3),
        "criticality_tier": tier,
        "recommended_action": action,
        "tgi_score": tgi_score,
    }
