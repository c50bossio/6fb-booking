#!/usr/bin/env python3
"""
Enhanced Context Analyzer for SuperClaude
Sophisticated NLP patterns, file content analysis, and compound pattern matching
"""

import os
import re
import ast
import yaml
import json
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass
from pathlib import Path
from collections import defaultdict

@dataclass
class ContextSignal:
    """Represents a context detection signal with confidence scoring"""
    signal_type: str  # 'keyword', 'file_content', 'structure', 'compound'
    source: str
    confidence: float
    evidence: str
    persona_suggestions: List[str]
    command_suggestions: List[str]
    mcp_preferences: List[str]

@dataclass
class EnhancedContextMatch:
    """Enhanced context match with detailed analysis"""
    primary_persona: str
    secondary_personas: List[str]
    confidence_score: float
    evidence_summary: str
    command_recommendations: List[str]
    mcp_routing: List[str]
    business_impact_score: int
    detected_patterns: List[str]
    file_analysis: Dict[str, any]
    intent_classification: str

class EnhancedContextAnalyzer:
    def __init__(self, config_path: str = None):
        if config_path is None:
            config_path = os.path.join(os.path.dirname(__file__), "context-detection.yml")
        
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Advanced pattern matchers
        self.intent_patterns = self._load_intent_patterns()
        self.compound_patterns = self._load_compound_patterns()
        self.content_analyzers = self._load_content_analyzers()
        
        # Learning system
        self.success_history = self._load_success_history()
        self.pattern_weights = self._load_pattern_weights()
        
    def _load_intent_patterns(self) -> Dict[str, List[str]]:
        """Load sophisticated intent classification patterns"""
        return {
            'security_audit': [
                r'(?:security|vulnerability|audit|penetration)\s+(?:test|scan|review|analysis)',
                r'(?:check|analyze|review)\s+(?:for\s+)?(?:security|vulnerabilities)',
                r'(?:stripe|payment|auth)\s+(?:security|audit|review)',
                r'(?:pci|gdpr|compliance)\s+(?:check|validation|audit)'
            ],
            'performance_optimization': [
                r'(?:optimize|improve|speed\s+up|accelerate)\s+(?:performance|speed|loading)',
                r'(?:slow|lag|performance)\s+(?:issue|problem|bug)',
                r'(?:database|query|api)\s+(?:optimization|performance|speed)',
                r'(?:response\s+time|latency|throughput)\s+(?:improvement|optimization)'
            ],
            'feature_development': [
                r'(?:add|create|build|implement)\s+(?:new\s+)?(?:feature|functionality|component)',
                r'(?:develop|code|write)\s+(?:new\s+)?(?:api|endpoint|service)',
                r'(?:design|architect|plan)\s+(?:new\s+)?(?:system|component|feature)'
            ],
            'bug_fixing': [
                r'(?:fix|resolve|debug|troubleshoot)\s+(?:bug|issue|error|problem)',
                r'(?:error|exception|failure|crash)\s+(?:fix|resolution|debugging)',
                r'(?:broken|not\s+working|failing)\s+(?:feature|component|system)'
            ],
            'refactoring': [
                r'(?:refactor|restructure|reorganize|clean\s+up)\s+(?:code|component|system)',
                r'(?:improve|enhance|optimize)\s+(?:code\s+)?(?:quality|structure|design)',
                r'(?:modernize|update|upgrade)\s+(?:codebase|architecture|system)'
            ],
            'testing': [
                r'(?:test|testing|qa|quality\s+assurance)\s+(?:for|of|the)',
                r'(?:write|create|add)\s+(?:tests|test\s+cases|test\s+scenarios)',
                r'(?:e2e|integration|unit)\s+(?:test|testing)',
                r'(?:automation|automated)\s+(?:test|testing)'
            ]
        }
    
    def _load_compound_patterns(self) -> Dict[str, Dict]:
        """Load compound patterns that combine multiple signals"""
        return {
            'secure_payment_development': {
                'file_patterns': ['*payment*', '*stripe*', '*billing*'],
                'keywords': ['security', 'audit', 'pci', 'compliance'],
                'intent': 'security_audit',
                'confidence_boost': 0.3,
                'persona': '--persona-security',
                'commands': ['/scan --payment-security --persona-security --c7']
            },
            'booking_performance_optimization': {
                'file_patterns': ['*booking*', '*appointment*', '*schedule*'],
                'keywords': ['performance', 'optimize', 'slow', 'speed'],
                'intent': 'performance_optimization',
                'confidence_boost': 0.4,
                'persona': '--persona-performance',
                'commands': ['/analyze --booking-performance --persona-performance --pup']
            },
            'ui_component_development': {
                'file_patterns': ['*.tsx', '*.jsx', '*component*'],
                'keywords': ['create', 'build', 'component', 'ui'],
                'intent': 'feature_development',
                'confidence_boost': 0.3,
                'persona': '--persona-frontend',
                'commands': ['/build --react --persona-frontend --magic']
            },
            'api_security_review': {
                'file_patterns': ['*router*', '*api*', '*endpoint*'],
                'keywords': ['security', 'review', 'audit', 'vulnerability'],
                'intent': 'security_audit',
                'confidence_boost': 0.35,
                'persona': '--persona-security',
                'commands': ['/scan --api-security --persona-security --c7 --seq']
            }
        }
    
    def _load_content_analyzers(self) -> Dict[str, callable]:
        """Load file content analysis functions"""
        return {
            '.py': self._analyze_python_content,
            '.tsx': self._analyze_react_content,
            '.ts': self._analyze_typescript_content,
            '.js': self._analyze_javascript_content,
            '.jsx': self._analyze_react_content
        }
    
    def _load_success_history(self) -> Dict:
        """Load historical success data for pattern weighting"""
        history_file = os.path.join(os.path.dirname(__file__), "success_history.json")
        if os.path.exists(history_file):
            with open(history_file, 'r') as f:
                return json.load(f)
        return {"pattern_success": {}, "persona_success": {}, "command_success": {}}
    
    def _load_pattern_weights(self) -> Dict[str, float]:
        """Load dynamic pattern weights based on historical success"""
        weights = {
            'file_extension': 1.0,
            'file_name': 1.2,
            'file_content': 1.5,
            'task_keywords': 1.3,
            'intent_classification': 1.4,
            'compound_patterns': 1.8,
            'historical_success': 0.8
        }
        
        # Adjust weights based on success history
        history = self.success_history
        if 'pattern_success' in history:
            for pattern, success_rate in history['pattern_success'].items():
                if pattern in weights:
                    weights[pattern] *= (0.5 + success_rate)  # Scale by success rate
        
        return weights
    
    def analyze_enhanced_context(self, 
                                file_paths: List[str] = None,
                                content: str = "",
                                task_description: str = "",
                                current_directory: str = "") -> EnhancedContextMatch:
        """
        Perform enhanced context analysis with sophisticated pattern matching
        """
        
        signals = []
        
        # 1. Analyze files with content inspection
        if file_paths:
            file_signals = self._analyze_files_deeply(file_paths, current_directory)
            signals.extend(file_signals)
        
        # 2. Intent classification from task description
        intent_signals = self._classify_task_intent(task_description)
        signals.extend(intent_signals)
        
        # 3. Compound pattern detection
        compound_signals = self._detect_compound_patterns(file_paths or [], task_description, content)
        signals.extend(compound_signals)
        
        # 4. Historical pattern matching
        historical_signals = self._apply_historical_patterns(task_description, file_paths or [])
        signals.extend(historical_signals)
        
        # 5. Aggregate and rank signals
        match_result = self._aggregate_signals(signals, task_description)
        
        return match_result
    
    def _analyze_files_deeply(self, file_paths: List[str], current_directory: str) -> List[ContextSignal]:
        """Deeply analyze file content for context clues"""
        signals = []
        
        for file_path in file_paths:
            full_path = os.path.join(current_directory, file_path) if not os.path.isabs(file_path) else file_path
            
            # File extension analysis
            ext = Path(file_path).suffix
            if ext in self.content_analyzers:
                try:
                    if os.path.exists(full_path):
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                            file_content = f.read()
                        
                        content_signals = self.content_analyzers[ext](file_content, file_path)
                        signals.extend(content_signals)
                except Exception as e:
                    # Fallback to filename analysis
                    filename_signals = self._analyze_filename(file_path)
                    signals.extend(filename_signals)
            else:
                # Fallback to filename analysis
                filename_signals = self._analyze_filename(file_path)
                signals.extend(filename_signals)
        
        return signals
    
    def _analyze_python_content(self, content: str, file_path: str) -> List[ContextSignal]:
        """Analyze Python file content for context signals"""
        signals = []
        
        try:
            # Parse AST for sophisticated analysis
            tree = ast.parse(content)
            
            # Check for specific patterns
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_name = node.name.lower()
                    
                    # Security-related functions
                    if any(term in func_name for term in ['auth', 'login', 'token', 'encrypt', 'hash']):
                        signals.append(ContextSignal(
                            signal_type='file_content',
                            source=f"{file_path}:function:{func_name}",
                            confidence=0.8,
                            evidence=f"Security-related function: {func_name}",
                            persona_suggestions=['--persona-security'],
                            command_suggestions=['/scan --security --persona-security'],
                            mcp_preferences=['context7', 'sequential-thinking']
                        ))
                    
                    # Performance-related functions
                    if any(term in func_name for term in ['optimize', 'cache', 'performance', 'speed']):
                        signals.append(ContextSignal(
                            signal_type='file_content',
                            source=f"{file_path}:function:{func_name}",
                            confidence=0.7,
                            evidence=f"Performance-related function: {func_name}",
                            persona_suggestions=['--persona-performance'],
                            command_suggestions=['/analyze --performance --persona-performance'],
                            mcp_preferences=['puppeteer', 'sequential-thinking']
                        ))
                
                # Check imports for technology stack
                elif isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                    module_name = ""
                    if isinstance(node, ast.Import):
                        module_name = node.names[0].name if node.names else ""
                    elif isinstance(node, ast.ImportFrom):
                        module_name = node.module or ""
                    
                    # FastAPI/API related
                    if any(term in module_name.lower() for term in ['fastapi', 'flask', 'django', 'router']):
                        signals.append(ContextSignal(
                            signal_type='file_content',
                            source=f"{file_path}:import:{module_name}",
                            confidence=0.6,
                            evidence=f"API framework import: {module_name}",
                            persona_suggestions=['--persona-backend'],
                            command_suggestions=['/analyze --api --persona-backend'],
                            mcp_preferences=['context7']
                        ))
                    
                    # Database related
                    if any(term in module_name.lower() for term in ['sqlalchemy', 'database', 'db', 'postgres']):
                        signals.append(ContextSignal(
                            signal_type='file_content',
                            source=f"{file_path}:import:{module_name}",
                            confidence=0.6,
                            evidence=f"Database import: {module_name}",
                            persona_suggestions=['--persona-backend'],
                            command_suggestions=['/analyze --database --persona-backend'],
                            mcp_preferences=['context7', 'sequential-thinking']
                        ))
        
        except SyntaxError:
            # File has syntax errors, use regex patterns instead
            signals.extend(self._analyze_content_with_regex(content, file_path, 'python'))
        
        return signals
    
    def _analyze_react_content(self, content: str, file_path: str) -> List[ContextSignal]:
        """Analyze React/TSX file content for context signals"""
        signals = []
        
        # Check for React patterns
        react_patterns = [
            (r'useState|useEffect|useContext', 'React hooks usage', '--persona-frontend', 0.7),
            (r'interface\s+\w+Props', 'TypeScript props interface', '--persona-frontend', 0.6),
            (r'styled-components|@emotion|tailwind', 'Styling framework', '--persona-frontend', 0.5),
            (r'useAuth|useUser|auth', 'Authentication logic', '--persona-security', 0.8),
            (r'performance|memo|useMemo|useCallback', 'Performance optimization', '--persona-performance', 0.7),
            (r'test|expect|describe|it\(', 'Testing code', '--persona-qa', 0.8)
        ]
        
        for pattern, evidence, persona, confidence in react_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                signals.append(ContextSignal(
                    signal_type='file_content',
                    source=f"{file_path}:pattern:{pattern}",
                    confidence=confidence,
                    evidence=evidence,
                    persona_suggestions=[persona],
                    command_suggestions=[f'/build --react {persona}' if persona == '--persona-frontend' else f'/analyze --code {persona}'],
                    mcp_preferences=['magic-mcp' if persona == '--persona-frontend' else 'context7']
                ))
        
        return signals
    
    def _analyze_typescript_content(self, content: str, file_path: str) -> List[ContextSignal]:
        """Analyze TypeScript file content for context signals"""
        signals = []
        
        # TypeScript-specific patterns
        ts_patterns = [
            (r'interface|type\s+\w+\s*=', 'Type definitions', '--persona-backend', 0.6),
            (r'async\s+function|await', 'Async operations', '--persona-backend', 0.5),
            (r'export\s+class|export\s+interface', 'Module exports', '--persona-architect', 0.4),
            (r'@\w+\(', 'Decorators usage', '--persona-backend', 0.6)
        ]
        
        for pattern, evidence, persona, confidence in ts_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                signals.append(ContextSignal(
                    signal_type='file_content',
                    source=f"{file_path}:pattern:{pattern}",
                    confidence=confidence,
                    evidence=evidence,
                    persona_suggestions=[persona],
                    command_suggestions=[f'/analyze --code {persona}'],
                    mcp_preferences=['context7']
                ))
        
        return signals
    
    def _analyze_javascript_content(self, content: str, file_path: str) -> List[ContextSignal]:
        """Analyze JavaScript file content for context signals"""
        return self._analyze_content_with_regex(content, file_path, 'javascript')
    
    def _analyze_content_with_regex(self, content: str, file_path: str, language: str) -> List[ContextSignal]:
        """Fallback regex-based content analysis"""
        signals = []
        
        # Generic patterns across languages
        generic_patterns = [
            (r'(?:password|token|secret|key|auth)', 'Security-related content', '--persona-security', 0.7),
            (r'(?:performance|optimize|cache|speed)', 'Performance-related content', '--persona-performance', 0.6),
            (r'(?:test|spec|mock|assert)', 'Testing-related content', '--persona-qa', 0.8),
            (r'(?:component|render|props|state)', 'UI component content', '--persona-frontend', 0.6),
            (r'(?:api|endpoint|route|http)', 'API-related content', '--persona-backend', 0.6)
        ]
        
        for pattern, evidence, persona, confidence in generic_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                signals.append(ContextSignal(
                    signal_type='file_content',
                    source=f"{file_path}:regex:{pattern}",
                    confidence=confidence,
                    evidence=f"{evidence}: {matches[:3]}",  # Show first 3 matches
                    persona_suggestions=[persona],
                    command_suggestions=[f'/analyze --code {persona}'],
                    mcp_preferences=['context7']
                ))
        
        return signals
    
    def _analyze_filename(self, file_path: str) -> List[ContextSignal]:
        """Analyze filename for context clues"""
        signals = []
        filename = os.path.basename(file_path).lower()
        
        # File name patterns
        name_patterns = [
            (r'auth|login|security', 'Security-related file', '--persona-security', 0.6),
            (r'test|spec', 'Test file', '--persona-qa', 0.8),
            (r'component|ui|view', 'UI component file', '--persona-frontend', 0.7),
            (r'api|router|endpoint', 'API file', '--persona-backend', 0.7),
            (r'service|business|logic', 'Business logic file', '--persona-architect', 0.6),
            (r'performance|optimization', 'Performance file', '--persona-performance', 0.7)
        ]
        
        for pattern, evidence, persona, confidence in name_patterns:
            if re.search(pattern, filename):
                signals.append(ContextSignal(
                    signal_type='file_name',
                    source=f"filename:{filename}",
                    confidence=confidence,
                    evidence=evidence,
                    persona_suggestions=[persona],
                    command_suggestions=[f'/analyze --code {persona}'],
                    mcp_preferences=['context7']
                ))
        
        return signals
    
    def _classify_task_intent(self, task_description: str) -> List[ContextSignal]:
        """Classify task intent using sophisticated patterns"""
        signals = []
        task_lower = task_description.lower()
        
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, task_lower):
                    confidence = 0.8  # High confidence for intent classification
                    
                    # Map intent to persona and commands
                    intent_mapping = {
                        'security_audit': ('--persona-security', ['/scan --security --persona-security --c7']),
                        'performance_optimization': ('--persona-performance', ['/analyze --performance --persona-performance --pup']),
                        'feature_development': ('--persona-architect', ['/design --feature --persona-architect --seq']),
                        'bug_fixing': ('--persona-analyzer', ['/troubleshoot --analyze --persona-analyzer --seq']),
                        'refactoring': ('--persona-refactorer', ['/improve --refactor --persona-refactorer --c7']),
                        'testing': ('--persona-qa', ['/test --comprehensive --persona-qa --pup'])
                    }
                    
                    if intent in intent_mapping:
                        persona, commands = intent_mapping[intent]
                        signals.append(ContextSignal(
                            signal_type='intent_classification',
                            source=f"intent:{intent}",
                            confidence=confidence,
                            evidence=f"Intent classification: {intent}",
                            persona_suggestions=[persona],
                            command_suggestions=commands,
                            mcp_preferences=['sequential-thinking', 'context7']
                        ))
        
        return signals
    
    def _detect_compound_patterns(self, file_paths: List[str], task_description: str, content: str) -> List[ContextSignal]:
        """Detect compound patterns that combine multiple signals"""
        signals = []
        
        for pattern_name, pattern_config in self.compound_patterns.items():
            confidence = 0.0
            evidence_parts = []
            
            # Check file patterns
            file_pattern_matches = 0
            for file_path in file_paths:
                for file_pattern in pattern_config.get('file_patterns', []):
                    if self._match_pattern(file_path, file_pattern):
                        file_pattern_matches += 1
                        evidence_parts.append(f"file:{file_path}")
            
            if file_pattern_matches > 0:
                confidence += 0.3
            
            # Check keywords
            keyword_matches = 0
            combined_text = f"{task_description} {content}".lower()
            for keyword in pattern_config.get('keywords', []):
                if keyword in combined_text:
                    keyword_matches += 1
                    evidence_parts.append(f"keyword:{keyword}")
            
            if keyword_matches > 0:
                confidence += 0.4
            
            # Check intent
            if pattern_config.get('intent') in combined_text:
                confidence += 0.3
                evidence_parts.append(f"intent:{pattern_config['intent']}")
            
            # Apply confidence boost
            if confidence > 0.5:  # Threshold for compound pattern
                confidence += pattern_config.get('confidence_boost', 0.0)
                
                signals.append(ContextSignal(
                    signal_type='compound_pattern',
                    source=f"compound:{pattern_name}",
                    confidence=min(confidence, 1.0),
                    evidence=f"Compound pattern: {', '.join(evidence_parts)}",
                    persona_suggestions=[pattern_config.get('persona', '--persona-architect')],
                    command_suggestions=pattern_config.get('commands', ['/analyze --code']),
                    mcp_preferences=['context7', 'sequential-thinking']
                ))
        
        return signals
    
    def _apply_historical_patterns(self, task_description: str, file_paths: List[str]) -> List[ContextSignal]:
        """Apply historical success patterns for learning"""
        signals = []
        
        # This would be expanded with actual machine learning in production
        # For now, implement simple pattern matching based on success history
        
        history = self.success_history
        if 'command_success' in history:
            for command, success_rate in history['command_success'].items():
                if success_rate > 0.7:  # High success rate
                    # Check if current context is similar to successful past contexts
                    # This is a simplified implementation
                    task_similarity = self._calculate_task_similarity(task_description, command)
                    if task_similarity > 0.6:
                        signals.append(ContextSignal(
                            signal_type='historical_pattern',
                            source=f"history:{command}",
                            confidence=success_rate * task_similarity,
                            evidence=f"Historical success pattern: {command}",
                            persona_suggestions=[self._extract_persona_from_command(command)],
                            command_suggestions=[command],
                            mcp_preferences=['context7']
                        ))
        
        return signals
    
    def _calculate_task_similarity(self, task_description: str, successful_command: str) -> float:
        """Calculate similarity between current task and historically successful pattern"""
        # Simplified similarity calculation
        # In production, this would use more sophisticated NLP techniques
        
        task_words = set(task_description.lower().split())
        command_words = set(successful_command.lower().split())
        
        if not task_words or not command_words:
            return 0.0
        
        intersection = task_words.intersection(command_words)
        union = task_words.union(command_words)
        
        return len(intersection) / len(union) if union else 0.0
    
    def _extract_persona_from_command(self, command: str) -> str:
        """Extract persona from command string"""
        personas = ['--persona-security', '--persona-performance', '--persona-frontend', 
                   '--persona-backend', '--persona-architect', '--persona-analyzer', 
                   '--persona-qa', '--persona-refactorer']
        
        for persona in personas:
            if persona in command:
                return persona
        
        return '--persona-architect'  # Default
    
    def _aggregate_signals(self, signals: List[ContextSignal], task_description: str) -> EnhancedContextMatch:
        """Aggregate all signals into final context match"""
        
        if not signals:
            return self._create_fallback_match(task_description)
        
        # Weight signals by type and historical success
        weighted_signals = []
        for signal in signals:
            weight = self.pattern_weights.get(signal.signal_type, 1.0)
            weighted_confidence = signal.confidence * weight
            weighted_signals.append((signal, weighted_confidence))
        
        # Sort by weighted confidence
        weighted_signals.sort(key=lambda x: x[1], reverse=True)
        
        # Aggregate persona suggestions
        persona_votes = defaultdict(float)
        command_suggestions = []
        mcp_preferences = []
        evidence_parts = []
        detected_patterns = []
        
        for signal, weighted_confidence in weighted_signals:
            # Vote for personas
            for persona in signal.persona_suggestions:
                persona_votes[persona] += weighted_confidence
            
            # Collect commands and MCP preferences
            command_suggestions.extend(signal.command_suggestions)
            mcp_preferences.extend(signal.mcp_preferences)
            evidence_parts.append(signal.evidence)
            detected_patterns.append(f"{signal.signal_type}:{signal.source}")
        
        # Select primary and secondary personas
        sorted_personas = sorted(persona_votes.items(), key=lambda x: x[1], reverse=True)
        primary_persona = sorted_personas[0][0] if sorted_personas else '--persona-architect'
        secondary_personas = [p[0] for p in sorted_personas[1:3]]  # Top 2 secondary
        
        # Calculate overall confidence
        overall_confidence = sum(ws[1] for ws in weighted_signals[:3]) / 3 if weighted_signals else 0.5
        
        # Deduplicate and prioritize suggestions
        unique_commands = list(dict.fromkeys(command_suggestions))[:3]
        unique_mcp = list(dict.fromkeys(mcp_preferences))[:3]
        
        return EnhancedContextMatch(
            primary_persona=primary_persona,
            secondary_personas=secondary_personas,
            confidence_score=min(overall_confidence, 1.0),
            evidence_summary="; ".join(evidence_parts[:5]),
            command_recommendations=unique_commands,
            mcp_routing=unique_mcp,
            business_impact_score=self._calculate_business_impact(task_description, detected_patterns),
            detected_patterns=detected_patterns[:10],
            file_analysis=self._summarize_file_analysis(signals),
            intent_classification=self._determine_primary_intent(signals)
        )
    
    def _create_fallback_match(self, task_description: str) -> EnhancedContextMatch:
        """Create fallback match when no signals are detected"""
        return EnhancedContextMatch(
            primary_persona='--persona-architect',
            secondary_personas=['--persona-backend'],
            confidence_score=0.4,
            evidence_summary="No specific patterns detected, using fallback",
            command_recommendations=['/analyze --comprehensive --persona-architect --c7'],
            mcp_routing=['context7'],
            business_impact_score=5,
            detected_patterns=['fallback'],
            file_analysis={},
            intent_classification='general_development'
        )
    
    def _calculate_business_impact(self, task_description: str, patterns: List[str]) -> int:
        """Calculate business impact score 1-10"""
        score = 5  # Base score
        
        task_lower = task_description.lower()
        
        # High impact indicators
        high_impact = ['booking', 'payment', 'revenue', 'stripe', 'money', 'client']
        medium_impact = ['analytics', 'performance', 'security', 'integration']
        low_impact = ['documentation', 'test', 'refactor', 'cleanup']
        
        for term in high_impact:
            if term in task_lower:
                score += 3
        
        for term in medium_impact:
            if term in task_lower:
                score += 2
        
        for term in low_impact:
            if term in task_lower:
                score -= 1
        
        # Pattern-based adjustments
        if any('security' in p for p in patterns):
            score += 2
        if any('performance' in p for p in patterns):
            score += 2
        if any('compound' in p for p in patterns):
            score += 1
        
        return max(1, min(10, score))
    
    def _summarize_file_analysis(self, signals: List[ContextSignal]) -> Dict[str, any]:
        """Summarize file analysis results"""
        file_analysis = {
            'total_files_analyzed': len(set(s.source.split(':')[0] for s in signals if ':' in s.source)),
            'file_types_detected': [],
            'security_indicators': 0,
            'performance_indicators': 0,
            'frontend_indicators': 0,
            'backend_indicators': 0
        }
        
        for signal in signals:
            if 'security' in signal.evidence.lower():
                file_analysis['security_indicators'] += 1
            if 'performance' in signal.evidence.lower():
                file_analysis['performance_indicators'] += 1
            if 'frontend' in signal.evidence.lower() or 'react' in signal.evidence.lower():
                file_analysis['frontend_indicators'] += 1
            if 'backend' in signal.evidence.lower() or 'api' in signal.evidence.lower():
                file_analysis['backend_indicators'] += 1
        
        return file_analysis
    
    def _determine_primary_intent(self, signals: List[ContextSignal]) -> str:
        """Determine primary intent from signals"""
        intent_votes = defaultdict(int)
        
        for signal in signals:
            if signal.signal_type == 'intent_classification':
                intent = signal.source.split(':')[1] if ':' in signal.source else 'general'
                intent_votes[intent] += 1
        
        if intent_votes:
            return max(intent_votes.items(), key=lambda x: x[1])[0]
        
        return 'general_development'
    
    def _match_pattern(self, text: str, pattern: str) -> bool:
        """Match wildcard patterns"""
        regex_pattern = pattern.replace('*', '.*').replace('?', '.')
        return bool(re.search(regex_pattern, text, re.IGNORECASE))
    
    def update_success_history(self, context_match: EnhancedContextMatch, success: bool):
        """Update success history for learning"""
        if success:
            # Update pattern success rates
            for pattern in context_match.detected_patterns:
                if pattern not in self.success_history['pattern_success']:
                    self.success_history['pattern_success'][pattern] = 0.5
                else:
                    current = self.success_history['pattern_success'][pattern]
                    self.success_history['pattern_success'][pattern] = (current + 1.0) / 2
            
            # Update persona success rates
            persona = context_match.primary_persona
            if persona not in self.success_history['persona_success']:
                self.success_history['persona_success'][persona] = 0.5
            else:
                current = self.success_history['persona_success'][persona]
                self.success_history['persona_success'][persona] = (current + 1.0) / 2
        
        # Save updated history
        history_file = os.path.join(os.path.dirname(__file__), "success_history.json")
        with open(history_file, 'w') as f:
            json.dump(self.success_history, f, indent=2)

def main():
    """CLI interface for testing enhanced analyzer"""
    import sys
    
    analyzer = EnhancedContextAnalyzer()
    
    if len(sys.argv) < 2:
        print("Usage: python enhanced-context-analyzer.py <task_description> [file_paths...]")
        sys.exit(1)
    
    task_description = sys.argv[1]
    file_paths = sys.argv[2:] if len(sys.argv) > 2 else []
    current_directory = os.getcwd()
    
    result = analyzer.analyze_enhanced_context(
        file_paths=file_paths,
        task_description=task_description,
        current_directory=current_directory
    )
    
    print("🔍 Enhanced Context Analysis Results:")
    print(f"   Primary Persona: {result.primary_persona}")
    print(f"   Confidence: {result.confidence_score:.2f}")
    print(f"   Intent: {result.intent_classification}")
    print(f"   Business Impact: {result.business_impact_score}/10")
    print(f"   Command: {result.command_recommendations[0] if result.command_recommendations else 'N/A'}")
    print(f"   Evidence: {result.evidence_summary[:100]}...")

if __name__ == "__main__":
    main()