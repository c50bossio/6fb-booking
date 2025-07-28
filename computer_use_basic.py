#!/usr/bin/env python3
"""
Basic Computer Use with Claude

This uses the available text editor and bash tools that are currently supported.
The computer_20241022 tool type has been deprecated.
"""

import os
import base64
from typing import List, Dict, Any
from anthropic import Anthropic
from PIL import Image
import pyautogui
import io

def take_screenshot_base64() -> str:
    """Take a screenshot and return as base64 encoded string."""
    screenshot = pyautogui.screenshot()
    
    # Convert to base64
    buffer = io.BytesIO()
    screenshot.save(buffer, format='PNG')
    image_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return image_base64

def analyze_screen_with_claude(prompt: str, api_key: str = None) -> Dict[str, Any]:
    """
    Send a screenshot to Claude and ask for analysis.
    
    Args:
        prompt: What you want Claude to analyze about the screen
        api_key: Your Anthropic API key
        
    Returns:
        Claude's response analyzing the screenshot
    """
    api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        return {"error": "API key required"}
    
    client = Anthropic(api_key=api_key)
    
    # Take screenshot
    screenshot_b64 = take_screenshot_base64()
    
    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            messages=[
                {
                    "role": "user", 
                    "content": [
                        {
                            "type": "text",
                            "text": f"Please analyze this screenshot and help me with: {prompt}"
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
            ]
        )
        
        return {
            "success": True,
            "response": response.content[0].text if response.content else "No response",
            "usage": response.usage.dict() if hasattr(response, 'usage') else None
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def main():
    """Example usage of basic computer use."""
    
    # Check for API key
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("❌ ANTHROPIC_API_KEY environment variable not set!")
        print("\nTo set up:")
        print("export ANTHROPIC_API_KEY='your-key-here'")
        return
    
    print("🖥️  Basic Computer Use initialized!")
    print("📸 Taking screenshot and sending to Claude...")
    
    # Example: Ask Claude to analyze the current screen
    result = analyze_screen_with_claude(
        "What applications and windows are visible on this screen? "
        "Can you see any code editors, terminals, or web browsers?"
    )
    
    if result.get("success"):
        print("✅ Successfully analyzed screen!")
        print("\n📋 Claude's analysis:")
        print(result["response"])
    else:
        print(f"❌ Error: {result.get('error')}")

if __name__ == "__main__":
    main()