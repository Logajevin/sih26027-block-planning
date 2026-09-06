"""Optimization and Decision Support Engine."""
from .shadow_bundler import cluster_shadow_blocks, BundledMaintenanceDemand
from .cp_sat_engine import BlockPlanningCPSATSolver
from .xai_engine import generate_plan_comparison, format_operator_briefing

__all__ = [
    "cluster_shadow_blocks",
    "BundledMaintenanceDemand",
    "BlockPlanningCPSATSolver",
    "generate_plan_comparison",
    "format_operator_briefing",
]
