"""
Base interface for AI providers
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any


class AIProviderInterface(ABC):
    """Base interface that all AI providers must implement"""
    
    @abstractmethod
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: int = 500,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate a response from the AI model
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Controls randomness (0-1)
            max_tokens: Maximum tokens in response
            **kwargs: Provider-specific parameters
            
        Returns:
            Dict containing:
                - content: The generated text
                - usage: Token usage statistics
                - model: Model used
                - provider: Provider name
        """
    
    @abstractmethod
    async def count_tokens(self, text: str) -> int:
        """Count tokens in a text string"""
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about available models and pricing"""
    
    @abstractmethod
    def validate_api_key(self) -> bool:
        """Validate that the API key is working"""
    
    def format_messages(self, messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Format messages for the specific provider (can be overridden)"""
        return messages
    
    def extract_usage(self, response: Any) -> Dict[str, int]:
        """Extract token usage from provider response"""
        return {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        }