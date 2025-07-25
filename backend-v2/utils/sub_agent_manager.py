"""
Sub-Agent Task Manager for Parallel Migration
Allocates non-overlapping tasks to multiple agents
"""

import json
import threading
import queue
from typing import Dict, List
from datetime import datetime
from pathlib import Path
from enum import Enum


class TaskStatus(Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"


class TaskType(Enum):
    MODEL_MIGRATION = "model_migration"
    SERVICE_MIGRATION = "service_migration"
    ENDPOINT_MIGRATION = "endpoint_migration"
    TEST_CREATION = "test_creation"
    DOCUMENTATION = "documentation"


class MigrationTask:
    """Represents a single migration task"""
    
    def __init__(self, task_id: str, feature: str, task_type: TaskType, 
                 description: str, dependencies: List[str] = None,
                 affected_files: List[str] = None):
        self.id = task_id
        self.feature = feature
        self.type = task_type
        self.description = description
        self.dependencies = dependencies or []
        self.affected_files = affected_files or []
        self.status = TaskStatus.PENDING
        self.assigned_agent = None
        self.started_at = None
        self.completed_at = None
        self.result = None
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "feature": self.feature,
            "type": self.type.value,
            "description": self.description,
            "dependencies": self.dependencies,
            "affected_files": self.affected_files,
            "status": self.status.value,
            "assigned_agent": self.assigned_agent,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "result": self.result
        }


