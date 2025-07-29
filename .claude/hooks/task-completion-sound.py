#!/usr/bin/env python3
"""
Claude Code Hook: Task Completion Sound Notification
Plays different sounds based on task completion types and contexts.
"""

import json
import subprocess
import sys
import os
import re
from typing import Dict, Any, Optional

# Sound mappings for different completion types
SOUNDS = {
    'task_complete': 'Blow',        # General task completion
    'todo_done': 'Pop',             # Todo item marked complete
    'deployment': 'Glass',          # System deployment/installation
    'success': 'Ping',              # File creation/successful operation
    'error': 'Basso',               # Hook system errors
    'celebration': 'Sosumi'         # Major milestone achievements
}

def play_sound(sound_name: str) -> bool:
    """Play a macOS system sound"""
    try:
        # Use afplay with system sounds on macOS
        subprocess.run([
            'afplay', 
            f'/System/Library/Sounds/{sound_name}.aiff'
        ], check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Fallback to say command if afplay fails
        try:
            subprocess.run([
                'say', 
                '-v', 'Samantha',
                '-r', '200',
                'Task completed'
            ], check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError:
            return False

def detect_completion_type(content: str, context: Dict[str, Any]) -> Optional[str]:
    """Detect the type of completion based on content and context"""
    
    # Convert content to lowercase for pattern matching
    content_lower = content.lower()
    
    # Celebration patterns (major achievements) - check these FIRST for priority
    celebration_patterns = [
        r'all.*tasks.*completed',
        r'comprehensive.*complete',
        r'audit.*complete',
        r'roadmap.*complete',
        r'🎉.*complete',
        r'completed.*🎉'
    ]
    
    for pattern in celebration_patterns:
        if re.search(pattern, content_lower):
            return 'celebration'
    
    # Todo completion patterns
    todo_patterns = [
        r'status.*completed',
        r'todo.*completed',
        r'✅.*completed',
        r'task.*completed',
        r'marked.*complete'
    ]
    
    for pattern in todo_patterns:
        if re.search(pattern, content_lower):
            return 'todo_done'
    
    # Deployment/installation patterns
    deployment_patterns = [
        r'deployed.*successfully',
        r'installation.*complete',
        r'system.*operational',
        r'setup.*complete',
        r'implemented.*successfully',
        r'migration.*complete'
    ]
    
    for pattern in deployment_patterns:
        if re.search(pattern, content_lower):
            return 'deployment'
    
    # General completion patterns
    completion_patterns = [
        r'task.*complete',
        r'implementation.*complete',
        r'analysis.*complete',
        r'optimization.*complete',
        r'fix.*complete',
        r'enhancement.*complete',
        r'✓',
        r'✅',
        r'🎉',
        r'finished.*successfully',
        r'accomplished',
        r'achieved'
    ]
    
    for pattern in completion_patterns:
        if re.search(pattern, content_lower):
            return 'task_complete'
    
    # Success patterns (file operations, etc.)
    success_patterns = [
        r'file.*created',
        r'successfully.*added',
        r'update.*successful',
        r'operation.*successful'
    ]
    
    for pattern in success_patterns:
        if re.search(pattern, content_lower):
            return 'success'
    
    return None

def main():
    """Main hook function called by Claude Code"""
    try:
        # Read the hook input from stdin
        hook_data = json.loads(sys.stdin.read()) if not sys.stdin.isatty() else {}
        
        # Extract content and context
        content = hook_data.get('content', '')
        context = hook_data.get('context', {})
        
        # Detect completion type
        completion_type = detect_completion_type(content, context)
        
        if completion_type:
            sound_name = SOUNDS.get(completion_type, 'Ping')
            
            # Play the sound
            success = play_sound(sound_name)
            
            # Log the notification (optional, for debugging)
            if os.getenv('CLAUDE_HOOK_DEBUG'):
                print(f"🔊 Task completion detected: {completion_type} -> {sound_name}")
                print(f"Sound played: {'✅' if success else '❌'}")
            
            # Return success status
            sys.exit(0 if success else 1)
        else:
            # No completion detected, exit silently
            sys.exit(0)
            
    except Exception as e:
        # Play error sound and exit
        play_sound(SOUNDS['error'])
        if os.getenv('CLAUDE_HOOK_DEBUG'):
            print(f"Hook error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()