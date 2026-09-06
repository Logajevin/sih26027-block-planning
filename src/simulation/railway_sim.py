"""Microscopic Railway Discrete-Event Digital Twin using SimPy.
Simulates train runs, block section occupancies, 4-aspect automatic signalling delays,
temporary speed restrictions (TSRs), and maintenance possessions.
"""
import simpy
from typing import List, Dict, Any, Tuple
from ..models.schemas import BlockSection, TrainSchedule, BlockAssignment


class RailwayCorridorSimulator:
    def __init__(
        self,
        sections: List[BlockSection],
        trains: List[TrainSchedule],
        blocks: List[BlockAssignment],
        tsr_speed_restrictions: Dict[str, int] | None = None,
    ):
        self.env = simpy.Environment()
        self.sections = {s.section_id: s for s in sections}
        self.section_order = [s.section_id for s in sections]
        self.trains = trains
        self.blocks = blocks
        self.tsr_speed_restrictions = tsr_speed_restrictions or {}
        
        # SimPy Resource representing physical track occupancy (capacity = 1 train per block section)
        self.track_resources: Dict[str, simpy.Resource] = {
            s.section_id: simpy.Resource(self.env, capacity=1) for s in sections
        }
        
        # Maintenance block occupancy windows: Dict[section_id, List[(start, end)]]
        self.maintenance_windows: Dict[str, List[Tuple[int, int]]] = {
            s.section_id: [] for s in sections
        }
        for b in blocks:
            if b.block_section_id in self.maintenance_windows:
                self.maintenance_windows[b.block_section_id].append(
                    (b.start_time_mins, b.end_time_mins)
                )
                
        # Metrics collection
        self.train_logs: Dict[str, Dict[str, Any]] = {}
        self.total_train_delay_mins: float = 0.0

    def _is_section_blocked_by_maintenance(self, section_id: str, current_time_mins: float) -> Tuple[bool, float]:
        """Checks if section is currently blocked. Returns (is_blocked, remaining_block_time)."""
        windows = self.maintenance_windows.get(section_id, [])
        for start, end in windows:
            if start <= current_time_mins < end:
                return True, (end - current_time_mins)
        return False, 0.0

    def train_process(self, train: TrainSchedule):
        """SimPy process modeling a single train traversing all sections from GZB to ALJN."""
        # Wait until scheduled/expected entry time
        entry_time = train.expected_entry_mins
        if entry_time > self.env.now:
            yield self.env.timeout(entry_time - self.env.now)
            
        corridor_entry_actual = self.env.now
        base_sec_time = max(4.0, train.running_time_mins / len(self.section_order))
        
        for sec_id in self.section_order:
            # 1. Check if section has an active maintenance block
            is_blocked, wait_needed = self._is_section_blocked_by_maintenance(sec_id, self.env.now)
            if is_blocked:
                # Train must wait at previous station / home signal
                yield self.env.timeout(wait_needed)
                
            # 2. Check for TSR (Temporary Speed Restriction)
            tsr_speed = self.tsr_speed_restrictions.get(sec_id, 130)
            speed_ratio = 130.0 / max(30.0, float(tsr_speed))
            effective_sec_time = base_sec_time * speed_ratio
            
            # 3. Request track section resource (Absolute/Automatic safety occupancy)
            res = self.track_resources[sec_id]
            req_start = self.env.now
            with res.request() as req:
                yield req
                # Section traversal
                yield self.env.timeout(effective_sec_time)
                
        corridor_exit_actual = self.env.now
        nominal_exit = entry_time + train.running_time_mins
        delay = max(0.0, corridor_exit_actual - nominal_exit)
        
        self.train_logs[train.train_id] = {
            "train_number": train.train_number,
            "category": train.category.value,
            "priority": train.priority_weight,
            "entry_time": corridor_entry_actual,
            "exit_time": corridor_exit_actual,
            "scheduled_exit": nominal_exit,
            "delay_mins": round(delay, 1),
        }
        self.total_train_delay_mins += delay

    def run_simulation(self, until_mins: int = 1440) -> Dict[str, Any]:
        """Executes the simulation across the 24-hour horizon."""
        for t in self.trains:
            self.env.process(self.train_process(t))
            
        self.env.run(until=until_mins)
        
        # Calculate statistics
        delayed_trains = [t for t in self.train_logs.values() if t["delay_mins"] > 5.0]
        avg_delay = (
            self.total_train_delay_mins / max(1, len(self.train_logs))
        )
        
        return {
            "total_trains_simulated": len(self.train_logs),
            "delayed_trains_count": len(delayed_trains),
            "total_delay_minutes": round(self.total_train_delay_mins, 1),
            "average_delay_minutes": round(avg_delay, 1),
            "train_logs_sample": list(self.train_logs.values())[:10],
        }
