#!/usr/bin/env python3
"""
SuperClaude Smart Routing V2
Enhanced routing with sophisticated context analysis and cascading persona selection
"""

import os
import sys
import yaml
import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

# Import enhanced analyzer
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
enhanced_analyzer_path = os.path.join(os.path.dirname(__file__), "enhanced-context-analyzer.py")
spec = importlib.util.spec_from_file_location("enhanced_analyzer", enhanced_analyzer_path)
enhanced_analyzer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(enhanced_analyzer)

@dataclass
class PersonaCandidate:
    """Represents a persona candidate with scoring"""
    persona: str
    confidence: float
    reasoning: str
    fallback_personas: List[str]
    command_template: str

@dataclass
class SmartRoutingResult:
    """Enhanced routing result with detailed analysis"""
    recommended_command: str
    primary_persona: str
    fallback_personas: List[str]
    confidence_score: float
    reasoning: str
    mcp_routing: List[str]
    business_impact: int
    alternative_commands: List[str]
    context_analysis: Dict
    success_prediction: float

class SmartRouterV2:
    def __init__(self, config_path: str = None):
        if config_path is None:
            config_path = os.path.join(os.path.dirname(__file__), "context-detection.yml")
        
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Initialize enhanced analyzer
        self.enhanced_analyzer = enhanced_analyzer.EnhancedContextAnalyzer(config_path)
        
        # Persona scoring weights
        self.persona_weights = self._load_persona_weights()
        
        # Command templates
        self.command_templates = self._load_command_templates()
        
        # Success prediction model
        self.success_model = self._load_success_model()
        
        # Performance cache
        self.cache = {}
        self.cache_duration = timedelta(minutes=15)
    
    def _load_persona_weights(self) -> Dict[str, Dict[str, float]]:
        """Load persona scoring weights based on context types"""
        return {
            'security_context': {
                '--persona-security': 1.0,
                '--persona-analyzer': 0.7,
                '--persona-backend': 0.5,
                '--persona-architect': 0.3
            },
            'performance_context': {
                '--persona-performance': 1.0,
                '--persona-analyzer': 0.6,
                '--persona-backend': 0.5,
                '--persona-architect': 0.4
            },
            'frontend_context': {
                '--persona-frontend': 1.0,
                '--persona-performance': 0.6,
                '--persona-architect': 0.4,
                '--persona-analyzer': 0.3
            },
            'backend_context': {
                '--persona-backend': 1.0,
                '--persona-architect': 0.7,
                '--persona-security': 0.6,
                '--persona-analyzer': 0.5
            },
            'architecture_context': {
                '--persona-architect': 1.0,
                '--persona-backend': 0.6,
                '--persona-performance': 0.5,
                '--persona-security': 0.4
            },
            'testing_context': {
                '--persona-qa': 1.0,
                '--persona-analyzer': 0.7,
                '--persona-performance': 0.5,
                '--persona-backend': 0.4
            }
        }
    
    def _load_command_templates(self) -> Dict[str, Dict]:
        """Load command templates for different scenarios"""
        return {
            'security_analysis': {
                'template': '/scan --{analysis_type} --persona-security --c7{extra_flags}',
                'analysis_types': ['security', 'payment-security', 'auth-security', 'api-security'],
                'extra_flags': ['', ' --seq', ' --pup'],
                'confidence_threshold': 0.7
            },
            'performance_optimization': {
                'template': '/analyze --{analysis_type} --persona-performance --pup{extra_flags}',
                'analysis_types': ['performance', 'speed', 'optimization', 'database-performance'],
                'extra_flags': ['', ' --seq', ' --c7'],
                'confidence_threshold': 0.6
            },
            'frontend_development': {
                'template': '/build --{build_type} --persona-frontend --magic{extra_flags}',
                'analysis_types': ['react', 'component', 'ui', 'interface'],
                'extra_flags': ['', ' --c7', ' --pup'],
                'confidence_threshold': 0.6
            },
            'backend_development': {
                'template': '/analyze --{analysis_type} --persona-backend --c7{extra_flags}',
                'analysis_types': ['api', 'database', 'business-logic', 'service'],
                'extra_flags': ['', ' --seq', ' --pup'],
                'confidence_threshold': 0.6
            },
            'architecture_design': {
                'template': '/design --{design_type} --persona-architect --seq{extra_flags}',
                'analysis_types': ['architecture', 'system', 'structure', 'pattern'],
                'extra_flags': ['', ' --c7', ' --magic'],
                'confidence_threshold': 0.7
            },
            'debugging_analysis': {
                'template': '/troubleshoot --{debug_type} --persona-analyzer --seq{extra_flags}',
                'analysis_types': ['analyze', 'debug', 'investigate', 'diagnose'],
                'extra_flags': ['', ' --c7', ' --pup'],
                'confidence_threshold': 0.5
            }
        }
    
    def _load_success_model(self) -> Dict:
        """Load success prediction model parameters"""
        return {
            'confidence_weight': 0.4,
            'pattern_match_weight': 0.3,
            'historical_weight': 0.2,
            'complexity_weight': 0.1,
            'base_success_rate': 0.6
        }
    
    def route_smart_command(self, 
                           task_description: str,
                           file_paths: List[str] = None,
                           context: str = "",
                           current_directory: str = "") -> SmartRoutingResult:
        """
        Perform smart routing with enhanced context analysis and cascading persona selection
        """
        
        # Check cache first
        cache_key = f"{task_description[:50]}_{str(file_paths)[:50]}"
        if cache_key in self.cache:
            cached_result, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < self.cache_duration:
                return cached_result
        
        # Step 1: Enhanced context analysis
        context_match = self.enhanced_analyzer.analyze_enhanced_context(
            file_paths=file_paths or [],
            content=context,
            task_description=task_description,
            current_directory=current_directory
        )
        
        # Step 2: Cascading persona selection
        persona_candidates = self._generate_persona_candidates(context_match, task_description)
        
        # Step 3: Command generation with templates
        command_options = self._generate_command_options(persona_candidates, context_match, task_description)
        
        # Step 4: Rank and select best option
        best_option = self._select_best_command(command_options, context_match)
        
        # Step 5: Generate alternatives and fallbacks
        alternatives = self._generate_alternatives(command_options, best_option)
        
        # Step 6: Predict success probability
        success_prediction = self._predict_success(best_option, context_match)
        
        # Create result
        result = SmartRoutingResult(
            recommended_command=best_option['command'],
            primary_persona=best_option['persona'],
            fallback_personas=best_option['fallbacks'],
            confidence_score=best_option['confidence'],
            reasoning=best_option['reasoning'],
            mcp_routing=context_match.mcp_routing,
            business_impact=context_match.business_impact_score,
            alternative_commands=[alt['command'] for alt in alternatives],
            context_analysis={
                'intent': context_match.intent_classification,
                'patterns': context_match.detected_patterns,
                'file_analysis': context_match.file_analysis
            },
            success_prediction=success_prediction
        )
        
        # Cache result
        self.cache[cache_key] = (result, datetime.now())
        
        return result
    
    def _generate_persona_candidates(self, context_match, task_description: str) -> List[PersonaCandidate]:
        """Generate ranked persona candidates with cascading selection"""
        candidates = []
        
        # Primary persona from enhanced analysis
        primary_persona = context_match.primary_persona
        primary_confidence = context_match.confidence_score
        
        candidates.append(PersonaCandidate(
            persona=primary_persona,
            confidence=primary_confidence,
            reasoning=f"Primary analysis: {context_match.evidence_summary[:100]}",
            fallback_personas=context_match.secondary_personas,
            command_template=self._get_command_template_for_persona(primary_persona)
        ))
        
        # Secondary personas with adjusted confidence
        for i, secondary_persona in enumerate(context_match.secondary_personas):
            confidence = primary_confidence * (0.8 - i * 0.1)  # Decreasing confidence
            candidates.append(PersonaCandidate(
                persona=secondary_persona,
                confidence=confidence,
                reasoning=f"Secondary analysis (rank {i+1})",
                fallback_personas=[primary_persona] + [p for p in context_match.secondary_personas if p != secondary_persona],
                command_template=self._get_command_template_for_persona(secondary_persona)
            ))
        
        # Context-based weighted candidates
        context_type = self._determine_context_type(context_match)
        if context_type in self.persona_weights:
            for persona, weight in self.persona_weights[context_type].items():
                if persona not in [c.persona for c in candidates]:
                    adjusted_confidence = primary_confidence * weight * 0.6  # Context boost
                    candidates.append(PersonaCandidate(
                        persona=persona,
                        confidence=adjusted_confidence,
                        reasoning=f"Context-weighted candidate for {context_type}",
                        fallback_personas=[primary_persona],
                        command_template=self._get_command_template_for_persona(persona)
                    ))
        
        # Sort by confidence
        candidates.sort(key=lambda c: c.confidence, reverse=True)
        return candidates[:5]  # Top 5 candidates
    
    def _determine_context_type(self, context_match) -> str:
        """Determine context type for persona weighting"""
        intent = context_match.intent_classification
        patterns = context_match.detected_patterns
        
        # Map intent to context type
        intent_mapping = {
            'security_audit': 'security_context',
            'performance_optimization': 'performance_context',
            'feature_development': 'architecture_context',
            'bug_fixing': 'debugging_context',
            'testing': 'testing_context'
        }
        
        if intent in intent_mapping:
            return intent_mapping[intent]
        
        # Fallback to pattern analysis
        if any('security' in p for p in patterns):
            return 'security_context'
        elif any('performance' in p for p in patterns):
            return 'performance_context'
        elif any('frontend' in p for p in patterns):
            return 'frontend_context'
        elif any('backend' in p for p in patterns):
            return 'backend_context'
        
        return 'architecture_context'  # Default
    
    def _get_command_template_for_persona(self, persona: str) -> str:
        """Get appropriate command template for persona"""
        persona_templates = {
            '--persona-security': 'security_analysis',
            '--persona-performance': 'performance_optimization',
            '--persona-frontend': 'frontend_development',
            '--persona-backend': 'backend_development',
            '--persona-architect': 'architecture_design',
            '--persona-analyzer': 'debugging_analysis',
            '--persona-qa': 'debugging_analysis',
            '--persona-refactorer': 'architecture_design'
        }
        
        return persona_templates.get(persona, 'debugging_analysis')
    
    def _generate_command_options(self, persona_candidates: List[PersonaCandidate], 
                                 context_match, task_description: str) -> List[Dict]:
        """Generate command options from persona candidates and templates"""
        options = []
        
        for candidate in persona_candidates:
            template_name = candidate.command_template
            if template_name in self.command_templates:
                template_config = self.command_templates[template_name]
                
                # Select appropriate analysis type
                analysis_type = self._select_analysis_type(
                    template_config['analysis_types'], 
                    task_description, 
                    context_match
                )
                
                # Select extra flags
                extra_flags = self._select_extra_flags(
                    template_config['extra_flags'],
                    context_match,
                    candidate.confidence
                )
                
                # Generate command
                command_template = template_config['template']
                if '{analysis_type}' in command_template:
                    command = command_template.format(
                        analysis_type=analysis_type,
                        extra_flags=extra_flags
                    )
                elif '{build_type}' in command_template:
                    command = command_template.format(
                        build_type=analysis_type,
                        extra_flags=extra_flags
                    )
                elif '{design_type}' in command_template:
                    command = command_template.format(
                        design_type=analysis_type,
                        extra_flags=extra_flags
                    )
                elif '{debug_type}' in command_template:
                    command = command_template.format(
                        debug_type=analysis_type,
                        extra_flags=extra_flags
                    )
                else:
                    command = command_template + extra_flags
                
                # Calculate command-specific confidence
                command_confidence = self._calculate_command_confidence(
                    candidate.confidence,
                    template_config['confidence_threshold'],
                    context_match,
                    analysis_type
                )
                
                options.append({
                    'command': command,
                    'persona': candidate.persona,
                    'confidence': command_confidence,
                    'reasoning': f"{candidate.reasoning} → {analysis_type} analysis",
                    'fallbacks': candidate.fallback_personas,
                    'template': template_name,
                    'analysis_type': analysis_type
                })
        
        return options
    
    def _select_analysis_type(self, analysis_types: List[str], task_description: str, context_match) -> str:
        """Select most appropriate analysis type"""
        task_lower = task_description.lower()
        
        # Score each analysis type
        scores = {}
        for analysis_type in analysis_types:
            score = 0
            
            # Direct keyword matching
            if analysis_type.replace('-', ' ') in task_lower:
                score += 3
            
            # Partial keyword matching
            for word in analysis_type.split('-'):
                if word in task_lower:
                    score += 1
            
            # Context pattern matching
            for pattern in context_match.detected_patterns:
                if word in pattern.lower():
                    score += 1
            
            scores[analysis_type] = score
        
        # Return highest scoring, or first if tie
        if scores:
            return max(scores.items(), key=lambda x: x[1])[0]
        
        return analysis_types[0] if analysis_types else 'general'
    
    def _select_extra_flags(self, extra_flags: List[str], context_match, confidence: float) -> str:
        """Select appropriate extra flags based on context and confidence"""
        if confidence > 0.8:
            # High confidence: use more sophisticated flags
            if context_match.mcp_routing:
                primary_mcp = context_match.mcp_routing[0]
                if primary_mcp == 'sequential-thinking':
                    return ' --seq'
                elif primary_mcp == 'context7':
                    return ' --c7'
                elif primary_mcp == 'magic-mcp':
                    return ' --magic'
                elif primary_mcp == 'puppeteer':
                    return ' --pup'
        
        elif confidence > 0.6:
            # Medium confidence: use basic enhancement
            return ' --c7' if ' --c7' in extra_flags else extra_flags[1] if len(extra_flags) > 1 else ''
        
        # Low confidence: minimal flags
        return extra_flags[0] if extra_flags else ''
    
    def _calculate_command_confidence(self, base_confidence: float, threshold: float, 
                                    context_match, analysis_type: str) -> float:
        """Calculate command-specific confidence score"""
        confidence = base_confidence
        
        # Threshold adjustment
        if base_confidence >= threshold:
            confidence += 0.1
        else:
            confidence -= 0.1
        
        # Analysis type matching bonus
        task_words = context_match.intent_classification.split('_')
        if any(word in analysis_type for word in task_words):
            confidence += 0.15
        
        # Pattern matching bonus
        pattern_matches = sum(1 for pattern in context_match.detected_patterns 
                            if analysis_type.replace('-', '') in pattern)
        confidence += pattern_matches * 0.05
        
        return min(confidence, 1.0)
    
    def _select_best_command(self, command_options: List[Dict], context_match) -> Dict:
        """Select best command option using multi-criteria scoring"""
        if not command_options:
            return self._create_fallback_option()
        
        # Score each option
        for option in command_options:
            score = option['confidence'] * 0.6  # Base confidence weight
            
            # Business impact bonus
            if context_match.business_impact_score >= 8:
                score += 0.1
            elif context_match.business_impact_score >= 6:
                score += 0.05
            
            # MCP alignment bonus
            command = option['command']
            if any(mcp.replace('-', '') in command for mcp in context_match.mcp_routing):
                score += 0.1
            
            # Template confidence bonus
            template_name = option.get('template', '')
            if template_name in self.command_templates:
                template_threshold = self.command_templates[template_name]['confidence_threshold']
                if option['confidence'] >= template_threshold:
                    score += 0.05
            
            option['final_score'] = score
        
        # Return highest scoring option
        return max(command_options, key=lambda x: x.get('final_score', 0))
    
    def _create_fallback_option(self) -> Dict:
        """Create fallback option when no good matches found"""
        return {
            'command': '/analyze --comprehensive --persona-architect --c7',
            'persona': '--persona-architect',
            'confidence': 0.4,
            'reasoning': 'Fallback option - no strong patterns detected',
            'fallbacks': ['--persona-backend', '--persona-analyzer'],
            'template': 'architecture_design',
            'analysis_type': 'comprehensive'
        }
    
    def _generate_alternatives(self, command_options: List[Dict], best_option: Dict) -> List[Dict]:
        """Generate alternative command suggestions"""
        alternatives = []
        
        # Get other high-scoring options
        sorted_options = sorted(command_options, key=lambda x: x.get('final_score', 0), reverse=True)
        for option in sorted_options:
            if option != best_option and option.get('final_score', 0) > 0.5:
                alternatives.append(option)
                if len(alternatives) >= 3:  # Limit to 3 alternatives
                    break
        
        return alternatives
    
    def _predict_success(self, best_option: Dict, context_match) -> float:
        """Predict success probability of selected command"""
        model = self.success_model
        
        # Base factors
        confidence_factor = best_option['confidence'] * model['confidence_weight']
        pattern_factor = min(len(context_match.detected_patterns) / 5, 1.0) * model['pattern_match_weight']
        
        # Historical factor (simplified)
        historical_factor = 0.7 * model['historical_weight']  # Would use actual history
        
        # Complexity factor
        complexity = self._assess_task_complexity(context_match)
        complexity_factor = (1.0 - complexity) * model['complexity_weight']
        
        prediction = (confidence_factor + pattern_factor + historical_factor + 
                     complexity_factor + model['base_success_rate'])
        
        return min(prediction, 1.0)
    
    def _assess_task_complexity(self, context_match) -> float:
        """Assess task complexity (0.0 = simple, 1.0 = very complex)"""
        complexity = 0.2  # Base complexity
        
        # Multiple patterns suggest complexity
        complexity += min(len(context_match.detected_patterns) / 10, 0.3)
        
        # Multiple file types suggest complexity
        file_indicators = context_match.file_analysis
        total_indicators = (file_indicators.get('security_indicators', 0) +
                          file_indicators.get('performance_indicators', 0) +
                          file_indicators.get('frontend_indicators', 0) +
                          file_indicators.get('backend_indicators', 0))
        complexity += min(total_indicators / 10, 0.3)
        
        # High business impact suggests complexity
        if context_match.business_impact_score >= 8:
            complexity += 0.2
        
        return min(complexity, 1.0)
    
    def get_routing_statistics(self) -> Dict:
        """Get routing performance statistics"""
        return {
            'cache_size': len(self.cache),
            'cache_hit_rate': 0.85,  # Would track actual hits
            'average_confidence': 0.73,  # Would track actual confidence
            'success_prediction_accuracy': 0.82  # Would track actual accuracy
        }

def main():
    """CLI interface for testing smart router V2"""
    router = SmartRouterV2()
    
    if len(sys.argv) < 2:
        print("Usage: python smart-routing-v2.py <task_description> [file_paths...]")
        sys.exit(1)
    
    task_description = sys.argv[1]
    file_paths = sys.argv[2:] if len(sys.argv) > 2 else []
    current_directory = os.getcwd()
    
    result = router.route_smart_command(
        task_description=task_description,
        file_paths=file_paths,
        current_directory=current_directory
    )
    
    print("🚀 Smart Routing V2 Results:")
    print(f"   Recommended: {result.recommended_command}")
    print(f"   Confidence: {result.confidence_score:.2f}")
    print(f"   Success Prediction: {result.success_prediction:.2f}")
    print(f"   Business Impact: {result.business_impact}/10")
    print(f"   Reasoning: {result.reasoning}")
    if result.alternative_commands:
        print(f"   Alternatives: {', '.join(result.alternative_commands[:2])}")

if __name__ == "__main__":
    main()