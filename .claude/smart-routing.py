#!/usr/bin/env python3
"""
SuperClaude Smart Command Routing System for BookedBarber V2
Automatically selects optimal SuperClaude commands and personas based on context
"""

import os
import re
import yaml
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class ContextMatch:
    pattern_type: str
    confidence: float
    persona: str
    commands: List[str]
    mcp_servers: List[str]
    context: str = ""

class SuperClaudeRouter:
    def __init__(self, config_path: str = None):
        if config_path is None:
            config_path = os.path.join(os.path.dirname(__file__), "context-detection.yml")
        
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.cache = {}
        self.cache_duration = timedelta(minutes=30)
        self.performance_log = []
        
    def analyze_context(self, 
                       file_paths: List[str] = None, 
                       content: str = "", 
                       task_description: str = "",
                       current_directory: str = "") -> ContextMatch:
        """
        Analyze context and return the best SuperClaude command configuration
        """
        
        # Check cache first
        cache_key = f"{file_paths}_{content[:100]}_{task_description[:100]}"
        if cache_key in self.cache:
            cached_result, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < self.cache_duration:
                return cached_result
        
        matches = []
        
        # Analyze file patterns
        if file_paths:
            file_matches = self._analyze_file_patterns(file_paths, current_directory)
            matches.extend(file_matches)
        
        # Analyze keywords in content and task description
        text_content = f"{content} {task_description}".lower()
        keyword_matches = self._analyze_keywords(text_content)
        matches.extend(keyword_matches)
        
        # Analyze project-specific patterns
        project_matches = self._analyze_project_patterns(file_paths or [], text_content)
        matches.extend(project_matches)
        
        # Select best match using weighted algorithm
        best_match = self._select_best_match(matches)
        
        # Cache the result
        self.cache[cache_key] = (best_match, datetime.now())
        
        # Log performance data
        self._log_performance(matches, best_match, task_description)
        
        return best_match
    
    def _analyze_file_patterns(self, file_paths: List[str], current_directory: str) -> List[ContextMatch]:
        """Analyze file patterns to determine context"""
        matches = []
        file_patterns = self.config['file_patterns']
        
        for file_path in file_paths:
            file_name = os.path.basename(file_path)
            file_dir = os.path.dirname(file_path)
            
            for pattern_name, pattern_config in file_patterns.items():
                confidence = 0.0
                
                # Check file extensions
                for pattern in pattern_config.get('patterns', []):
                    if self._match_pattern(file_name, pattern):
                        confidence += 0.4
                
                # Check directories
                for dir_pattern in pattern_config.get('directories', []):
                    if dir_pattern in file_dir or dir_pattern in current_directory:
                        confidence += 0.3
                
                # Check specific keywords in filename
                if pattern_name in file_name.lower():
                    confidence += 0.3
                
                if confidence > 0.5:
                    matches.append(ContextMatch(
                        pattern_type=f"file_{pattern_name}",
                        confidence=min(confidence, 1.0),
                        persona=pattern_config.get('default_persona', '--persona-architect'),
                        commands=pattern_config.get('priority_commands', []),
                        mcp_servers=pattern_config.get('mcp_servers', []),
                        context=f"File pattern: {pattern_name}"
                    ))
        
        return matches
    
    def _analyze_keywords(self, text_content: str) -> List[ContextMatch]:
        """Analyze keywords to determine context"""
        matches = []
        keyword_patterns = self.config['keyword_patterns']
        
        for pattern_name, pattern_config in keyword_patterns.items():
            confidence = 0.0
            matched_keywords = []
            
            for keyword in pattern_config.get('keywords', []):
                if keyword in text_content:
                    confidence += 0.2
                    matched_keywords.append(keyword)
            
            if confidence > 0.2:
                matches.append(ContextMatch(
                    pattern_type=f"keyword_{pattern_name}",
                    confidence=min(confidence, 1.0),
                    persona=pattern_config.get('default_persona', '--persona-analyzer'),
                    commands=pattern_config.get('priority_commands', []),
                    mcp_servers=pattern_config.get('mcp_servers', []),
                    context=f"Keywords: {', '.join(matched_keywords)}"
                ))
        
        return matches
    
    def _analyze_project_patterns(self, file_paths: List[str], text_content: str) -> List[ContextMatch]:
        """Analyze BookedBarber V2 specific patterns"""
        matches = []
        project_patterns = self.config['project_patterns']
        
        for pattern_name, pattern_config in project_patterns.items():
            confidence = 0.0
            
            # Check file patterns
            for file_path in file_paths:
                for pattern in pattern_config.get('patterns', []):
                    if self._match_pattern(file_path, pattern):
                        confidence += 0.3
            
            # Check keywords in content
            for pattern in pattern_config.get('patterns', []):
                pattern_word = pattern.replace('*', '').replace('.', '')
                if pattern_word in text_content:
                    confidence += 0.2
            
            # Check directories
            for file_path in file_paths:
                for dir_pattern in pattern_config.get('directories', []):
                    if dir_pattern in file_path:
                        confidence += 0.3
            
            if confidence > 0.3:
                matches.append(ContextMatch(
                    pattern_type=f"project_{pattern_name}",
                    confidence=min(confidence, 1.0),
                    persona=pattern_config.get('default_persona', '--persona-backend'),
                    commands=pattern_config.get('priority_commands', []),
                    mcp_servers=pattern_config.get('mcp_servers', []),
                    context=pattern_config.get('context', f"Project pattern: {pattern_name}")
                ))
        
        return matches
    
    def _match_pattern(self, text: str, pattern: str) -> bool:
        """Match wildcard patterns"""
        regex_pattern = pattern.replace('*', '.*').replace('?', '.')
        return bool(re.search(regex_pattern, text, re.IGNORECASE))
    
    def _select_best_match(self, matches: List[ContextMatch]) -> ContextMatch:
        """Select the best match using weighted algorithm"""
        if not matches:
            # Return default fallback
            return ContextMatch(
                pattern_type="fallback",
                confidence=0.5,
                persona="--persona-architect",
                commands=["/analyze --code --persona-architect"],
                mcp_servers=["context7"],
                context="Default fallback"
            )
        
        # Apply weights from configuration
        weights = self.config['selection_algorithm']['decision_matrix']
        
        weighted_matches = []
        for match in matches:
            # Calculate weighted confidence
            weighted_confidence = match.confidence
            if match.pattern_type.startswith('file_'):
                weighted_confidence *= weights['file_type_weight'] * 4  # Boost file patterns
            elif match.pattern_type.startswith('keyword_'):
                weighted_confidence *= weights['keyword_weight'] * 5  # Boost keyword patterns
            elif match.pattern_type.startswith('project_'):
                weighted_confidence *= weights['project_pattern_weight'] * 3  # Boost project patterns
            
            # Create new match with weighted confidence
            weighted_match = ContextMatch(
                pattern_type=match.pattern_type,
                confidence=weighted_confidence,
                persona=match.persona,
                commands=match.commands,
                mcp_servers=match.mcp_servers,
                context=match.context
            )
            weighted_matches.append(weighted_match)
        
        matches = weighted_matches
        
        # Sort by confidence and return the best
        matches.sort(key=lambda m: m.confidence, reverse=True)
        best_match = matches[0]
        
        # Check confidence threshold
        threshold = self.config['selection_algorithm']['confidence_threshold']
        if best_match.confidence < threshold:
            # Return enhanced fallback with context
            return ContextMatch(
                pattern_type="enhanced_fallback",
                confidence=0.6,
                persona="--persona-architect",
                commands=["/analyze --comprehensive --persona-architect --c7"],
                mcp_servers=["context7", "sequential-thinking"],
                context=f"Low confidence ({best_match.confidence:.2f}), using enhanced fallback"
            )
        
        return best_match
    
    def _log_performance(self, matches: List[ContextMatch], best_match: ContextMatch, task: str):
        """Log performance data for optimization"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'task': task[:100],
            'matches_count': len(matches),
            'best_match_type': best_match.pattern_type,
            'best_match_confidence': best_match.confidence,
            'selected_persona': best_match.persona,
            'selected_mcp_servers': best_match.mcp_servers
        }
        self.performance_log.append(log_entry)
        
        # Keep only last 100 entries
        if len(self.performance_log) > 100:
            self.performance_log = self.performance_log[-100:]
    
    def get_command_recommendation(self, 
                                  file_paths: List[str] = None,
                                  content: str = "",
                                  task_description: str = "",
                                  current_directory: str = "") -> str:
        """
        Get a complete command recommendation
        """
        context_match = self.analyze_context(file_paths, content, task_description, current_directory)
        
        if not context_match.commands:
            return f"/analyze --code {context_match.persona}"
        
        # Select the most appropriate command
        primary_command = context_match.commands[0]
        
        # Add MCP server flags if needed
        if context_match.mcp_servers:
            mcp_flags = []
            for server in context_match.mcp_servers:
                if server == "context7":
                    mcp_flags.append("--c7")
                elif server == "sequential-thinking":
                    mcp_flags.append("--seq")
                elif server == "magic-mcp":
                    mcp_flags.append("--magic")
                elif server == "puppeteer":
                    mcp_flags.append("--pup")
            
            if mcp_flags:
                primary_command += " " + " ".join(mcp_flags)
        
        return primary_command
    
    def get_performance_stats(self) -> Dict:
        """Get performance statistics"""
        if not self.performance_log:
            return {"status": "No data available"}
        
        total_requests = len(self.performance_log)
        avg_confidence = sum(entry['best_match_confidence'] for entry in self.performance_log) / total_requests
        
        pattern_types = {}
        personas = {}
        mcp_usage = {}
        
        for entry in self.performance_log:
            pattern_type = entry['best_match_type']
            pattern_types[pattern_type] = pattern_types.get(pattern_type, 0) + 1
            
            persona = entry['selected_persona']
            personas[persona] = personas.get(persona, 0) + 1
            
            for server in entry['selected_mcp_servers']:
                mcp_usage[server] = mcp_usage.get(server, 0) + 1
        
        return {
            'total_requests': total_requests,
            'average_confidence': avg_confidence,
            'most_common_patterns': sorted(pattern_types.items(), key=lambda x: x[1], reverse=True)[:5],
            'persona_usage': sorted(personas.items(), key=lambda x: x[1], reverse=True),
            'mcp_server_usage': sorted(mcp_usage.items(), key=lambda x: x[1], reverse=True),
            'cache_hit_rate': len(self.cache) / max(total_requests, 1)
        }

def main():
    """CLI interface for testing the router"""
    import sys
    
    router = SuperClaudeRouter()
    
    if len(sys.argv) < 2:
        print("Usage: python smart-routing.py <task_description> [file_paths...]")
        sys.exit(1)
    
    task_description = sys.argv[1]
    file_paths = sys.argv[2:] if len(sys.argv) > 2 else []
    current_directory = os.getcwd()
    
    recommendation = router.get_command_recommendation(
        file_paths=file_paths,
        task_description=task_description,
        current_directory=current_directory
    )
    
    context_match = router.analyze_context(
        file_paths=file_paths,
        task_description=task_description,
        current_directory=current_directory
    )
    
    print(f"🚀 SuperClaude Command Recommendation:")
    print(f"   {recommendation}")
    print()
    print(f"📊 Context Analysis:")
    print(f"   Pattern: {context_match.pattern_type}")
    print(f"   Confidence: {context_match.confidence:.2f}")
    print(f"   Context: {context_match.context}")
    print(f"   Persona: {context_match.persona}")
    print(f"   MCP Servers: {', '.join(context_match.mcp_servers)}")

if __name__ == "__main__":
    main()