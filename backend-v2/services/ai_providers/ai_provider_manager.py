"""
AI Provider Manager - Manages multiple AI providers with fallback and load balancing
"""

import asyncio
import logging
import random
from typing import List, Dict, Any, Optional
from .base import AIProviderInterface
from .anthropic_provider import AnthropicProvider
from .openai_provider import OpenAIProvider
from .google_provider import GoogleProvider
from config import settings

logger = logging.getLogger(__name__)


class AIProviderManager:
    """Manages multiple AI providers with fallback and selection strategies"""
    
    def __init__(self):
        self.providers = {}
        self.default_provider = settings.default_ai_provider or "anthropic"
        self.fallback_order = ["anthropic", "openai", "google"]
        
        # Initialize available providers
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize available AI providers based on configuration"""
        # Anthropic
        if settings.anthropic_api_key:
            try:
                self.providers["anthropic"] = AnthropicProvider()
                logger.info("Initialized Anthropic provider")
            except Exception as e:
                logger.warning(f"Failed to initialize Anthropic provider: {e}")
        
        # OpenAI
        if settings.openai_api_key:
            try:
                self.providers["openai"] = OpenAIProvider()
                logger.info("Initialized OpenAI provider")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI provider: {e}")
        
        # Google
        if settings.google_ai_api_key:
            try:
                self.providers["google"] = GoogleProvider()
                logger.info("Initialized Google provider")
            except Exception as e:
                logger.warning(f"Failed to initialize Google provider: {e}")
        
        if not self.providers:
            # Allow initialization without providers for testing and deployment flexibility
            if settings.environment in ["development", "staging", "production"]:
                logger.warning(f"No AI providers configured in {settings.environment} mode. Agent system will use mock responses.")
                self.providers["mock"] = None  # Mock provider for graceful degradation
            else:
                raise ValueError("No AI providers configured. Please set at least one API key.")
    
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        provider: Optional[str] = None,
        fallback: bool = True,
        temperature: float = 0.7,
        max_tokens: int = 500,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate response with automatic fallback
        
        Args:
            messages: Conversation messages
            provider: Specific provider to use (optional)
            fallback: Whether to try other providers on failure
            temperature: Response randomness (0-1)
            max_tokens: Maximum response length
            **kwargs: Provider-specific parameters
        
        Returns:
            Response dict with content and metadata
        """
        provider_name = provider or self.default_provider
        
        # Handle mock provider for development
        if provider_name == "mock" or (provider_name in self.providers and self.providers[provider_name] is None):
            return self._generate_mock_response(messages, provider_name)
        
        # Try primary provider
        if provider_name in self.providers:
            try:
                logger.info(f"Generating response with {provider_name}")
                response = await self.providers[provider_name].generate_response(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                )
                response["provider_used"] = provider_name
                return response
            except Exception as e:
                logger.error(f"Provider {provider_name} failed: {e}")
                if not fallback:
                    raise
        
        # Try fallback providers
        if fallback:
            for fallback_provider in self.fallback_order:
                if fallback_provider != provider_name and fallback_provider in self.providers:
                    # Handle mock providers
                    if self.providers[fallback_provider] is None:
                        return self._generate_mock_response(messages, fallback_provider)
                    
                    try:
                        logger.info(f"Falling back to {fallback_provider}")
                        response = await self.providers[fallback_provider].generate_response(
                            messages=messages,
                            temperature=temperature,
                            max_tokens=max_tokens,
                            **kwargs
                        )
                        response["provider_used"] = fallback_provider
                        response["fallback"] = True
                        return response
                    except Exception as e:
                        logger.error(f"Fallback provider {fallback_provider} failed: {e}")
                        continue
        
        # If only mock provider is available, use it
        if "mock" in self.providers:
            return self._generate_mock_response(messages, "mock")
            
        raise Exception("All AI providers failed")
    
    async def generate_with_retry(
        self,
        messages: List[Dict[str, str]],
        max_retries: int = 3,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate response with retry logic"""
        last_error = None
        
        for attempt in range(max_retries):
            try:
                return await self.generate_response(messages, **kwargs)
            except Exception as e:
                last_error = e
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        raise Exception(f"Failed after {max_retries} attempts: {last_error}")
    
    async def generate_with_consensus(
        self,
        messages: List[Dict[str, str]],
        providers: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate responses from multiple providers and return the best one
        Useful for important messages where quality is critical
        """
        providers_to_use = providers or list(self.providers.keys())[:2]
        responses = []
        
        for provider_name in providers_to_use:
            if provider_name in self.providers:
                try:
                    response = await self.providers[provider_name].generate_response(
                        messages=messages,
                        **kwargs
                    )
                    response["provider_used"] = provider_name
                    responses.append(response)
                except Exception as e:
                    logger.error(f"Provider {provider_name} failed in consensus: {e}")
        
        if not responses:
            raise Exception("No providers succeeded in consensus generation")
        
        # For now, return the first successful response
        # Could implement more sophisticated selection logic
        return responses[0]
    
    def get_provider(self, name: str) -> Optional[AIProviderInterface]:
        """Get a specific provider instance"""
        return self.providers.get(name)
    
    def get_available_providers(self) -> List[str]:
        """Get list of available provider names"""
        return list(self.providers.keys())
    
    def get_provider_info(self, provider_name: Optional[str] = None) -> Dict[str, Any]:
        """Get information about providers"""
        if provider_name:
            if provider_name in self.providers:
                return self.providers[provider_name].get_model_info()
            else:
                return {"error": f"Provider {provider_name} not available"}
        
        # Return info for all providers
        return {
            name: provider.get_model_info()
            for name, provider in self.providers.items()
        }
    
    def validate_all_providers(self) -> Dict[str, bool]:
        """Validate all configured providers"""
        results = {}
        for name, provider in self.providers.items():
            try:
                results[name] = provider.validate_api_key()
            except Exception as e:
                logger.error(f"Error validating {name}: {e}")
                results[name] = False
        return results
    
    async def estimate_cost(
        self,
        messages: List[Dict[str, str]],
        provider: Optional[str] = None,
        max_tokens: int = 500
    ) -> Dict[str, float]:
        """Estimate cost for a conversation across providers"""
        costs = {}
        
        providers_to_check = [provider] if provider else self.providers.keys()
        
        for provider_name in providers_to_check:
            if provider_name in self.providers:
                provider_instance = self.providers[provider_name]
                
                # Estimate tokens
                prompt_tokens = sum([
                    await provider_instance.count_tokens(msg["content"])
                    for msg in messages
                ])
                
                # Estimate completion tokens (rough estimate)
                completion_tokens = min(max_tokens, prompt_tokens // 2)
                
                usage = {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": prompt_tokens + completion_tokens
                }
                
                # Calculate cost for default model
                model_info = provider_instance.get_model_info()
                default_model = model_info["default_model"]
                
                if hasattr(provider_instance, 'calculate_cost'):
                    costs[provider_name] = provider_instance.calculate_cost(usage, default_model)
                else:
                    costs[provider_name] = 0.0
        
        return costs
    
    def select_provider_by_task(self, task_type: str) -> str:
        """Select the best provider for a specific task type"""
        # Task-specific provider selection
        task_preferences = {
            "rebooking": ["anthropic", "openai", "google"],  # Claude is best at conversations
            "birthday_wishes": ["google", "anthropic", "openai"],  # Gemini is creative
            "no_show_fee": ["anthropic", "openai", "google"],  # Claude for professional tone
            "review_request": ["openai", "anthropic", "google"],  # GPT for marketing
            "retention": ["anthropic", "openai", "google"],  # Claude for empathy
        }
        
        preferences = task_preferences.get(task_type, self.fallback_order)
        
        # Return first available provider from preferences
        for provider in preferences:
            if provider in self.providers:
                return provider
        
        return self.default_provider
    
    def _generate_mock_response(self, messages: List[Dict[str, str]], provider_name: str) -> Dict[str, Any]:
        """Generate mock response for development/testing"""
        logger.info(f"Generating mock response for {provider_name}")
        
        # Extract the last user message to create a contextual mock response
        last_message = messages[-1] if messages else {"content": ""}
        user_content = last_message.get("content", "").lower()
        
        # Generate contextual mock responses based on content
        if "rebooking" in user_content or "appointment" in user_content:
            mock_content = "Hi! I hope you've been well. It's been a while since your last visit, and I wanted to reach out to see if you'd like to book your next appointment. I have some great availability coming up. Would you like to schedule something?"
        elif "birthday" in user_content:
            mock_content = "Happy Birthday! 🎉 I hope you have an amazing day! To celebrate, I'd love to offer you 20% off your next appointment. This special offer is valid for the next 30 days. Would you like to book something special for your birthday month?"
        elif "no show" in user_content or "fee" in user_content:
            mock_content = "Hi, I noticed you weren't able to make it to your recent appointment. I understand things come up! There's a small no-show fee of $25 that we'll need to settle. Would you like to take care of this now and schedule your next visit?"
        elif "review" in user_content:
            mock_content = "Thank you so much for choosing us for your recent visit! I hope you loved your new look. If you have a moment, it would mean the world to me if you could leave a quick review about your experience. It really helps our small business grow!"
        else:
            mock_content = "Thank you for your message! I'll get back to you soon with a personalized response. Have a great day!"
        
        return {
            "content": mock_content,
            "provider_used": provider_name,
            "model": "mock-model",
            "tokens_used": len(mock_content.split()) * 2,  # Rough estimate
            "cost": 0.0001,  # Minimal mock cost
            "response_time": 0.1,  # Instant mock response
            "is_mock": True
        }


# Global instance
ai_provider_manager = AIProviderManager()