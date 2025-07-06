"""
Anthropic Claude AI Provider
"""

import logging
from typing import List, Dict, Any, Optional
import anthropic
from anthropic import AsyncAnthropic
from config import settings
from .base import AIProviderInterface

logger = logging.getLogger(__name__)


class AnthropicProvider(AIProviderInterface):
    """Anthropic Claude integration"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.anthropic_api_key
        if not self.api_key:
            raise ValueError("Anthropic API key not configured")
        
        self.client = AsyncAnthropic(api_key=self.api_key)
        self.models = {
            "claude-3-opus-20240229": {
                "name": "Claude 3 Opus",
                "description": "Most capable model, best for complex tasks",
                "input_cost": 0.015,  # per 1K tokens
                "output_cost": 0.075  # per 1K tokens
            },
            "claude-3-sonnet-20240229": {
                "name": "Claude 3 Sonnet",
                "description": "Balanced performance and cost",
                "input_cost": 0.003,
                "output_cost": 0.015
            },
            "claude-3-haiku-20240307": {
                "name": "Claude 3 Haiku",
                "description": "Fastest and most affordable",
                "input_cost": 0.00025,
                "output_cost": 0.00125
            }
        }
        self.default_model = "claude-3-sonnet-20240229"
    
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: int = 500,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate response using Claude"""
        try:
            model = model or self.default_model
            
            # Claude expects a specific message format
            formatted_messages = self._format_messages_for_claude(messages)
            
            response = await self.client.messages.create(
                model=model,
                messages=formatted_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            
            return {
                "content": response.content[0].text,
                "usage": {
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens
                },
                "model": model,
                "provider": "anthropic",
                "finish_reason": response.stop_reason
            }
            
        except anthropic.APIError as e:
            logger.error(f"Anthropic API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error with Anthropic: {e}")
            raise
    
    async def count_tokens(self, text: str) -> int:
        """Estimate token count for Claude"""
        # Claude uses a similar tokenization to GPT models
        # Rough estimate: 1 token ≈ 4 characters
        return len(text) // 4
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about available Claude models"""
        return {
            "provider": "anthropic",
            "models": self.models,
            "default_model": self.default_model,
            "features": [
                "100K+ context window",
                "Strong reasoning capabilities",
                "Excellent at following instructions",
                "Constitutional AI for safety"
            ]
        }
    
    def validate_api_key(self) -> bool:
        """Validate Anthropic API key"""
        try:
            # Make a minimal API call to validate the key
            client = anthropic.Anthropic(api_key=self.api_key)
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=5
            )
            return True
        except Exception as e:
            logger.error(f"API key validation failed: {e}")
            return False
    
    def _format_messages_for_claude(self, messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Format messages for Claude's expected format"""
        formatted = []
        
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            
            # Claude uses "user" and "assistant" roles
            if role == "system":
                # Claude doesn't have a system role, prepend to first user message
                if formatted and formatted[0]["role"] == "user":
                    formatted[0]["content"] = f"{content}\n\n{formatted[0]['content']}"
                else:
                    formatted.insert(0, {"role": "user", "content": content})
            else:
                formatted.append({"role": role, "content": content})
        
        return formatted
    
    def calculate_cost(self, usage: Dict[str, int], model: str) -> float:
        """Calculate cost for token usage"""
        model_info = self.models.get(model, self.models[self.default_model])
        input_cost = (usage["prompt_tokens"] / 1000) * model_info["input_cost"]
        output_cost = (usage["completion_tokens"] / 1000) * model_info["output_cost"]
        return round(input_cost + output_cost, 4)