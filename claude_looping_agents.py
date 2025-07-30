"""
Claude Looping Agents Import Helper

This file enables looping agents in this project directory.
Generated automatically - do not edit manually.
"""

import sys
from pathlib import Path

# Add global looping agents to Python path
global_agents_path = Path.home() / ".claude-looping-agents"
if str(global_agents_path) not in sys.path:
    sys.path.insert(0, str(global_agents_path))

# Import main components
try:
    from primary_agent_loop_integration import LoopingAgentOrchestrator
    from loop_safeguards import LoopSafeguards, LoopState, LoopStatus
    from work_validator import get_agent_config as get_work_validator_config
    from issue_detector import get_agent_config as get_issue_detector_config
    
    print("✅ Claude Looping Agents loaded successfully")
    
    # Convenience function for this project
    def start_looping_system(task_description, context=None):
        """Start the continuous improvement loop"""
        if context is None:
            context = {"project_path": "/Users/bossio/6fb-booking"}
        
        orchestrator = LoopingAgentOrchestrator()
        return orchestrator.start_continuous_improvement(task_description, context)
    
except ImportError as e:
    print(f"❌ Failed to load looping agents: {e}")
    print(f"   Check that global agents exist at: {global_agents_path}")
