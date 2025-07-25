#!/usr/bin/env python3
"""
Sub-Agent Automation Engine for BookedBarber V2
Monitors system events and automatically triggers specialized sub-agents
"""

import json
import time
import subprocess
import logging
import threading
import queue
import os
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
import psutil
import requests
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/bossio/6fb-booking/.claude/sub-agent-automation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('sub-agent-automation')

@dataclass
class TriggerEvent:
    trigger_name: str
    agent_type: str
    error_details: str
    affected_files: List[str]
    timestamp: datetime
    priority: str
    auto_execute: bool

@dataclass
class AgentExecution:
    agent_type: str
    trigger_name: str
    start_time: datetime
    end_time: Optional[datetime]
    success: bool
    execution_id: str

class SubAgentAutomation:
    def __init__(self, config_path: str = '/Users/bossio/6fb-booking/.claude/sub-agent-automation.json'):
        self.config_path = config_path
        self.config = self._load_config()
        self.execution_history: List[AgentExecution] = []
        self.trigger_queue = queue.Queue()
        self.running = False
        self.monitor_threads = []
        
        # Rate limiting tracking
        self.hourly_executions = {}
        self.daily_executions = {}
        self.last_execution_time = {}
        
        # Safety mechanisms
        self.emergency_stop_file = Path(self.config['safety_mechanisms']['emergency_stop']['file_trigger'])
        self.concurrent_agents = 0
        
    def _load_config(self) -> Dict:
        """Load configuration from JSON file"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return {}
    
    def _save_metrics(self):
        """Save execution metrics to file"""
        metrics = {
            'total_executions': len(self.execution_history),
            'success_rate': sum(1 for e in self.execution_history if e.success) / max(len(self.execution_history), 1) * 100,
            'executions_by_agent': {},
            'executions_by_trigger': {},
            'last_updated': datetime.now().isoformat()
        }
        
        for execution in self.execution_history:
            agent_type = execution.agent_type
            trigger_name = execution.trigger_name
            
            metrics['executions_by_agent'][agent_type] = metrics['executions_by_agent'].get(agent_type, 0) + 1
            metrics['executions_by_trigger'][trigger_name] = metrics['executions_by_trigger'].get(trigger_name, 0) + 1
        
        metrics_file = '/Users/bossio/6fb-booking/.claude/sub-agent-metrics.json'
        with open(metrics_file, 'w') as f:
            json.dump(metrics, f, indent=2)
    
    def _check_emergency_stop(self) -> bool:
        """Check if emergency stop is triggered"""
        if self.emergency_stop_file.exists():
            logger.warning("Emergency stop file detected - halting all sub-agent automation")
            return True
        
        env_var = self.config['safety_mechanisms']['emergency_stop']['env_var']
        if os.getenv(env_var):
            logger.warning(f"Emergency stop environment variable {env_var} set - halting automation")
            return True
        
        return False
    
    def _check_rate_limits(self, agent_type: str) -> bool:
        """Check if rate limits allow execution"""
        now = datetime.now()
        hour_key = now.strftime('%Y-%m-%d-%H')
        day_key = now.strftime('%Y-%m-%d')
        
        # Check global hourly limit
        global_hourly = self.hourly_executions.get(hour_key, 0)
        max_hourly = self.config['safety_mechanisms']['global_rate_limit']['max_agent_executions_per_hour']
        if global_hourly >= max_hourly:
            logger.warning(f"Global hourly rate limit exceeded: {global_hourly}/{max_hourly}")
            return False
        
        # Check global daily limit
        global_daily = self.daily_executions.get(day_key, 0)
        max_daily = self.config['safety_mechanisms']['global_rate_limit']['max_agent_executions_per_day']
        if global_daily >= max_daily:
            logger.warning(f"Global daily rate limit exceeded: {global_daily}/{max_daily}")
            return False
        
        # Check concurrent agents limit
        max_concurrent = self.config['safety_mechanisms']['conflict_prevention']['max_concurrent_agents']
        if self.concurrent_agents >= max_concurrent:
            logger.warning(f"Max concurrent agents limit reached: {self.concurrent_agents}/{max_concurrent}")
            return False
        
        # Check cooldown between agents
        last_execution = self.last_execution_time.get(agent_type)
        if last_execution:
            cooldown_str = self.config['safety_mechanisms']['global_rate_limit']['cooldown_between_agents']
            cooldown_seconds = int(cooldown_str.rstrip('s'))
            if (now - last_execution).total_seconds() < cooldown_seconds:
                logger.info(f"Agent {agent_type} still in cooldown period")
                return False
        
        return True
    
    def _update_rate_limits(self, agent_type: str):
        """Update rate limiting counters"""
        now = datetime.now()
        hour_key = now.strftime('%Y-%m-%d-%H')
        day_key = now.strftime('%Y-%m-%d')
        
        self.hourly_executions[hour_key] = self.hourly_executions.get(hour_key, 0) + 1
        self.daily_executions[day_key] = self.daily_executions.get(day_key, 0) + 1
        self.last_execution_time[agent_type] = now
    
    def _execute_sub_agent(self, trigger_event: TriggerEvent) -> bool:
        """Execute a sub-agent with the given trigger event"""
        try:
            execution_id = f"{trigger_event.agent_type}_{int(time.time())}"
            start_time = datetime.now()
            
            logger.info(f"Executing {trigger_event.agent_type} agent for trigger: {trigger_event.trigger_name}")
            
            # Create the sub-agent prompt
            agent_config = self.config['sub_agents'][trigger_event.agent_type]['action']
            prompt = agent_config['prompt_template'].format(
                trigger_name=trigger_event.trigger_name,
                error_details=trigger_event.error_details,
                files_changed=', '.join(trigger_event.affected_files),
                affected_systems=trigger_event.error_details
            )
            
            # Execute the sub-agent via Claude Code Task tool
            # This would typically be done via the Claude Code API
            # For now, we'll simulate the execution
            
            success = self._simulate_agent_execution(trigger_event.agent_type, prompt)
            
            end_time = datetime.now()
            
            # Record execution
            execution = AgentExecution(
                agent_type=trigger_event.agent_type,
                trigger_name=trigger_event.trigger_name,
                start_time=start_time,
                end_time=end_time,
                success=success,
                execution_id=execution_id
            )
            
            self.execution_history.append(execution)
            self._save_metrics()
            
            if success:
                logger.info(f"Successfully executed {trigger_event.agent_type} agent")
            else:
                logger.error(f"Failed to execute {trigger_event.agent_type} agent")
            
            return success
            
        except Exception as e:
            logger.error(f"Error executing sub-agent: {e}")
            return False
        finally:
            self.concurrent_agents -= 1
    
    def _simulate_agent_execution(self, agent_type: str, prompt: str) -> bool:
        """Simulate sub-agent execution (placeholder for actual implementation)"""
        # In a real implementation, this would:
        # 1. Call the Claude Code Task tool API
        # 2. Monitor the execution
        # 3. Return success/failure
        
        logger.info(f"Simulating {agent_type} execution with prompt: {prompt[:100]}...")
        time.sleep(2)  # Simulate execution time
        return True  # Simulate success
    
    def _monitor_test_failures(self):
        """Monitor for test failures"""
        logger.info("Starting test failure monitoring")
        
        while self.running:
            try:
                # Monitor pytest and npm test outputs
                # This is a simplified implementation
                # In practice, you'd monitor log files or process outputs
                
                time.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                logger.error(f"Error in test failure monitoring: {e}")
                time.sleep(30)
    
    def _monitor_http_errors(self):
        """Monitor for HTTP errors"""
        logger.info("Starting HTTP error monitoring")
        
        while self.running:
            try:
                # Check frontend and backend health
                frontend_url = "http://localhost:3000"
                backend_url = "http://localhost:8000/api/v1/auth/test"
                
                try:
                    frontend_response = requests.get(frontend_url, timeout=5)
                    if frontend_response.status_code >= 500:
                        self._trigger_event("http_errors", "debugger", 
                                          f"Frontend returning {frontend_response.status_code}", [])
                except requests.RequestException as e:
                    self._trigger_event("http_errors", "debugger", 
                                      f"Frontend connection failed: {e}", [])
                
                try:
                    backend_response = requests.get(backend_url, timeout=5)
                    if backend_response.status_code >= 500:
                        self._trigger_event("http_errors", "debugger", 
                                          f"Backend returning {backend_response.status_code}", [])
                except requests.RequestException as e:
                    self._trigger_event("http_errors", "debugger", 
                                      f"Backend connection failed: {e}", [])
                
                time.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in HTTP error monitoring: {e}")
                time.sleep(60)
    
    def _monitor_javascript_errors(self):
        """Monitor for JavaScript errors via browser logs MCP"""
        logger.info("Starting JavaScript error monitoring")
        
        while self.running:
            try:
                # This would integrate with the browser logs MCP server
                # For now, we'll simulate error detection
                
                time.sleep(20)  # Check every 20 seconds
                
            except Exception as e:
                logger.error(f"Error in JavaScript error monitoring: {e}")
                time.sleep(60)
    
    def _trigger_event(self, trigger_name: str, agent_type: str, error_details: str, affected_files: List[str]):
        """Trigger a sub-agent event"""
        if self._check_emergency_stop():
            return
        
        if not self._check_rate_limits(agent_type):
            return
        
        # Check agent-specific cooldowns
        agent_config = self.config['sub_agents'][agent_type]
        trigger_config = None
        
        for trigger in agent_config['triggers']:
            if trigger['name'] == trigger_name:
                trigger_config = trigger
                break
        
        if not trigger_config:
            logger.warning(f"Unknown trigger: {trigger_name}")
            return
        
        # Check trigger-specific rate limits
        cooldown_minutes = trigger_config.get('cooldown_minutes', 5)
        max_per_hour = trigger_config.get('max_triggers_per_hour', 10)
        
        # TODO: Implement trigger-specific rate limiting
        
        trigger_event = TriggerEvent(
            trigger_name=trigger_name,
            agent_type=agent_type,
            error_details=error_details,
            affected_files=affected_files,
            timestamp=datetime.now(),
            priority=agent_config['action']['priority'],
            auto_execute=agent_config['action']['auto_execute']
        )
        
        if trigger_event.auto_execute:
            self.trigger_queue.put(trigger_event)
            logger.info(f"Queued automatic execution for {agent_type} agent")
        else:
            logger.info(f"Manual review required for {agent_type} agent trigger")
    
    def _process_trigger_queue(self):
        """Process the trigger queue and execute sub-agents"""
        logger.info("Starting trigger queue processor")
        
        while self.running:
            try:
                # Get trigger event from queue (with timeout)
                trigger_event = self.trigger_queue.get(timeout=1)
                
                if self._check_emergency_stop():
                    continue
                
                if not self._check_rate_limits(trigger_event.agent_type):
                    logger.warning(f"Rate limit prevents execution of {trigger_event.agent_type}")
                    continue
                
                # Update counters before execution
                self.concurrent_agents += 1
                self._update_rate_limits(trigger_event.agent_type)
                
                # Execute in a separate thread to avoid blocking
                execution_thread = threading.Thread(
                    target=self._execute_sub_agent,
                    args=(trigger_event,)
                )
                execution_thread.start()
                
                self.trigger_queue.task_done()
                
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Error processing trigger queue: {e}")
                time.sleep(5)
    
    def start(self):
        """Start the sub-agent automation system"""
        if not self.config.get('enabled', False):
            logger.info("Sub-agent automation is disabled in configuration")
            return
        
        logger.info("Starting sub-agent automation system")
        self.running = True
        
        # Start monitoring threads
        monitors = [
            ('test_failures', self._monitor_test_failures),
            ('http_errors', self._monitor_http_errors),
            ('javascript_errors', self._monitor_javascript_errors)
        ]
        
        for monitor_name, monitor_func in monitors:
            thread = threading.Thread(target=monitor_func, name=monitor_name)
            thread.daemon = True
            thread.start()
            self.monitor_threads.append(thread)
        
        # Start trigger queue processor
        processor_thread = threading.Thread(target=self._process_trigger_queue, name='trigger_processor')
        processor_thread.daemon = True
        processor_thread.start()
        self.monitor_threads.append(processor_thread)
        
        logger.info("Sub-agent automation system started successfully")
    
    def stop(self):
        """Stop the sub-agent automation system"""
        logger.info("Stopping sub-agent automation system")
        self.running = False
        
        # Wait for threads to finish
        for thread in self.monitor_threads:
            thread.join(timeout=5)
        
        logger.info("Sub-agent automation system stopped")
    
    def get_status(self) -> Dict:
        """Get current status of the automation system"""
        return {
            'running': self.running,
            'total_executions': len(self.execution_history),
            'concurrent_agents': self.concurrent_agents,
            'queue_size': self.trigger_queue.qsize(),
            'emergency_stop': self._check_emergency_stop(),
            'last_execution': self.execution_history[-1].start_time.isoformat() if self.execution_history else None
        }

def main():
    """Main entry point"""
    automation = SubAgentAutomation()
    
    try:
        automation.start()
        
        # Keep running until interrupted
        while True:
            time.sleep(60)
            status = automation.get_status()
            logger.info(f"Status: {status}")
            
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    finally:
        automation.stop()

if __name__ == "__main__":
    main()