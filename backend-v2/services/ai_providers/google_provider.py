"""
Google Gemini AI Provider
"""

import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from config import settings
from .base import AIProviderInterface

logger = logging.getLogger(__name__)


class GoogleProvider(AIProviderInterface):
    """Google Gemini integration"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.google_ai_api_key
        if not self.api_key:
            raise ValueError("Google AI API key not configured")
        
        genai.configure(api_key=self.api_key)
        
        self.models = {
            "gemini-pro": {
                "name": "Gemini Pro",
                "description": "Best for text-only prompts",
                "input_cost": 0.0005,  # per 1K tokens
                "output_cost": 0.0015
            },
            "gemini-pro-vision": {
                "name": "Gemini Pro Vision",
                "description": "Multimodal - text and images",
                "input_cost": 0.0005,
                "output_cost": 0.0015
            }
        }
        self.default_model = "gemini-pro"
    
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: int = 500,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate response using Gemini"""
        try:
            model_name = model or self.default_model
            model = genai.GenerativeModel(model_name)
            
            # Convert messages to Gemini format
            chat_history = self._convert_to_gemini_format(messages[:-1])
            last_message = messages[-1]["content"] if messages else ""
            
            # Create chat session
            chat = model.start_chat(history=chat_history)
            
            # Generate response
            response = await chat.send_message_async(
                last_message,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                    **kwargs
                )
            )
            
            # Count tokens (Gemini doesn't provide token counts directly)
            prompt_tokens = await self.count_tokens(self._messages_to_text(messages))
            completion_tokens = await self.count_tokens(response.text)
            
            return {
                "content": response.text,
                "usage": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": prompt_tokens + completion_tokens
                },
                "model": model_name,
                "provider": "google",
                "finish_reason": "stop"
            }
            
        except Exception as e:
            logger.error(f"Google AI error: {e}")
            raise
    
    async def count_tokens(self, text: str) -> int:
        """Estimate token count for Gemini"""
        # Gemini uses similar tokenization to other models
        # Rough estimate: 1 token ≈ 4 characters
        return len(text) // 4
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about available Gemini models"""
        return {
            "provider": "google",
            "models": self.models,
            "default_model": self.default_model,
            "features": [
                "Fast response times",
                "Cost-effective",
                "Multimodal capabilities",
                "Good for simple tasks"
            ]
        }
    
    def validate_api_key(self) -> bool:
        """Validate Google AI API key"""
        try:
            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content("Hi")
            return True
        except Exception as e:
            logger.error(f"API key validation failed: {e}")
            return False
    
    def _convert_to_gemini_format(self, messages: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Convert messages to Gemini's expected format"""
        history = []
        
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            
            # Gemini uses "user" and "model" roles
            if role == "system":
                # Prepend system message to first user message
                if history and history[0]["role"] == "user":
                    history[0]["parts"][0] += f"\n\n{content}"
                else:
                    history.append({
                        "role": "user",
                        "parts": [content]
                    })
            elif role == "assistant":
                history.append({
                    "role": "model",
                    "parts": [content]
                })
            else:
                history.append({
                    "role": "user",
                    "parts": [content]
                })
        
        return history
    
    def _messages_to_text(self, messages: List[Dict[str, str]]) -> str:
        """Convert messages to text for token counting"""
        return " ".join([msg["content"] for msg in messages])
    
    def calculate_cost(self, usage: Dict[str, int], model: str) -> float:
        """Calculate cost for token usage"""
        model_info = self.models.get(model, self.models[self.default_model])
        input_cost = (usage["prompt_tokens"] / 1000) * model_info["input_cost"]
        output_cost = (usage["completion_tokens"] / 1000) * model_info["output_cost"]
        return round(input_cost + output_cost, 4)