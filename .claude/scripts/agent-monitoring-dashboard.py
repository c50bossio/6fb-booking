#!/usr/bin/env python3
"""
BookedBarber V2 Agent Monitoring Dashboard
Comprehensive monitoring and performance tracking for all deployed agents
"""

import json
import os
import time
import datetime
from pathlib import Path
from typing import Dict, List, Any
import subprocess
import sys

class AgentMonitoringDashboard:
    def __init__(self):
        self.project_root = Path("/Users/bossio/6fb-booking")
        self.claude_dir = self.project_root / ".claude"
        self.metrics_file = self.claude_dir / "sub-agent-metrics.json"
        self.config_file = self.claude_dir / "sub-agent-automation.json"
        self.log_file = self.claude_dir / "sub-agent-automation.log"
        
    def load_metrics(self) -> Dict[str, Any]:
        """Load current agent metrics"""
        try:
            if self.metrics_file.exists():
                with open(self.metrics_file, 'r') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            return {"error": str(e)}
    
    def load_config(self) -> Dict[str, Any]:
        """Load agent configuration"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            return {"error": str(e)}
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Get current agent automation system status"""
        try:
            result = subprocess.run([
                sys.executable, 
                str(self.claude_dir / "scripts" / "sub-agent-control.py"),
                "status"
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                # Parse status output
                lines = result.stdout.strip().split('\n')
                status = {}
                for line in lines:
                    if ': ' in line and not line.startswith('==='):
                        key, value = line.split(': ', 1)
                        status[key.strip()] = value.strip()
                return status
            else:
                return {"error": result.stderr}
        except Exception as e:
            return {"error": str(e)}
    
    def get_recent_logs(self, lines: int = 20) -> List[str]:
        """Get recent log entries"""
        try:
            if self.log_file.exists():
                result = subprocess.run([
                    "tail", f"-{lines}", str(self.log_file)
                ], capture_output=True, text=True)
                return result.stdout.strip().split('\n') if result.stdout else []
            return []
        except Exception:
            return []
    
    def calculate_performance_stats(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate performance statistics"""
        stats = {
            "total_executions": metrics.get("total_executions", 0),
            "success_rate": metrics.get("success_rate", 0.0),
            "active_agents": len(metrics.get("executions_by_agent", {})),
            "most_active_agent": None,
            "most_common_trigger": None,
            "executions_per_hour": 0,
            "last_updated": metrics.get("last_updated", "Never")
        }
        
        # Find most active agent
        agents = metrics.get("executions_by_agent", {})
        if agents:
            stats["most_active_agent"] = max(agents.items(), key=lambda x: x[1])
        
        # Find most common trigger
        triggers = metrics.get("executions_by_trigger", {})
        if triggers:
            stats["most_common_trigger"] = max(triggers.items(), key=lambda x: x[1])
        
        # Calculate executions per hour (rough estimate based on recent activity)
        total_executions = stats["total_executions"]
        if total_executions > 0:
            # Assume activity over last 24 hours for rate calculation
            stats["executions_per_hour"] = min(total_executions, 50)  # Cap at rate limit
        
        return stats
    
    def generate_agent_health_report(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate health report for all agents"""
        agents = config.get("sub_agents", {})
        health_report = {}
        
        for agent_name, agent_config in agents.items():
            health_report[agent_name] = {
                "enabled": agent_config.get("enabled", False),
                "trigger_count": len(agent_config.get("triggers", [])),
                "priority": agent_config.get("action", {}).get("priority", "medium"),
                "auto_execute": agent_config.get("action", {}).get("auto_execute", False),
                "description": agent_config.get("description", "No description"),
                "status": "✅ Operational" if agent_config.get("enabled", False) else "❌ Disabled"
            }
        
        return health_report
    
    def display_dashboard(self):
        """Display the complete monitoring dashboard"""
        print("=" * 80)
        print("🎯 BOOKEDBARBER V2 AGENT MONITORING DASHBOARD")
        print("=" * 80)
        print(f"📅 Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Load data
        metrics = self.load_metrics()
        config = self.load_config()
        status = self.get_agent_status()
        
        # System Status
        print("🚀 SYSTEM STATUS")
        print("-" * 40)
        if "error" in status:
            print(f"❌ Error: {status['error']}")
        else:
            for key, value in status.items():
                if key in ["Status", "Enabled", "Success Rate"]:
                    icon = "✅" if value in ["RUNNING", "True", "100.0%"] else "⚠️"
                    print(f"{icon} {key}: {value}")
        print()
        
        # Performance Statistics
        print("📊 PERFORMANCE STATISTICS")
        print("-" * 40)
        if "error" not in metrics:
            stats = self.calculate_performance_stats(metrics)
            print(f"📈 Total Executions: {stats['total_executions']}")
            print(f"✅ Success Rate: {stats['success_rate']:.1f}%")
            print(f"🤖 Active Agents: {stats['active_agents']}")
            
            if stats['most_active_agent']:
                agent, count = stats['most_active_agent']
                print(f"🏆 Most Active Agent: {agent} ({count} executions)")
            
            if stats['most_common_trigger']:
                trigger, count = stats['most_common_trigger']
                print(f"🔔 Most Common Trigger: {trigger} ({count} times)")
            
            print(f"⚡ Estimated Rate: {stats['executions_per_hour']} exec/hour")
            print(f"🕒 Last Updated: {stats['last_updated']}")
        else:
            print(f"❌ Error loading metrics: {metrics['error']}")
        print()
        
        # Agent Health Report
        print("🏥 AGENT HEALTH REPORT")
        print("-" * 40)
        if "error" not in config:
            health_report = self.generate_agent_health_report(config)
            
            for agent_name, health in health_report.items():
                status_icon = "✅" if health["enabled"] else "❌"
                priority_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(health["priority"], "⚪")
                
                print(f"{status_icon} {agent_name.upper()}")
                print(f"   {priority_icon} Priority: {health['priority']}")
                print(f"   🎯 Triggers: {health['trigger_count']}")
                print(f"   🔄 Auto-execute: {'Yes' if health['auto_execute'] else 'No'}")
                print()
        else:
            print(f"❌ Error loading config: {config['error']}")
        
        # Recent Activity
        print("📝 RECENT ACTIVITY (Last 10 entries)")
        print("-" * 40)
        recent_logs = self.get_recent_logs(10)
        if recent_logs and recent_logs[0]:
            for log_entry in recent_logs[-10:]:
                if log_entry.strip():
                    # Parse log level and add appropriate icon
                    if "ERROR" in log_entry:
                        icon = "❌"
                    elif "WARNING" in log_entry:
                        icon = "⚠️"
                    elif "INFO" in log_entry:
                        icon = "ℹ️"
                    else:
                        icon = "📝"
                    
                    # Truncate long log entries
                    display_entry = log_entry[:120] + "..." if len(log_entry) > 120 else log_entry
                    print(f"{icon} {display_entry}")
        else:
            print("📭 No recent log entries found")
        print()
        
        # Quick Actions
        print("⚡ QUICK ACTIONS")
        print("-" * 40)
        print("🔍 View detailed status: python3 .claude/scripts/sub-agent-control.py status")
        print("📊 View metrics: python3 .claude/scripts/sub-agent-control.py metrics")
        print("🛑 Emergency stop: python3 .claude/scripts/sub-agent-control.py emergency-stop")
        print("🔄 Restart system: python3 .claude/scripts/sub-agent-control.py restart")
        print("📋 List agents: python3 .claude/scripts/sub-agent-control.py list-agents")
        print()
        
        print("=" * 80)
    
    def generate_summary_report(self) -> Dict[str, Any]:
        """Generate a summary report for external consumption"""
        metrics = self.load_metrics()
        config = self.load_config()
        status = self.get_agent_status()
        
        return {
            "timestamp": datetime.datetime.now().isoformat(),
            "system_status": status,
            "performance_stats": self.calculate_performance_stats(metrics) if "error" not in metrics else None,
            "agent_health": self.generate_agent_health_report(config) if "error" not in config else None,
            "total_agents": len(config.get("sub_agents", {})) if "error" not in config else 0,
            "enabled_agents": len([a for a in config.get("sub_agents", {}).values() if a.get("enabled", False)]) if "error" not in config else 0
        }

def main():
    """Main dashboard interface"""
    import argparse
    
    parser = argparse.ArgumentParser(description="BookedBarber V2 Agent Monitoring Dashboard")
    parser.add_argument("--format", choices=["display", "json", "summary"], default="display",
                       help="Output format (default: display)")
    parser.add_argument("--watch", action="store_true", help="Watch mode - refresh every 30 seconds")
    parser.add_argument("--interval", type=int, default=30, help="Refresh interval in seconds (default: 30)")
    
    args = parser.parse_args()
    
    dashboard = AgentMonitoringDashboard()
    
    if args.format == "json":
        # Output JSON for programmatic consumption
        report = dashboard.generate_summary_report()
        print(json.dumps(report, indent=2))
    
    elif args.format == "summary":
        # Output brief summary
        report = dashboard.generate_summary_report()
        stats = report.get("performance_stats", {})
        print(f"BookedBarber V2 Agent System Status:")
        print(f"  Agents: {report['enabled_agents']}/{report['total_agents']} enabled")
        print(f"  Executions: {stats.get('total_executions', 0)} total")
        print(f"  Success Rate: {stats.get('success_rate', 0):.1f}%")
        print(f"  System: {report['system_status'].get('Status', 'Unknown')}")
    
    elif args.watch:
        # Watch mode - refresh periodically
        try:
            while True:
                os.system('clear' if os.name == 'posix' else 'cls')
                dashboard.display_dashboard()
                print(f"🔄 Refreshing in {args.interval} seconds... (Ctrl+C to exit)")
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n👋 Monitoring stopped by user")
    
    else:
        # Default display mode
        dashboard.display_dashboard()

if __name__ == "__main__":
    main()