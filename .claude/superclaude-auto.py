#!/usr/bin/env python3
"""
SuperClaude Auto-Command Wrapper
Automatically determines the best SuperClaude command based on context
"""

import os
import sys
import glob
from pathlib import Path

# Add current directory to Python path to import smart_routing
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Import with explicit path handling
import importlib.util
spec = importlib.util.spec_from_file_location("smart_routing", os.path.join(current_dir, "smart-routing.py"))
smart_routing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smart_routing)
SuperClaudeRouter = smart_routing.SuperClaudeRouter

class SuperClaudeAuto:
    def __init__(self):
        self.router = SuperClaudeRouter()
        self.current_directory = os.getcwd()
        
    def auto_command(self, user_input: str, files: list = None) -> str:
        """
        Automatically determine the best SuperClaude command based on user input and context
        """
        
        # Detect current files if not provided
        if files is None:
            files = self._detect_current_files()
        
        # Extract file paths from user input if any
        input_files = self._extract_file_paths_from_input(user_input)
        all_files = list(set((files or []) + input_files))
        
        # Get command recommendation
        recommended_command = self.router.get_command_recommendation(
            file_paths=all_files,
            task_description=user_input,
            current_directory=self.current_directory
        )
        
        return recommended_command
    
    def _detect_current_files(self) -> list:
        """
        Detect recently modified files in the current directory
        """
        file_patterns = [
            "*.py", "*.tsx", "*.ts", "*.js", "*.jsx", 
            "*.css", "*.scss", "*.html", "*.md"
        ]
        
        recent_files = []
        for pattern in file_patterns:
            files = glob.glob(pattern, recursive=True)
            recent_files.extend(files[:5])  # Limit to 5 files per pattern
        
        # Sort by modification time and return the most recent 10
        recent_files.sort(key=lambda f: os.path.getmtime(f), reverse=True)
        return recent_files[:10]
    
    def _extract_file_paths_from_input(self, user_input: str) -> list:
        """
        Extract file paths mentioned in user input
        """
        words = user_input.split()
        file_paths = []
        
        for word in words:
            # Check if word looks like a file path
            if ('/' in word or '.' in word) and not word.startswith('http'):
                if os.path.exists(word):
                    file_paths.append(word)
                else:
                    # Try glob pattern matching
                    matches = glob.glob(word)
                    file_paths.extend(matches[:3])  # Limit matches
        
        return file_paths
    
    def interactive_mode(self):
        """
        Run in interactive mode
        """
        print("🚀 SuperClaude Auto-Command Mode")
        print("Type your task description and get an optimized SuperClaude command")
        print("Type 'exit' to quit, 'stats' for performance statistics")
        print()
        
        while True:
            try:
                user_input = input("📝 Task: ").strip()
                
                if user_input.lower() in ['exit', 'quit', 'q']:
                    break
                elif user_input.lower() in ['stats', 'statistics']:
                    self._show_stats()
                    continue
                elif not user_input:
                    continue
                
                # Get auto command
                command = self.auto_command(user_input)
                
                print(f"💡 Recommended command:")
                print(f"   {command}")
                print()
                
                # Ask if user wants to run it
                run_choice = input("🤔 Run this command? (y/n/copy): ").strip().lower()
                
                if run_choice in ['y', 'yes']:
                    print("🔄 Running command...")
                    # Here you would integrate with Claude Code to actually run the command
                    print("✅ Command executed (integration with Claude Code needed)")
                elif run_choice in ['c', 'copy']:
                    print("📋 Command copied to clipboard (if supported)")
                    # Here you would copy to clipboard
                
                print("-" * 50)
                
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
    
    def _show_stats(self):
        """Show performance statistics"""
        stats = self.router.get_performance_stats()
        
        print("📊 SuperClaude Auto-Command Statistics:")
        print(f"   Total requests: {stats.get('total_requests', 0)}")
        print(f"   Average confidence: {stats.get('average_confidence', 0):.2f}")
        
        if 'most_common_patterns' in stats:
            print("   Most common patterns:")
            for pattern, count in stats['most_common_patterns']:
                print(f"      {pattern}: {count}")
        
        if 'persona_usage' in stats:
            print("   Persona usage:")
            for persona, count in stats['persona_usage'][:3]:
                print(f"      {persona}: {count}")
        print()

def main():
    """Command line interface"""
    auto_commander = SuperClaudeAuto()
    
    if len(sys.argv) == 1:
        # Interactive mode
        auto_commander.interactive_mode()
    else:
        # Single command mode
        task_description = ' '.join(sys.argv[1:])
        command = auto_commander.auto_command(task_description)
        print(command)

if __name__ == "__main__":
    main()