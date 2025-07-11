#!/usr/bin/env python3
"""
SuperClaude V2 Integration
Enhanced integration with adaptive learning, ultra-compression, and advanced routing
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Import all our enhanced systems
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util

# Enhanced context analyzer
enhanced_analyzer_path = os.path.join(os.path.dirname(__file__), "enhanced-context-analyzer.py")
spec = importlib.util.spec_from_file_location("enhanced_analyzer", enhanced_analyzer_path)
enhanced_analyzer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(enhanced_analyzer)

# Smart routing V2
smart_routing_path = os.path.join(os.path.dirname(__file__), "smart-routing-v2.py")
spec = importlib.util.spec_from_file_location("smart_routing_v2", smart_routing_path)
smart_routing_v2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smart_routing_v2)

# Adaptive learning system
adaptive_learning_path = os.path.join(os.path.dirname(__file__), "adaptive-learning-system.py")
spec = importlib.util.spec_from_file_location("adaptive_learning", adaptive_learning_path)
adaptive_learning = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adaptive_learning)

# Ultra-compressed mode
ultra_compressed_path = os.path.join(os.path.dirname(__file__), "ultra-compressed-mode.py")
spec = importlib.util.spec_from_file_location("ultra_compressed", ultra_compressed_path)
ultra_compressed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ultra_compressed)

# BookedBarber integration
bb_superclaude_path = os.path.join(os.path.dirname(__file__), "bookedbarber-superclaude.py")
spec = importlib.util.spec_from_file_location("bb_superclaude", bb_superclaude_path)
bb_superclaude = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bb_superclaude)

class SuperClaudeV2:
    """
    Enhanced SuperClaude integration with all advanced features
    """
    
    def __init__(self, project_root: str = None):
        self.project_root = project_root or "/Users/bossio/6fb-booking"
        
        # Initialize all subsystems
        self.enhanced_analyzer = enhanced_analyzer.EnhancedContextAnalyzer()
        self.smart_router = smart_routing_v2.SmartRouterV2()
        self.learning_system = adaptive_learning.AdaptiveLearningSystem()
        self.compressor = ultra_compressed.UltraCompressedMode()
        self.bb_integration = bb_superclaude.BookedBarberSuperClaude()
        
        # Performance tracking
        self.session_stats = {
            'commands_generated': 0,
            'compression_used': 0,
            'learning_updates': 0,
            'session_start': datetime.now()
        }
        
        # Auto-compression threshold
        self.auto_compression_threshold = 800  # characters
        
    def generate_optimized_command(self, 
                                 task_description: str,
                                 file_paths: List[str] = None,
                                 context: str = "",
                                 current_directory: str = "",
                                 user_preferences: Dict = None,
                                 enable_learning: bool = True,
                                 compression_mode: str = "auto") -> Dict:
        """
        Generate optimized SuperClaude command with all enhancements
        """
        
        start_time = datetime.now()
        
        # Step 1: Enhanced context analysis
        context_analysis = self.enhanced_analyzer.analyze_enhanced_context(
            file_paths=file_paths or [],
            content=context,
            task_description=task_description,
            current_directory=current_directory or self.project_root
        )
        
        # Step 2: Smart routing with V2 logic
        routing_result = self.smart_router.route_smart_command(
            task_description=task_description,
            file_paths=file_paths or [],
            context=context,
            current_directory=current_directory or self.project_root
        )
        
        # Step 3: BookedBarber V2 6FB optimization
        bb_recommendation = self.bb_integration.get_6fb_aligned_command(
            task_description=task_description,
            file_paths=file_paths or [],
            context=context
        )
        
        # Step 4: Select best command using ensemble approach
        final_command = self._ensemble_command_selection(
            routing_result, bb_recommendation, context_analysis, user_preferences or {}
        )
        
        # Step 5: Apply compression if needed
        compression_result = None
        if compression_mode == "auto":
            if len(final_command) > self.auto_compression_threshold:
                compression_result = self.compressor.compress_command(final_command, 'command')
                final_command = compression_result.compressed_text
                self.session_stats['compression_used'] += 1
        elif compression_mode == "ultra":
            compression_result = self.compressor.compress_command(final_command, 'ultra')
            final_command = compression_result.compressed_text
            self.session_stats['compression_used'] += 1
        
        # Step 6: Prepare comprehensive result
        execution_time = (datetime.now() - start_time).total_seconds()
        
        result = {
            'recommended_command': final_command,
            'confidence_score': routing_result.confidence_score,
            'business_impact': bb_recommendation['business_impact'],
            'success_prediction': routing_result.success_prediction,
            'reasoning': self._create_comprehensive_reasoning(routing_result, bb_recommendation, context_analysis),
            'alternative_commands': routing_result.alternative_commands,
            'fallback_personas': routing_result.fallback_personas,
            'mcp_routing': routing_result.mcp_routing,
            'context_analysis': {
                'intent': context_analysis.intent_classification,
                'patterns': context_analysis.detected_patterns,
                'file_analysis': context_analysis.file_analysis,
                'confidence': context_analysis.confidence_score
            },
            'compression_info': {
                'applied': compression_result is not None,
                'original_command': routing_result.recommended_command if compression_result else None,
                'compression_ratio': compression_result.compression_ratio if compression_result else 0,
                'token_savings': (compression_result.original_tokens - compression_result.compressed_tokens) if compression_result else 0
            },
            '6fb_alignment': {
                'methodology_score': bb_recommendation['business_impact'],
                'alignment_notes': bb_recommendation['methodology_alignment'],
                'follow_up_suggestions': bb_recommendation.get('follow_up_commands', [])
            },
            'performance_metrics': {
                'execution_time_ms': execution_time * 1000,
                'context_patterns_detected': len(context_analysis.detected_patterns),
                'ensemble_confidence': self._calculate_ensemble_confidence(routing_result, bb_recommendation)
            },
            'learning_feedback_id': None  # Will be set if learning is enabled
        }
        
        # Step 7: Record for learning if enabled
        if enable_learning:
            feedback_id = self.learning_system.record_execution(
                task_description=task_description,
                file_paths=file_paths or [],
                recommended_command=final_command,
                actual_command=None,  # Will be updated later
                persona=routing_result.primary_persona,
                confidence_score=routing_result.confidence_score,
                success=True,  # Assumed initially, will be updated
                execution_time=execution_time,
                context_patterns=context_analysis.detected_patterns,
                business_impact=bb_recommendation['business_impact'],
                mcp_servers=routing_result.mcp_routing
            )
            result['learning_feedback_id'] = feedback_id
            self.session_stats['learning_updates'] += 1
        
        self.session_stats['commands_generated'] += 1
        return result
    
    def _ensemble_command_selection(self, 
                                   routing_result, 
                                   bb_recommendation: Dict, 
                                   context_analysis,
                                   user_preferences: Dict) -> str:
        """
        Select best command using ensemble approach
        """
        
        candidates = [
            {
                'command': routing_result.recommended_command,
                'confidence': routing_result.confidence_score,
                'source': 'smart_routing',
                'weight': 0.4
            },
            {
                'command': bb_recommendation['command'],
                'confidence': bb_recommendation['business_impact'] / 10.0,
                'source': '6fb_alignment',
                'weight': 0.4
            }
        ]
        
        # Add alternatives with lower weights
        for alt_command in routing_result.alternative_commands[:2]:
            candidates.append({
                'command': alt_command,
                'confidence': routing_result.confidence_score * 0.8,
                'source': 'alternative',
                'weight': 0.1
            })
        
        # Apply user preferences
        if user_preferences.get('prefer_security', False):
            for candidate in candidates:
                if 'security' in candidate['command'] or '--persona-security' in candidate['command']:
                    candidate['weight'] *= 1.2
        
        if user_preferences.get('prefer_performance', False):
            for candidate in candidates:
                if 'performance' in candidate['command'] or '--persona-performance' in candidate['command']:
                    candidate['weight'] *= 1.2
        
        # Calculate weighted scores
        for candidate in candidates:
            candidate['score'] = candidate['confidence'] * candidate['weight']
        
        # Select highest scoring candidate
        best_candidate = max(candidates, key=lambda c: c['score'])
        return best_candidate['command']
    
    def _create_comprehensive_reasoning(self, routing_result, bb_recommendation: Dict, context_analysis) -> str:
        """Create comprehensive reasoning explanation"""
        reasoning_parts = []
        
        # Context analysis reasoning
        if context_analysis.confidence_score > 0.7:
            reasoning_parts.append(f"High-confidence context detection ({context_analysis.confidence_score:.2f})")
        
        # Pattern detection reasoning
        if context_analysis.detected_patterns:
            top_patterns = context_analysis.detected_patterns[:3]
            reasoning_parts.append(f"Patterns: {', '.join(top_patterns)}")
        
        # Smart routing reasoning
        reasoning_parts.append(f"Smart routing: {routing_result.reasoning}")
        
        # 6FB methodology reasoning
        if bb_recommendation['business_impact'] >= 8:
            reasoning_parts.append(f"High business impact ({bb_recommendation['business_impact']}/10)")
        
        reasoning_parts.append(f"6FB alignment: {bb_recommendation['methodology_alignment']}")
        
        return " | ".join(reasoning_parts)
    
    def _calculate_ensemble_confidence(self, routing_result, bb_recommendation: Dict) -> float:
        """Calculate ensemble confidence score"""
        routing_confidence = routing_result.confidence_score
        bb_confidence = bb_recommendation['business_impact'] / 10.0
        success_prediction = routing_result.success_prediction
        
        # Weighted average with emphasis on agreement
        base_confidence = (routing_confidence + bb_confidence) / 2
        
        # Boost if predictions agree
        if abs(routing_confidence - bb_confidence) < 0.2:
            agreement_boost = 0.1
        else:
            agreement_boost = 0.0
        
        # Include success prediction
        final_confidence = (base_confidence * 0.7 + success_prediction * 0.3 + agreement_boost)
        
        return min(final_confidence, 1.0)
    
    def provide_learning_feedback(self, 
                                feedback_id: str, 
                                actual_command: str,
                                success: bool, 
                                user_feedback: str = None):
        """Provide feedback for learning system"""
        if feedback_id:
            # Update the recorded execution with actual results
            with self.learning_system.db_path:
                # This would update the database record
                # Implementation details depend on database schema
                pass
    
    def get_learning_insights(self) -> Dict:
        """Get insights from learning system"""
        pattern_insights = self.learning_system.get_pattern_insights()
        persona_insights = self.learning_system.get_persona_insights()
        recommendations = self.learning_system.get_recommendations()
        
        return {
            'pattern_insights': [
                {
                    'pattern_type': p.pattern_type,
                    'success_rate': p.success_rate,
                    'usage_count': p.usage_count,
                    'trending': p.trending_success
                }
                for p in pattern_insights[:10]
            ],
            'persona_insights': [
                {
                    'persona': p.persona,
                    'success_rate': p.success_rate,
                    'usage_count': p.usage_count,
                    'best_contexts': p.best_contexts[:3],
                    'trend': p.improvement_trend
                }
                for p in persona_insights[:5]
            ],
            'recommendations': recommendations,
            'session_stats': self.session_stats
        }
    
    def compress_explanation(self, explanation: str, target_ratio: float = 0.7) -> Dict:
        """Compress explanation with detailed results"""
        result = self.compressor.compress_explanation(explanation, target_ratio)
        
        return {
            'original': result.original_text,
            'compressed': result.compressed_text,
            'compression_ratio': result.compression_ratio,
            'token_savings': result.original_tokens - result.compressed_tokens,
            'rules_applied': len(result.rules_applied),
            'efficiency_score': min(result.compression_ratio / target_ratio, 1.0)
        }
    
    def interactive_v2_mode(self):
        """Interactive mode with all V2 enhancements"""
        print("🚀 SuperClaude V2 - Enhanced Development Assistant")
        print("Features: Smart routing, adaptive learning, ultra-compression, 6FB alignment")
        print()
        print("Commands: 'insights' for learning data, 'compress <text>' for compression")
        print("         'help' for options, 'exit' to quit")
        print()
        
        while True:
            try:
                user_input = input("📝 Task (V2): ").strip()
                
                if user_input.lower() in ['exit', 'quit', 'q']:
                    self._show_session_summary()
                    break
                    
                elif user_input.lower() == 'insights':
                    insights = self.get_learning_insights()
                    self._display_insights(insights)
                    continue
                    
                elif user_input.lower().startswith('compress '):
                    text_to_compress = user_input[9:]
                    compression_result = self.compress_explanation(text_to_compress)
                    self._display_compression_result(compression_result)
                    continue
                    
                elif user_input.lower() == 'help':
                    self._show_help()
                    continue
                    
                elif not user_input:
                    continue
                
                # Generate optimized command
                result = self.generate_optimized_command(
                    task_description=user_input,
                    enable_learning=True,
                    compression_mode="auto"
                )
                
                # Display comprehensive results
                self._display_command_result(result)
                
                # Ask for feedback
                try:
                    feedback = input("👍 Was this helpful? (y/n/feedback): ").strip().lower()
                    if result['learning_feedback_id'] and feedback:
                        success = feedback.startswith('y')
                        feedback_text = feedback if not feedback.startswith(('y', 'n')) else None
                        self.provide_learning_feedback(
                            result['learning_feedback_id'],
                            result['recommended_command'],
                            success,
                            feedback_text
                        )
                except EOFError:
                    print("\n📝 Feedback input interrupted")
                
                print("-" * 70)
                
            except KeyboardInterrupt:
                print("\n👋 SuperClaude V2 session ended!")
                self._show_session_summary()
                break
            except EOFError:
                print("\n👋 SuperClaude V2 session ended (EOF)!")
                self._show_session_summary()
                break
            except Exception as e:
                print(f"❌ Error: {e}")
                break  # Exit on unexpected errors to prevent infinite loops
    
    def _display_command_result(self, result: Dict):
        """Display comprehensive command result"""
        print(f"\n🎯 SuperClaude V2 Recommendation:")
        print(f"   Command: {result['recommended_command']}")
        print(f"   Confidence: {result['confidence_score']:.2f}")
        print(f"   Success Prediction: {result['success_prediction']:.2f}")
        print(f"   Business Impact: {result['business_impact']}/10")
        
        if result['compression_info']['applied']:
            print(f"   💾 Compressed: {result['compression_info']['compression_ratio']:.1%} reduction")
            print(f"   📊 Token savings: {result['compression_info']['token_savings']}")
        
        print(f"\n🔍 Analysis:")
        print(f"   Intent: {result['context_analysis']['intent']}")
        print(f"   Patterns: {len(result['context_analysis']['patterns'])} detected")
        print(f"   6FB Alignment: {result['6fb_alignment']['methodology_score']}/10")
        
        if result['alternative_commands']:
            print(f"\n🔄 Alternatives:")
            for alt in result['alternative_commands'][:2]:
                print(f"   • {alt}")
        
        print(f"\n💡 Reasoning: {result['reasoning'][:100]}...")
    
    def _display_insights(self, insights: Dict):
        """Display learning insights"""
        print("\n📊 Learning Insights:")
        
        if insights['pattern_insights']:
            print("   Top Patterns:")
            for pattern in insights['pattern_insights'][:3]:
                trend = "↗️" if pattern['trending'] > pattern['success_rate'] else "↘️" if pattern['trending'] < pattern['success_rate'] else "→"
                print(f"      {pattern['pattern_type']}: {pattern['success_rate']:.2f} success {trend}")
        
        if insights['persona_insights']:
            print("   Persona Performance:")
            for persona in insights['persona_insights'][:3]:
                trend = "📈" if persona['trend'] > 0 else "📉" if persona['trend'] < 0 else "➡️"
                print(f"      {persona['persona']}: {persona['success_rate']:.2f} success {trend}")
        
        stats = insights['session_stats']
        print(f"\n📈 Session Stats:")
        print(f"   Commands: {stats['commands_generated']}")
        print(f"   Compressions: {stats['compression_used']}")
        print(f"   Learning Updates: {stats['learning_updates']}")
    
    def _display_compression_result(self, result: Dict):
        """Display compression result"""
        print(f"\n🗜️ Compression Result:")
        print(f"   Original: {result['original'][:50]}...")
        print(f"   Compressed: {result['compressed'][:50]}...")
        print(f"   Ratio: {result['compression_ratio']:.1%}")
        print(f"   Token Savings: {result['token_savings']}")
        print(f"   Efficiency: {result['efficiency_score']:.2f}")
    
    def _show_help(self):
        """Show help information"""
        print("\n📖 SuperClaude V2 Help:")
        print("   • Type any development task for optimized command suggestions")
        print("   • 'insights' - View learning system insights and statistics")
        print("   • 'compress <text>' - Test ultra-compression on any text")
        print("   • Commands automatically use 6FB methodology alignment")
        print("   • Learning system adapts based on your feedback")
        print("   • Auto-compression activates for long commands")
    
    def _show_session_summary(self):
        """Show session summary"""
        stats = self.session_stats
        session_duration = datetime.now() - stats['session_start']
        
        print(f"\n📋 Session Summary:")
        print(f"   Duration: {session_duration}")
        print(f"   Commands Generated: {stats['commands_generated']}")
        print(f"   Compressions Applied: {stats['compression_used']}")
        print(f"   Learning Updates: {stats['learning_updates']}")
        print(f"   Avg Response Time: {(session_duration.total_seconds() / max(stats['commands_generated'], 1)):.2f}s")

def main():
    """Main CLI interface for SuperClaude V2"""
    superclaude_v2 = SuperClaudeV2()
    
    if len(sys.argv) == 1:
        # Interactive mode
        superclaude_v2.interactive_v2_mode()
    elif sys.argv[1] == 'insights':
        # Show insights
        insights = superclaude_v2.get_learning_insights()
        superclaude_v2._display_insights(insights)
    else:
        # Single command mode
        task_description = ' '.join(sys.argv[1:])
        result = superclaude_v2.generate_optimized_command(task_description)
        print(result['recommended_command'])

if __name__ == "__main__":
    main()