class SubAgentManager:
    """Manages task allocation for parallel migration work"""
    
    def __init__(self, max_agents: int = 3):
        self.max_agents = max_agents
        self.tasks = {}  # task_id -> MigrationTask
        self.agents = {}  # agent_id -> agent_info
        self.file_locks = {}  # file_path -> agent_id
        self.task_queue = queue.PriorityQueue()
        self.results_queue = queue.Queue()
        self.lock = threading.Lock()
        self.base_path = Path("/Users/bossio/6fb-booking/backend-v2")
        self.task_log_path = self.base_path / "migrations" / "task_logs"
        self.task_log_path.mkdir(exist_ok=True)
    
    def create_phase_tasks(self, phase: int) -> List[MigrationTask]:
        """Create tasks for all features in a phase"""
        # Load phase configuration
        config_path = self.base_path / "migrations" / "phase_config.json"
        with open(config_path, 'r') as f:
            phase_config = json.load(f)
        
        phase_features = phase_config["phases"].get(str(phase), {}).get("features", {})
        tasks = []
        
        for feature_name, feature_config in phase_features.items():
            # Create tasks for each component of the feature
            
            # Model migration tasks
            for model in feature_config.get("models", []):
                task = MigrationTask(
                    task_id=f"{feature_name}_model_{model}",
                    feature=feature_name,
                    task_type=TaskType.MODEL_MIGRATION,
                    description=f"Migrate {model} model for {feature_name}",
                    affected_files=[f"models/{model.lower()}.py"],
                    dependencies=[]
                )
                tasks.append(task)
            
            # Service migration tasks
            for service in feature_config.get("services", []):
                # Services depend on models
                model_deps = [f"{feature_name}_model_{m}" for m in feature_config.get("models", [])]
                
                task = MigrationTask(
                    task_id=f"{feature_name}_service_{service}",
                    feature=feature_name,
                    task_type=TaskType.SERVICE_MIGRATION,
                    description=f"Migrate {service} for {feature_name}",
                    affected_files=[f"services/{service.lower()}.py"],
                    dependencies=model_deps
                )
                tasks.append(task)
            
            # Endpoint migration tasks
            service_deps = [f"{feature_name}_service_{s}" for s in feature_config.get("services", [])]
            
            task = MigrationTask(
                task_id=f"{feature_name}_endpoints",
                feature=feature_name,
                task_type=TaskType.ENDPOINT_MIGRATION,
                description=f"Create API endpoints for {feature_name}",
                affected_files=[f"routers/{feature_name}.py"],
                dependencies=service_deps
            )
            tasks.append(task)
            
            # Test creation task
            task = MigrationTask(
                task_id=f"{feature_name}_tests",
                feature=feature_name,
                task_type=TaskType.TEST_CREATION,
                description=f"Create tests for {feature_name}",
                affected_files=[f"tests/test_{feature_name}.py"],
                dependencies=[f"{feature_name}_endpoints"]
            )
            tasks.append(task)
            
            # Documentation task
            task = MigrationTask(
                task_id=f"{feature_name}_docs",
                feature=feature_name,
                task_type=TaskType.DOCUMENTATION,
                description=f"Create documentation for {feature_name}",
                affected_files=[f"docs/{feature_name}.md"],
                dependencies=[f"{feature_name}_tests"]
            )
            tasks.append(task)
        
        # Register all tasks
        for task in tasks:
            self.tasks[task.id] = task
        
        return tasks
    
    def allocate_tasks(self, tasks: List[MigrationTask]) -> Dict[str, List[MigrationTask]]:
        """
        Allocate tasks to agents ensuring no conflicts
        Returns: agent_id -> list of allocated tasks
        """
        # Initialize agents
        for i in range(self.max_agents):
            agent_id = f"agent_{i+1}"
            self.agents[agent_id] = {
                "id": agent_id,
                "status": "idle",
                "current_task": None,
                "completed_tasks": [],
                "locked_files": set()
            }
        
        # Sort tasks by dependencies (topological sort)
        sorted_tasks = self._topological_sort(tasks)
        
        # Allocate tasks to agents
        allocation = {agent_id: [] for agent_id in self.agents}
        
        for task in sorted_tasks:
            # Find available agent that doesn't conflict
            assigned = False
            
            for agent_id in self.agents:
                if self._can_assign_task(agent_id, task):
                    allocation[agent_id].append(task)
                    task.assigned_agent = agent_id
                    task.status = TaskStatus.ASSIGNED
                    
                    # Lock files for this agent
                    for file_path in task.affected_files:
                        self.file_locks[file_path] = agent_id
                    
                    assigned = True
                    break
            
            if not assigned:
                # Task will be queued for later assignment
                task.status = TaskStatus.BLOCKED
        
        return allocation
    
    def _can_assign_task(self, agent_id: str, task: MigrationTask) -> bool:
        """Check if a task can be assigned to an agent without conflicts"""
        # Check file conflicts
        for file_path in task.affected_files:
            if file_path in self.file_locks and self.file_locks[file_path] != agent_id:
                return False
        
        # Check dependencies
        for dep_id in task.dependencies:
            dep_task = self.tasks.get(dep_id)
            if dep_task and dep_task.status != TaskStatus.COMPLETED:
                # Check if dependency is assigned to same agent
                if dep_task.assigned_agent != agent_id:
                    return False
        
        return True
    
    def _topological_sort(self, tasks: List[MigrationTask]) -> List[MigrationTask]:
        """Sort tasks based on dependencies"""
        # Build adjacency list
        graph = {task.id: task.dependencies for task in tasks}
        in_degree = {task.id: 0 for task in tasks}
        
        for task in tasks:
            for dep in task.dependencies:
                if dep in in_degree:
                    in_degree[dep] += 1
        
        # Find tasks with no dependencies
        queue = [task for task in tasks if in_degree[task.id] == 0]
        sorted_tasks = []
        
        while queue:
            task = queue.pop(0)
            sorted_tasks.append(task)
            
            # Reduce in-degree for dependent tasks
            for other_task in tasks:
                if task.id in other_task.dependencies:
                    in_degree[other_task.id] -= 1
                    if in_degree[other_task.id] == 0:
                        queue.append(other_task)
        
        return sorted_tasks
    
    def generate_agent_instructions(self, agent_id: str, tasks: List[MigrationTask]) -> str:
        """Generate specific instructions for an agent"""
        instructions = f"# Migration Tasks for {agent_id.upper()}\n\n"
        instructions += f"Generated at: {datetime.now().isoformat()}\n\n"
        instructions += "## Assigned Tasks\n\n"
        
        for i, task in enumerate(tasks, 1):
            instructions += f"### Task {i}: {task.description}\n"
            instructions += f"- **ID**: {task.id}\n"
            instructions += f"- **Type**: {task.type.value}\n"
            instructions += f"- **Feature**: {task.feature}\n"
            instructions += f"- **Files**: {', '.join(task.affected_files)}\n"
            
            if task.dependencies:
                instructions += f"- **Dependencies**: {', '.join(task.dependencies)}\n"
            
            instructions += "\n#### Implementation Steps:\n"
            
            if task.type == TaskType.MODEL_MIGRATION:
                instructions += self._get_model_migration_steps(task)
            elif task.type == TaskType.SERVICE_MIGRATION:
                instructions += self._get_service_migration_steps(task)
            elif task.type == TaskType.ENDPOINT_MIGRATION:
                instructions += self._get_endpoint_migration_steps(task)
            elif task.type == TaskType.TEST_CREATION:
                instructions += self._get_test_creation_steps(task)
            else:
                instructions += self._get_documentation_steps(task)
            
            instructions += "\n---\n\n"
        
        instructions += "## Coordination Rules\n\n"
        instructions += "1. **File Locking**: You have exclusive access to your assigned files\n"
        instructions += "2. **Dependencies**: Complete tasks in the order listed\n"
        instructions += "3. **Communication**: Log progress after each task completion\n"
        instructions += "4. **Testing**: Run tests after each implementation\n"
        instructions += "5. **No Scope Creep**: Only implement what's specified\n"
        
        return instructions
    
    def _get_model_migration_steps(self, task: MigrationTask) -> str:
        return """1. Copy the model from the original codebase
2. Update imports to use v2 structure
3. Simplify relationships if needed
4. Add proper type hints
5. Ensure SQLAlchemy 2.0 compatibility
6. Add model to `models/__init__.py`
7. Create or update Alembic migration
"""
    
    def _get_service_migration_steps(self, task: MigrationTask) -> str:
        return """1. Create service file in `services/` directory
2. Copy core business logic from original service
3. Update to use v2 models and dependencies
4. Implement proper error handling
5. Add logging for key operations
6. Create service interface/protocol if needed
7. Add service to dependency injection
"""
    
    def _get_endpoint_migration_steps(self, task: MigrationTask) -> str:
        return """1. Create router file in `routers/` directory
2. Define Pydantic schemas for requests/responses
3. Implement endpoint functions with proper validation
4. Add authentication/authorization decorators
5. Include proper error responses
6. Add OpenAPI documentation
7. Register router in main.py
"""
    
    def _get_test_creation_steps(self, task: MigrationTask) -> str:
        return """1. Create test file in `tests/` directory
2. Write unit tests for models
3. Write unit tests for services
4. Write integration tests for endpoints
5. Include edge cases and error scenarios
6. Ensure minimum 80% coverage
7. Add performance benchmarks
"""
    
    def _get_documentation_steps(self, task: MigrationTask) -> str:
        return """1. Create markdown file in `docs/` directory
2. Document API endpoints with examples
3. Explain business logic and rules
4. Include configuration options
5. Add troubleshooting section
6. Create sequence diagrams for complex flows
7. Update main README with links
"""
    
    def save_allocation_plan(self, allocation: Dict[str, List[MigrationTask]]):
        """Save the task allocation plan"""
        plan = {
            "generated_at": datetime.now().isoformat(),
            "agents": {}
        }
        
        for agent_id, tasks in allocation.items():
            plan["agents"][agent_id] = {
                "total_tasks": len(tasks),
                "tasks": [task.to_dict() for task in tasks]
            }
        
        plan_file = self.task_log_path / f"allocation_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(plan_file, 'w') as f:
            json.dump(plan, f, indent=2)
        
        # Also save individual agent instructions
        for agent_id, tasks in allocation.items():
            if tasks:
                instructions = self.generate_agent_instructions(agent_id, tasks)
                inst_file = self.task_log_path / f"{agent_id}_instructions.md"
                with open(inst_file, 'w') as f:
                    f.write(instructions)
    
    def get_parallel_execution_plan(self, phase: int) -> Dict:
        """Get complete parallel execution plan for a phase"""
        # Create tasks
        tasks = self.create_phase_tasks(phase)
        
        # Allocate to agents
        allocation = self.allocate_tasks(tasks)
        
        # Save the plan
        self.save_allocation_plan(allocation)
        
        # Generate summary
        summary = {
            "phase": phase,
            "total_tasks": len(tasks),
            "agents": {}
        }
        
        for agent_id, agent_tasks in allocation.items():
            summary["agents"][agent_id] = {
                "task_count": len(agent_tasks),
                "task_types": list(set(t.type.value for t in agent_tasks)),
                "features": list(set(t.feature for t in agent_tasks))
            }
        
        return summary


# Example usage
if __name__ == "__main__":
    manager = SubAgentManager(max_agents=3)
    
    # Generate execution plan for Phase 1
    plan = manager.get_parallel_execution_plan(phase=1)
    
    print("Parallel Execution Plan:")
    print(json.dumps(plan, indent=2))
    
    print(f"\nTask allocation saved to: {manager.task_log_path}")