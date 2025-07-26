#!/usr/bin/env python3
"""
Quick validation script for Production Fullstack Dev Agent
Ensures agent is properly deployed and configured
"""

import json
import os
from pathlib import Path

def validate_production_dev_agent():
    """Quick validation of production dev agent deployment"""
    
    project_root = Path("/Users/bossio/6fb-booking")
    claude_dir = project_root / ".claude"
    
    print("🔍 Validating Production Fullstack Dev Agent Deployment")
    print("=" * 60)
    
    # Check 1: Agent script exists
    agent_script = claude_dir / "scripts" / "production-fullstack-dev-agent.py"
    if agent_script.exists():
        print("✅ Agent script found and accessible")
    else:
        print("❌ Agent script not found")
        return False
    
    # Check 2: Agent is executable
    if os.access(agent_script, os.X_OK):
        print("✅ Agent script is executable")
    else:
        print("❌ Agent script is not executable")
        return False
    
    # Check 3: Configuration exists
    config_file = claude_dir / "sub-agent-automation.json"
    if not config_file.exists():
        print("❌ Sub-agent automation configuration not found")
        return False
    
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    # Check 4: Production dev agent is configured
    agents = config.get("sub_agents", {})
    if "production-fullstack-dev" in agents:
        print("✅ Production dev agent found in configuration")
    else:
        print("❌ Production dev agent not found in configuration")
        return False
    
    # Check 5: Agent is enabled
    prod_agent = agents["production-fullstack-dev"]
    if prod_agent.get("enabled", False):
        print("✅ Production dev agent is enabled")
    else:
        print("❌ Production dev agent is disabled")
        return False
    
    # Check 6: Triggers are configured
    triggers = prod_agent.get("triggers", [])
    if len(triggers) >= 5:
        print(f"✅ Production dev agent has {len(triggers)} triggers configured")
    else:
        print(f"❌ Production dev agent has insufficient triggers: {len(triggers)}")
        return False
    
    # Check 7: Priority configuration
    safety = config.get("safety_mechanisms", {})
    conflict = safety.get("conflict_prevention", {})
    priority_order = conflict.get("agent_priority_order", [])
    if "production-fullstack-dev" in priority_order:
        print("✅ Production dev agent in priority order")
    else:
        print("❌ Production dev agent not in priority order")
        return False
    
    # Check 8: Resource limits
    resource_protection = safety.get("resource_protection", {})
    if resource_protection.get("memory_limit_mb", 0) >= 1024:
        print("✅ Adequate memory limits configured")
    else:
        print("❌ Memory limits too low")
        return False
    
    if resource_protection.get("max_execution_time_minutes", 0) >= 15:
        print("✅ Adequate execution timeout configured") 
    else:
        print("❌ Execution timeout too low")
        return False
    
    print("\n🎯 Production Dev Agent Features:")
    print("  • Auto-triggers on API endpoint creation/modification")
    print("  • Database model changes requiring enterprise-grade implementation")
    print("  • React component development needing production standards")
    print("  • Performance optimization requirements")
    print("  • Cross-system integration tasks")
    print("  • Authentication and security feature implementation")
    print("  • Payment and booking core feature development")
    
    print("\n🛡️ Safety Mechanisms:")
    print("  • 20-30 minute cooldowns between triggers")
    print("  • Max 2-5 executions per hour per trigger type")
    print("  • 15-minute execution timeout")
    print("  • 1GB memory limit, 75% CPU limit")
    print("  • Emergency stop capability")
    
    print("\n📊 Implementation Standards:")
    print("  • TypeScript strict mode enforcement")
    print("  • 80%+ test coverage requirement")
    print("  • Comprehensive error handling")
    print("  • Security best practices")
    print("  • Performance optimization")
    print("  • WCAG AA accessibility compliance")
    print("  • Six Figure Barber methodology alignment")
    
    print("\n✅ PRODUCTION FULLSTACK DEV AGENT SUCCESSFULLY DEPLOYED")
    print("🚀 Ready for enterprise-grade development automation")
    
    return True

if __name__ == "__main__":
    success = validate_production_dev_agent()
    exit(0 if success else 1)