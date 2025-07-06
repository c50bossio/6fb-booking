"""
OpenAI GPT AI Provider
"""

import logging
from typing import List, Dict, Any, Optional
import openai
from openai import AsyncOpenAI
from config import settings
from .base import AIProviderInterface

logger = logging.getLogger(__name__)


class OpenAIProvider(AIProviderInterface):
    """OpenAI GPT integration"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.openai_api_key
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")
        
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.models = {
            "gpt-4-turbo-preview": {
                "name": "GPT-4 Turbo",
                "description": "Most capable, with 128K context",
                "input_cost": 0.01,  # per 1K tokens
                "output_cost": 0.03
            },
            "gpt-4": {
                "name": "GPT-4",
                "description": "High quality, slower",
                "input_cost": 0.03,
                "output_cost": 0.06
            },
            "gpt-3.5-turbo": {
                "name": "GPT-3.5 Turbo",
                "description": "Fast and cost-effective",
                "input_cost": 0.0005,
                "output_cost": 0.0015
            }
        }
        self.default_model = "gpt-4-turbo-preview"
    
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: int = 500,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate response using OpenAI"""
        try:
            model = model or self.default_model
            
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            
            choice = response.choices[0]
            usage = response.usage
            
            return {
                "content": choice.message.content,
                "usage": {
                    "prompt_tokens": usage.prompt_tokens,
                    "completion_tokens": usage.completion_tokens,
                    "total_tokens": usage.total_tokens
                },
                "model": response.model,
                "provider": "openai",
                "finish_reason": choice.finish_reason
            }
            
        except openai.APIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error with OpenAI: {e}")
            raise
    
    async def count_tokens(self, text: str) -> int:
        """Count tokens using tiktoken"""
        try:
            import tiktoken
            encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
            return len(encoding.encode(text))
        except:
            # Fallback to estimation
            return len(text) // 4
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about available OpenAI models"""
        return {
            "provider": "openai",
            "models": self.models,
            "default_model": self.default_model,
            "features": [
                "Industry standard",
                "Large ecosystem",
                "Function calling support",
                "JSON mode available"
            ]
        }
    
    def validate_api_key(self) -> bool:
        """Validate OpenAI API key"""
        try:
            client = openai.OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=5
            )
            return True
        except Exception as e:
            logger.error(f"API key validation failed: {e}")
            return False
    
    def calculate_cost(self, usage: Dict[str, int], model: str) -> float:
        """Calculate cost for token usage"""
        model_info = self.models.get(model, self.models[self.default_model])
        input_cost = (usage["prompt_tokens"] / 1000) * model_info["input_cost"]
        output_cost = (usage["completion_tokens"] / 1000) * model_info["output_cost"]
        return round(input_cost + output_cost, 4)