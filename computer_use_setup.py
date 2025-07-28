#!/usr/bin/env python3
"""
Anthropic Computer Use Setup Example

This demonstrates how to set up and use Anthropic's Computer Use capability.
Computer Use allows Claude to interact with your computer screen, take screenshots,
click buttons, and perform other GUI interactions.
"""

import os
import base64
from typing import List, Dict, Any
from anthropic import Anthropic
from PIL import Image
import pyautogui
import io

class ComputerUseAgent:
    def __init__(self, api_key: str = None):
        """
        Initialize the Computer Use agent.
        
        Args:
            api_key: Your Anthropic API key. If None, will use ANTHROPIC_API_KEY env var.
        """
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("API key required. Set ANTHROPIC_API_KEY env var or pass api_key parameter")
        
        self.client = Anthropic(api_key=self.api_key)
        
        # Configure pyautogui safety
        pyautogui.FAILSAFE = True  # Move mouse to top-left corner to stop
        pyautogui.PAUSE = 0.5      # Pause between actions
    
    def take_screenshot(self) -> str:
        """Take a screenshot and return as base64 encoded string."""
        screenshot = pyautogui.screenshot()
        
        # Convert to base64
        buffer = io.BytesIO()
        screenshot.save(buffer, format='PNG')
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return image_base64
    
    def execute_computer_action(self, prompt: str, max_tokens: int = 1000) -> Dict[str, Any]:
        """
        Send a prompt with screenshot to Claude and get computer use instructions.
        
        Args:
            prompt: What you want Claude to do with the computer
            max_tokens: Maximum tokens in response
            
        Returns:
            Claude's response with computer use instructions
        """
        # Take screenshot
        screenshot_b64 = self.take_screenshot()
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",  # Computer use enabled model
                max_tokens=max_tokens,
                messages=[
                    {
                        "role": "user", 
                        "content": [
                            {
                                "type": "text",
                                "text": f"I need help with my computer. Here's what I want to do: {prompt}\n\nPlease analyze the screenshot and tell me what steps to take."
                            },
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": screenshot_b64
                                }
                            }
                        ]
                    }
                ],
                # Note: Computer use tools have been updated
                # Current available tools: bash_20250124, text_editor_20250124, text_editor_20250429, text_editor_20250728, web_search_20250305
                # Computer use may require different integration
            )
            
            return {
                "success": True,
                "response": response.content,
                "usage": response.usage
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def click_at_coordinates(self, x: int, y: int):
        """Click at specific screen coordinates."""
        pyautogui.click(x, y)
    
    def type_text(self, text: str):
        """Type text at current cursor position."""
        pyautogui.write(text)
    
    def scroll(self, clicks: int, x: int = None, y: int = None):
        """Scroll at current mouse position or specified coordinates."""
        if x and y:
            pyautogui.scroll(clicks, x, y)
        else:
            pyautogui.scroll(clicks)

def main():
    """Example usage of Computer Use."""
    
    # Check for API key
    if not os.getenv('ANTHROPIC_API_KEY'):
        print("❌ ANTHROPIC_API_KEY environment variable not set!")
        print("\nTo set up Computer Use:")
        print("1. Get an API key from https://console.anthropic.com/")
        print("2. Export it: export ANTHROPIC_API_KEY='your-key-here'")
        print("3. Make sure you have access to Claude 3.5 Sonnet with Computer Use")
        return
    
    try:
        # Initialize agent
        agent = ComputerUseAgent()
        
        print("🖥️  Computer Use Agent initialized!")
        print("📸 Taking screenshot...")
        
        # Example: Ask Claude to analyze the current screen
        result = agent.execute_computer_action(
            "What applications are currently open on this screen? "
            "Can you see any web browsers or text editors?"
        )
        
        if result["success"]:
            print("✅ Successfully communicated with Claude!")
            print("\n📋 Claude's response:")
            for content in result["response"]:
                if content.type == "text":
                    print(content.text)
        else:
            print(f"❌ Error: {result['error']}")
            
    except Exception as e:
        print(f"❌ Setup error: {e}")

if __name__ == "__main__":
    main()