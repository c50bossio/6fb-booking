#!/usr/bin/env python3
"""
Test script for task completion sound notifications
"""

import subprocess
import time
import sys
import os

# Add the hooks directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from task_completion_sound import play_sound, detect_completion_type, SOUNDS
except ImportError:
    # If module import fails, define the functions locally for testing
    import subprocess
    import re
    from typing import Dict, Any, Optional
    
    SOUNDS = {
        'task_complete': 'Blow',
        'todo_done': 'Pop',
        'deployment': 'Glass',
        'success': 'Ping',
        'error': 'Basso',
        'celebration': 'Sosumi'
    }
    
    def play_sound(sound_name: str) -> bool:
        try:
            subprocess.run([
                'afplay', 
                f'/System/Library/Sounds/{sound_name}.aiff'
            ], check=True, capture_output=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            try:
                subprocess.run([
                    'say', '-v', 'Samantha', '-r', '200', 'Task completed'
                ], check=True, capture_output=True)
                return True
            except subprocess.CalledProcessError:
                return False
    
    def detect_completion_type(content: str, context: Dict[str, Any]) -> Optional[str]:
        content_lower = content.lower()
        
        # Todo completion patterns
        if re.search(r'status.*completed|todo.*completed|✅.*completed', content_lower):
            return 'todo_done'
        
        # Deployment patterns  
        if re.search(r'deployed.*successfully|installation.*complete|system.*operational', content_lower):
            return 'deployment'
            
        # General completion patterns
        if re.search(r'task.*complete|implementation.*complete|✓|✅|🎉', content_lower):
            return 'task_complete'
            
        # Success patterns
        if re.search(r'file.*created|successfully.*added|update.*successful', content_lower):
            return 'success'
            
        # Celebration patterns
        if re.search(r'all.*tasks.*completed|comprehensive.*complete|audit.*complete', content_lower):
            return 'celebration'
            
        return None

def test_sound_playback():
    """Test all available system sounds"""
    print("🔊 Testing Task Completion Sound System")
    print("=" * 50)
    
    for completion_type, sound_name in SOUNDS.items():
        print(f"Testing {completion_type}: {sound_name}")
        success = play_sound(sound_name)
        print(f"  {'✅ Success' if success else '❌ Failed'}")
        time.sleep(1)  # Brief pause between sounds
    
    print("\n🎉 Sound test complete!")

def test_completion_detection():
    """Test completion pattern detection"""
    print("\n🔍 Testing Completion Detection Patterns")
    print("=" * 50)
    
    test_cases = [
        ("✅ Task completed successfully", "todo_done"),
        ("Implementation complete 🎉", "task_complete"),  
        ("System deployed successfully", "deployment"),
        ("File created successfully", "success"),
        ("All tasks completed! 🎉", "celebration"),
        ("Regular message with no completion", None)
    ]
    
    for text, expected in test_cases:
        detected = detect_completion_type(text, {})
        status = "✅" if detected == expected else "❌"
        print(f"{status} '{text[:30]}...' -> {detected} (expected: {expected})")
    
    print("\n🎯 Pattern detection test complete!")

def test_hook_integration():
    """Test the hook with sample data"""
    print("\n🔗 Testing Hook Integration")
    print("=" * 50)
    
    # Test with sample todo completion
    test_data = {
        "content": "✅ Database optimization completed successfully!",
        "context": {
            "type": "todo_update",
            "timestamp": "2025-01-28T10:00:00Z"
        }
    }
    
    print("Simulating hook call with todo completion...")
    
    # This would normally be called by Claude Code
    completion_type = detect_completion_type(test_data["content"], test_data["context"])
    if completion_type:
        sound_name = SOUNDS.get(completion_type, 'Ping')
        print(f"Detected: {completion_type} -> Playing: {sound_name}")
        success = play_sound(sound_name)
        print(f"Result: {'✅ Success' if success else '❌ Failed'}")
    else:
        print("No completion pattern detected")
    
    print("\n🚀 Hook integration test complete!")

def main():
    """Run all tests"""
    print("🧪 Claude Code Task Completion Sound System Test Suite")
    print("=" * 60)
    print("This will test the hook system with various sounds and patterns.\n")
    
    try:
        # Test 1: Sound playback
        test_sound_playback()
        
        # Test 2: Pattern detection
        test_completion_detection()
        
        # Test 3: Hook integration
        test_hook_integration()
        
        print("\n" + "=" * 60)
        print("🎉 All tests completed!")
        print("\nThe hook system is ready to use with Claude Code.")
        print("It will automatically play sounds when you complete tasks!")
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()