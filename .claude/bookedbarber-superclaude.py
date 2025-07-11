#!/usr/bin/env python3
"""
BookedBarber V2 SuperClaude Integration
Six Figure Barber methodology-aware command selection and execution
"""

import os
import sys
import yaml
import json
from datetime import datetime
from pathlib import Path

# Import our smart routing system
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
spec = importlib.util.spec_from_file_location("smart_routing", os.path.join(os.path.dirname(__file__), "smart-routing.py"))
smart_routing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smart_routing)

class BookedBarberSuperClaude:
    def __init__(self):
        self.project_root = "/Users/bossio/6fb-booking"
        
        # Load BookedBarber V2 specific configuration
        config_path = os.path.join(self.project_root, ".claude", "bookedbarber-superclaude-config.yml")
        with open(config_path, 'r') as f:
            self.bb_config = yaml.safe_load(f)
        
        # Initialize smart router
        self.router = smart_routing.SuperClaudeRouter()
        
        # Performance tracking
        self.usage_log = []
        
    def get_6fb_aligned_command(self, task_description: str, file_paths: list = None, context: str = "") -> dict:
        """
        Get SuperClaude command aligned with Six Figure Barber methodology
        """
        
        # First get base recommendation from smart router
        base_recommendation = self.router.analyze_context(
            file_paths=file_paths or [],
            content=context,
            task_description=task_description,
            current_directory=self.project_root
        )
        
        # Enhance with 6FB methodology alignment
        enhanced_recommendation = self._enhance_with_6fb_methodology(
            base_recommendation, task_description, file_paths or []
        )
        
        # Apply business priority scoring
        business_score = self._calculate_business_impact_score(task_description, file_paths or [])
        
        # Log for analytics
        self._log_usage(enhanced_recommendation, business_score, task_description)
        
        return {
            'command': enhanced_recommendation['command'],
            'reasoning': enhanced_recommendation['reasoning'],
            'business_impact': business_score,
            'methodology_alignment': enhanced_recommendation['methodology_alignment'],
            'mcp_servers': enhanced_recommendation['mcp_servers'],
            'follow_up_commands': enhanced_recommendation.get('follow_up_commands', [])
        }
    
    def _enhance_with_6fb_methodology(self, base_recommendation, task_description: str, file_paths: list) -> dict:
        """
        Enhance command recommendation with 6FB methodology alignment
        """
        
        # Detect 6FB feature categories
        feature_category = self._detect_6fb_feature_category(task_description, file_paths)
        
        if feature_category and feature_category in self.bb_config:
            # Use specific 6FB-aligned commands
            feature_config = self.bb_config[feature_category]
            
            # Determine command type based on task
            command_type = self._determine_command_type(task_description)
            
            if command_type in feature_config.get('commands', {}):
                enhanced_command = feature_config['commands'][command_type]
                
                return {
                    'command': enhanced_command,
                    'reasoning': f"6FB methodology: {feature_config['description']}",
                    'methodology_alignment': feature_config['business_context'],
                    'mcp_servers': feature_config.get('mcp_priority', []),
                    'follow_up_commands': self._get_follow_up_commands(feature_category, command_type)
                }
        
        # Fallback to enhanced base recommendation
        return {
            'command': self._enhance_base_command(base_recommendation),
            'reasoning': f"Enhanced base recommendation: {base_recommendation.context}",
            'methodology_alignment': "General development workflow",
            'mcp_servers': base_recommendation.mcp_servers,
            'follow_up_commands': []
        }
    
    def _detect_6fb_feature_category(self, task_description: str, file_paths: list) -> str:
        """
        Detect which 6FB feature category this task relates to
        """
        
        task_lower = task_description.lower()
        file_content = ' '.join(file_paths).lower()
        
        # Check each feature category
        for category, config in self.bb_config.items():
            if isinstance(config, dict) and 'patterns' in config:
                for pattern in config['patterns']:
                    pattern_clean = pattern.replace('*', '').lower()
                    if pattern_clean in task_lower or pattern_clean in file_content:
                        return category
        
        return None
    
    def _determine_command_type(self, task_description: str) -> str:
        """
        Determine what type of SuperClaude command is needed
        """
        
        task_lower = task_description.lower()
        
        # Map keywords to command types
        command_mappings = {
            'analysis': ['analyze', 'understand', 'explain', 'investigate'],
            'design': ['design', 'architecture', 'structure', 'plan'],
            'security': ['security', 'secure', 'auth', 'payment', 'safe'],
            'performance': ['performance', 'optimize', 'speed', 'slow'],
            'review': ['review', 'check', 'validate', 'examine'],
            'ui': ['ui', 'component', 'frontend', 'interface'],
            'integration': ['integrate', 'connect', 'api', 'webhook']
        }
        
        for command_type, keywords in command_mappings.items():
            if any(keyword in task_lower for keyword in keywords):
                return command_type
        
        return 'analysis'  # Default
    
    def _enhance_base_command(self, base_recommendation) -> str:
        """
        Enhance base command with 6FB context
        """
        base_cmd = base_recommendation.commands[0] if base_recommendation.commands else "/analyze --code"
        
        # Add 6FB methodology context
        if "--c7" not in base_cmd:
            base_cmd += " --c7"  # Always include documentation lookup for 6FB
            
        return base_cmd
    
    def _calculate_business_impact_score(self, task_description: str, file_paths: list) -> int:
        """
        Calculate business impact score based on 6FB methodology
        """
        score = 5  # Base score
        
        task_lower = task_description.lower()
        file_content = ' '.join(file_paths).lower()
        
        # High impact keywords (6FB core)
        high_impact = ['booking', 'payment', 'revenue', 'client', 'appointment', 'stripe']
        medium_impact = ['analytics', 'marketing', 'integration', 'notification']
        low_impact = ['documentation', 'test', 'log', 'debug']
        
        for keyword in high_impact:
            if keyword in task_lower or keyword in file_content:
                score += 3
                
        for keyword in medium_impact:
            if keyword in task_lower or keyword in file_content:
                score += 2
                
        for keyword in low_impact:
            if keyword in task_lower or keyword in file_content:
                score -= 1
        
        return max(1, min(10, score))  # Clamp between 1-10
    
    def _get_follow_up_commands(self, feature_category: str, command_type: str) -> list:
        """
        Get follow-up commands based on 6FB methodology
        """
        
        follow_ups = {
            'booking_system': [
                "/review --booking-workflow --persona-backend --c7",
                "/test --booking-logic --persona-qa --pup"
            ],
            'payment_processing': [
                "/scan --payment-security --persona-security --c7",
                "/test --payment-flow --persona-qa --pup"
            ],
            'client_management': [
                "/analyze --client-experience --persona-frontend --magic",
                "/test --client-journey --persona-qa --pup"
            ],
            'analytics_dashboard': [
                "/analyze --metrics-accuracy --persona-backend --seq",
                "/test --dashboard-performance --persona-performance --pup"
            ]
        }
        
        return follow_ups.get(feature_category, [])
    
    def _log_usage(self, recommendation: dict, business_score: int, task: str):
        """
        Log usage for analytics and optimization
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'task': task[:100],
            'command': recommendation['command'],
            'business_score': business_score,
            'methodology_alignment': recommendation['methodology_alignment']
        }
        
        self.usage_log.append(log_entry)
        
        # Write to log file
        log_file = os.path.join(self.project_root, ".claude", "bookedbarber-superclaude.log")
        with open(log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    def get_6fb_metrics(self) -> dict:
        """
        Get 6FB methodology alignment metrics
        """
        if not self.usage_log:
            return {"status": "No usage data available"}
        
        total_usage = len(self.usage_log)
        avg_business_score = sum(entry['business_score'] for entry in self.usage_log) / total_usage
        
        # Categorize by business impact
        high_impact = len([e for e in self.usage_log if e['business_score'] >= 8])
        medium_impact = len([e for e in self.usage_log if 5 <= e['business_score'] < 8])
        low_impact = len([e for e in self.usage_log if e['business_score'] < 5])
        
        return {
            'total_commands': total_usage,
            'average_business_score': avg_business_score,
            'high_impact_commands': high_impact,
            'medium_impact_commands': medium_impact,
            'low_impact_commands': low_impact,
            '6fb_alignment_percentage': (high_impact + medium_impact) / total_usage * 100
        }
    
    def interactive_6fb_mode(self):
        """
        Interactive mode with 6FB methodology guidance
        """
        print("🏆 BookedBarber V2 SuperClaude - Six Figure Barber Mode")
        print("Optimized for barber business success through intelligent automation")
        print()
        print("Commands are automatically aligned with 6FB methodology:")
        print("• Revenue Optimization • Client Value • Business Efficiency")
        print("• Professional Growth • Scalability")
        print()
        print("Type 'metrics' for 6FB alignment statistics, 'exit' to quit")
        print()
        
        while True:
            try:
                task_input = input("📋 6FB Task: ").strip()
                
                if task_input.lower() in ['exit', 'quit', 'q']:
                    break
                elif task_input.lower() in ['metrics', '6fb', 'stats']:
                    self._show_6fb_metrics()
                    continue
                elif not task_input:
                    continue
                
                # Get 6FB-aligned command
                recommendation = self.get_6fb_aligned_command(task_input)
                
                print(f"🚀 6FB-Optimized Command:")
                print(f"   {recommendation['command']}")
                print()
                print(f"💼 Business Impact: {recommendation['business_impact']}/10")
                print(f"🎯 6FB Alignment: {recommendation['methodology_alignment']}")
                
                if recommendation['follow_up_commands']:
                    print(f"🔄 Suggested Follow-ups:")
                    for cmd in recommendation['follow_up_commands'][:2]:
                        print(f"   • {cmd}")
                
                print()
                print(f"💡 Reasoning: {recommendation['reasoning']}")
                print("-" * 60)
                
            except KeyboardInterrupt:
                print("\n👋 Keep building that six-figure business!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
    
    def _show_6fb_metrics(self):
        """Show 6FB methodology metrics"""
        metrics = self.get_6fb_metrics()
        
        print("📊 Six Figure Barber Methodology Metrics:")
        print(f"   Total Commands: {metrics.get('total_commands', 0)}")
        print(f"   Avg Business Score: {metrics.get('average_business_score', 0):.1f}/10")
        print(f"   High Impact: {metrics.get('high_impact_commands', 0)}")
        print(f"   6FB Alignment: {metrics.get('6fb_alignment_percentage', 0):.1f}%")
        print()

def main():
    """CLI interface for BookedBarber V2 SuperClaude"""
    bb_superclaude = BookedBarberSuperClaude()
    
    if len(sys.argv) == 1:
        # Interactive 6FB mode
        bb_superclaude.interactive_6fb_mode()
    else:
        # Single command mode
        task_description = ' '.join(sys.argv[1:])
        recommendation = bb_superclaude.get_6fb_aligned_command(task_description)
        print(recommendation['command'])

if __name__ == "__main__":
    main()