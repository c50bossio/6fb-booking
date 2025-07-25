#!/usr/bin/env python3
"""
Sub-Agent Automation Control Interface
Provides commands to manage, configure, and monitor the sub-agent automation system
"""

import json
import argparse
import subprocess
import sys
import time
import signal
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# Configuration paths
CONFIG_PATH = '/Users/bossio/6fb-booking/.claude/sub-agent-automation.json'
METRICS_PATH = '/Users/bossio/6fb-booking/.claude/sub-agent-metrics.json'
LOG_PATH = '/Users/bossio/6fb-booking/.claude/sub-agent-automation.log'
PID_PATH = '/Users/bossio/6fb-booking/.claude/sub-agent-automation.pid'

class SubAgentController:
    def __init__(self):
        self.config_path = CONFIG_PATH
        self.metrics_path = METRICS_PATH
        self.log_path = LOG_PATH
        self.pid_path = PID_PATH
    
    def load_config(self) -> Dict:
        """Load configuration from file"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Configuration file not found: {self.config_path}")
            return {}
        except json.JSONDecodeError as e:
            print(f"Invalid JSON in configuration file: {e}")
            return {}
    
    def save_config(self, config: Dict):
        """Save configuration to file"""
        try:
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2)
            print("Configuration saved successfully")
        except Exception as e:
            print(f"Failed to save configuration: {e}")
    
    def load_metrics(self) -> Dict:
        """Load metrics from file"""
        try:
            with open(self.metrics_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
        except json.JSONDecodeError:
            return {}
    
    def is_running(self) -> bool:
        """Check if automation system is running"""
        if not os.path.exists(self.pid_path):
            return False
        
        try:
            with open(self.pid_path, 'r') as f:
                pid = int(f.read().strip())
            
            # Check if process is actually running
            os.kill(pid, 0)  # This will raise OSError if process doesn't exist
            return True
        except (OSError, ValueError, FileNotFoundError):
            # Remove stale PID file
            if os.path.exists(self.pid_path):
                os.remove(self.pid_path)
            return False
    
    def start(self):
        """Start the sub-agent automation system"""
        if self.is_running():
            print("Sub-agent automation is already running")
            return
        
        config = self.load_config()
        if not config.get('enabled', False):
            print("Sub-agent automation is disabled in configuration")
            print("Enable it with: python3 sub-agent-control.py enable")
            return
        
        print("Starting sub-agent automation system...")
        
        # Start the automation system
        automation_script = '/Users/bossio/6fb-booking/.claude/scripts/sub-agent-automation.py'
        browser_integration_script = '/Users/bossio/6fb-booking/.claude/scripts/browser-logs-integration.py'
        
        try:
            # Start main automation system
            automation_process = subprocess.Popen([
                'python3', automation_script
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Start browser logs integration
            browser_process = subprocess.Popen([
                'python3', browser_integration_script
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Save PID
            with open(self.pid_path, 'w') as f:
                f.write(str(automation_process.pid))
            
            print(f"Sub-agent automation started (PID: {automation_process.pid})")
            print(f"Browser logs integration started (PID: {browser_process.pid})")
            
        except Exception as e:
            print(f"Failed to start sub-agent automation: {e}")
    
    def stop(self):
        """Stop the sub-agent automation system"""
        if not self.is_running():
            print("Sub-agent automation is not running")
            return
        
        try:
            with open(self.pid_path, 'r') as f:
                pid = int(f.read().strip())
            
            print(f"Stopping sub-agent automation (PID: {pid})...")
            
            # Send SIGTERM
            os.kill(pid, signal.SIGTERM)
            
            # Wait for process to exit
            for _ in range(10):
                try:
                    os.kill(pid, 0)
                    time.sleep(1)
                except OSError:
                    break
            else:
                # Force kill if still running
                print("Force killing automation process...")
                os.kill(pid, signal.SIGKILL)
            
            # Remove PID file
            os.remove(self.pid_path)
            
            print("Sub-agent automation stopped")
            
        except Exception as e:
            print(f"Failed to stop sub-agent automation: {e}")
    
    def restart(self):
        """Restart the sub-agent automation system"""
        print("Restarting sub-agent automation...")
        self.stop()
        time.sleep(2)
        self.start()
    
    def status(self):
        """Show status of the automation system"""
        print("=== Sub-Agent Automation Status ===")
        
        # Check if running
        running = self.is_running()
        print(f"Status: {'RUNNING' if running else 'STOPPED'}")
        
        if running:
            try:
                with open(self.pid_path, 'r') as f:
                    pid = f.read().strip()
                print(f"PID: {pid}")
            except FileNotFoundError:
                pass
        
        # Show configuration
        config = self.load_config()
        print(f"Enabled: {config.get('enabled', False)}")
        
        # Show enabled agents
        sub_agents = config.get('sub_agents', {})
        enabled_agents = [name for name, agent in sub_agents.items() if agent.get('enabled', False)]
        print(f"Enabled Agents: {', '.join(enabled_agents) if enabled_agents else 'None'}")
        
        # Show metrics
        metrics = self.load_metrics()
        if metrics:
            print(f"Total Executions: {metrics.get('total_executions', 0)}")
            print(f"Success Rate: {metrics.get('success_rate', 0):.1f}%")
            print(f"Last Updated: {metrics.get('last_updated', 'Unknown')}")
        
        # Show recent log entries
        if os.path.exists(self.log_path):
            print("\n=== Recent Log Entries ===")
            try:
                with open(self.log_path, 'r') as f:
                    lines = f.readlines()
                    for line in lines[-5:]:  # Show last 5 lines
                        print(line.strip())
            except Exception:
                print("Unable to read log file")
    
    def enable(self):
        """Enable sub-agent automation"""
        config = self.load_config()
        config['enabled'] = True
        self.save_config(config)
        print("Sub-agent automation enabled")
    
    def disable(self):
        """Disable sub-agent automation"""
        config = self.load_config()
        config['enabled'] = False
        self.save_config(config)
        print("Sub-agent automation disabled")
        
        if self.is_running():
            print("Stopping running automation...")
            self.stop()
    
    def enable_agent(self, agent_name: str):
        """Enable a specific sub-agent"""
        config = self.load_config()
        if agent_name not in config.get('sub_agents', {}):
            print(f"Unknown agent: {agent_name}")
            return
        
        config['sub_agents'][agent_name]['enabled'] = True
        self.save_config(config)
        print(f"Agent '{agent_name}' enabled")
    
    def disable_agent(self, agent_name: str):
        """Disable a specific sub-agent"""
        config = self.load_config()
        if agent_name not in config.get('sub_agents', {}):
            print(f"Unknown agent: {agent_name}")
            return
        
        config['sub_agents'][agent_name]['enabled'] = False
        self.save_config(config)
        print(f"Agent '{agent_name}' disabled")
    
    def list_agents(self):
        """List all available sub-agents"""
        config = self.load_config()
        sub_agents = config.get('sub_agents', {})
        
        print("=== Available Sub-Agents ===")
        for name, agent in sub_agents.items():
            enabled = agent.get('enabled', False)
            description = agent.get('description', 'No description')
            status = 'ENABLED' if enabled else 'DISABLED'
            print(f"{name}: {status} - {description}")
    
    def show_config(self):
        """Show current configuration"""
        config = self.load_config()
        print("=== Current Configuration ===")
        print(json.dumps(config, indent=2))
    
    def emergency_stop(self):
        """Emergency stop - creates stop file and kills processes"""
        print("EMERGENCY STOP - Halting all sub-agent automation")
        
        # Create emergency stop file
        stop_file = Path('/Users/bossio/6fb-booking/.claude/EMERGENCY_STOP')
        stop_file.touch()
        
        # Stop running processes
        self.stop()
        
        # Kill any related processes
        try:
            subprocess.run(['pkill', '-f', 'sub-agent-automation.py'], check=False)
            subprocess.run(['pkill', '-f', 'browser-logs-integration.py'], check=False)
        except Exception:
            pass
        
        print("Emergency stop completed")
        print("Remove the file .claude/EMERGENCY_STOP to re-enable automation")
    
    def clear_emergency_stop(self):
        """Clear emergency stop condition"""
        stop_file = Path('/Users/bossio/6fb-booking/.claude/EMERGENCY_STOP')
        if stop_file.exists():
            stop_file.unlink()
            print("Emergency stop cleared")
        else:
            print("No emergency stop condition found")
    
    def show_metrics(self):
        """Show detailed metrics"""
        metrics = self.load_metrics()
        if not metrics:
            print("No metrics available")
            return
        
        print("=== Sub-Agent Automation Metrics ===")
        print(json.dumps(metrics, indent=2))

def main():
    parser = argparse.ArgumentParser(description='Sub-Agent Automation Control Interface')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Commands
    subparsers.add_parser('start', help='Start the automation system')
    subparsers.add_parser('stop', help='Stop the automation system')
    subparsers.add_parser('restart', help='Restart the automation system')
    subparsers.add_parser('status', help='Show system status')
    subparsers.add_parser('enable', help='Enable automation')
    subparsers.add_parser('disable', help='Disable automation')
    subparsers.add_parser('list-agents', help='List all available agents')
    subparsers.add_parser('show-config', help='Show current configuration')
    subparsers.add_parser('emergency-stop', help='Emergency stop all automation')
    subparsers.add_parser('clear-emergency-stop', help='Clear emergency stop')
    subparsers.add_parser('metrics', help='Show detailed metrics')
    
    # Agent-specific commands
    enable_agent_parser = subparsers.add_parser('enable-agent', help='Enable specific agent')
    enable_agent_parser.add_argument('agent_name', help='Name of agent to enable')
    
    disable_agent_parser = subparsers.add_parser('disable-agent', help='Disable specific agent')
    disable_agent_parser.add_argument('agent_name', help='Name of agent to disable')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    controller = SubAgentController()
    
    # Execute command
    if args.command == 'start':
        controller.start()
    elif args.command == 'stop':
        controller.stop()
    elif args.command == 'restart':
        controller.restart()
    elif args.command == 'status':
        controller.status()
    elif args.command == 'enable':
        controller.enable()
    elif args.command == 'disable':
        controller.disable()
    elif args.command == 'enable-agent':
        controller.enable_agent(args.agent_name)
    elif args.command == 'disable-agent':
        controller.disable_agent(args.agent_name)
    elif args.command == 'list-agents':
        controller.list_agents()
    elif args.command == 'show-config':
        controller.show_config()
    elif args.command == 'emergency-stop':
        controller.emergency_stop()
    elif args.command == 'clear-emergency-stop':
        controller.clear_emergency_stop()
    elif args.command == 'metrics':
        controller.show_metrics()

if __name__ == "__main__":
    main()