#!/usr/bin/env python3
"""
Ultra-Compressed Mode for SuperClaude
Implements 70% token reduction pipeline with intelligent compression
"""

import os
import re
import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class CompressionRule:
    """Represents a compression rule"""
    pattern: str
    replacement: str
    context: str
    token_savings: int

@dataclass
class CompressionResult:
    """Results of compression operation"""
    original_text: str
    compressed_text: str
    original_tokens: int
    compressed_tokens: int
    compression_ratio: float
    rules_applied: List[str]

class UltraCompressedMode:
    def __init__(self):
        self.compression_rules = self._load_compression_rules()
        self.context_patterns = self._load_context_patterns()
        self.symbol_mappings = self._load_symbol_mappings()
        self.abbreviations = self._load_abbreviations()
        
        # Token estimation (rough approximation)
        self.avg_chars_per_token = 4
        
    def _load_compression_rules(self) -> List[CompressionRule]:
        """Load compression rules for different contexts"""
        return [
            # Command compression
            CompressionRule(
                pattern=r'/analyze --([a-z-]+) --persona-([a-z]+) --([a-z0-9]+)',
                replacement=r'/a --\1 --p-\2 --\3',
                context='command',
                token_savings=3
            ),
            CompressionRule(
                pattern=r'/troubleshoot --([a-z-]+) --persona-([a-z]+)',
                replacement=r'/t --\1 --p-\2',
                context='command',
                token_savings=4
            ),
            CompressionRule(
                pattern=r'/build --([a-z-]+) --persona-([a-z]+) --([a-z0-9]+)',
                replacement=r'/b --\1 --p-\2 --\3',
                context='command',
                token_savings=2
            ),
            CompressionRule(
                pattern=r'/scan --([a-z-]+) --persona-([a-z]+)',
                replacement=r'/s --\1 --p-\2',
                context='command',
                token_savings=2
            ),
            CompressionRule(
                pattern=r'/design --([a-z-]+) --persona-([a-z]+)',
                replacement=r'/d --\1 --p-\2',
                context='command',
                token_savings=3
            ),
            
            # Persona compression
            CompressionRule(
                pattern=r'--persona-frontend',
                replacement=r'--p-fe',
                context='persona',
                token_savings=2
            ),
            CompressionRule(
                pattern=r'--persona-backend',
                replacement=r'--p-be',
                context='persona',
                token_savings=2
            ),
            CompressionRule(
                pattern=r'--persona-security',
                replacement=r'--p-sec',
                context='persona',
                token_savings=2
            ),
            CompressionRule(
                pattern=r'--persona-performance',
                replacement=r'--p-perf',
                context='persona',
                token_savings=3
            ),
            CompressionRule(
                pattern=r'--persona-architect',
                replacement=r'--p-arch',
                context='persona',
                token_savings=2
            ),
            CompressionRule(
                pattern=r'--persona-analyzer',
                replacement=r'--p-anal',
                context='persona',
                token_savings=2
            ),
            
            # MCP server compression
            CompressionRule(
                pattern=r'--sequential-thinking',
                replacement=r'--seq',
                context='mcp',
                token_savings=3
            ),
            CompressionRule(
                pattern=r'--context7',
                replacement=r'--c7',
                context='mcp',
                token_savings=1
            ),
            CompressionRule(
                pattern=r'--magic-mcp',
                replacement=r'--magic',
                context='mcp',
                token_savings=1
            ),
            CompressionRule(
                pattern=r'--puppeteer',
                replacement=r'--pup',
                context='mcp',
                token_savings=2
            ),
            
            # Analysis type compression
            CompressionRule(
                pattern=r'--comprehensive',
                replacement=r'--comp',
                context='analysis',
                token_savings=2
            ),
            CompressionRule(
                pattern=r'--security',
                replacement=r'--sec',
                context='analysis',
                token_savings=1
            ),
            CompressionRule(
                pattern=r'--performance',
                replacement=r'--perf',
                context='analysis',
                token_savings=2
            ),
            CompressionRule(
                pattern=r'--architecture',
                replacement=r'--arch',
                context='analysis',
                token_savings=2
            ),
            CompressionRule(
                pattern=r'--database',
                replacement=r'--db',
                context='analysis',
                token_savings=1
            ),
            CompressionRule(
                pattern=r'--business-logic',
                replacement=r'--biz',
                context='analysis',
                token_savings=2
            )
        ]
    
    def _load_context_patterns(self) -> Dict[str, List[str]]:
        """Load context-specific compression patterns"""
        return {
            'technical_explanation': [
                (r'implementation', 'impl'),
                (r'configuration', 'config'),
                (r'authentication', 'auth'),
                (r'authorization', 'authz'),
                (r'application', 'app'),
                (r'component', 'comp'),
                (r'interface', 'iface'),
                (r'environment', 'env'),
                (r'development', 'dev'),
                (r'production', 'prod'),
                (r'testing', 'test'),
                (r'optimization', 'opt')
            ],
            'business_context': [
                (r'Six Figure Barber', '6FB'),
                (r'BookedBarber', 'BB'),
                (r'methodology', 'method'),
                (r'business logic', 'biz logic'),
                (r'revenue optimization', 'rev opt'),
                (r'client management', 'client mgmt'),
                (r'appointment booking', 'appt booking'),
                (r'payment processing', 'payment proc'),
                (r'analytics dashboard', 'analytics dash')
            ],
            'technical_terms': [
                (r'JavaScript', 'JS'),
                (r'TypeScript', 'TS'),
                (r'React component', 'React comp'),
                (r'API endpoint', 'API ep'),
                (r'database query', 'DB query'),
                (r'frontend component', 'FE comp'),
                (r'backend service', 'BE service'),
                (r'user interface', 'UI'),
                (r'user experience', 'UX')
            ]
        }
    
    def _load_symbol_mappings(self) -> Dict[str, str]:
        """Load symbol mappings for ultra compression"""
        return {
            # Logical operators
            'and': '&',
            'or': '|',
            'not': '!',
            'leads to': '→',
            'results in': '→',
            'because': '∵',
            'therefore': '∴',
            'equals': '=',
            'approximately': '≈',
            'greater than': '>',
            'less than': '<',
            'plus': '+',
            'minus': '-',
            'with': 'w/',
            'without': 'w/o',
            'through': 'thru',
            'between': 'btw',
            'versus': 'vs',
            'regarding': 're:',
            'according to': 'per',
            'for example': 'e.g.',
            'that is': 'i.e.',
            'etc': '&c',
            
            # Technical symbols
            'function': 'fn',
            'variable': 'var',
            'parameter': 'param',
            'argument': 'arg',
            'return': 'ret',
            'import': 'imp',
            'export': 'exp',
            'class': 'cls',
            'method': 'meth',
            'property': 'prop',
            'attribute': 'attr',
            'element': 'elem',
            'document': 'doc',
            'response': 'resp',
            'request': 'req',
            'error': 'err',
            'exception': 'exc',
            'configuration': 'cfg',
            'administration': 'admin'
        }
    
    def _load_abbreviations(self) -> Dict[str, str]:
        """Load common abbreviations"""
        return {
            # Common words
            'information': 'info',
            'application': 'app',
            'development': 'dev',
            'environment': 'env',
            'implementation': 'impl',
            'configuration': 'config',
            'documentation': 'docs',
            'specification': 'spec',
            'requirements': 'reqs',
            'dependencies': 'deps',
            'repository': 'repo',
            'directory': 'dir',
            'framework': 'fw',
            'library': 'lib',
            'package': 'pkg',
            'module': 'mod',
            'component': 'comp',
            'service': 'svc',
            'database': 'db',
            'server': 'srv',
            'client': 'cli',
            'browser': 'br',
            'mobile': 'mob',
            'desktop': 'desk',
            'operating system': 'OS',
            'programming': 'prog',
            'development': 'dev',
            'production': 'prod',
            'testing': 'test',
            'debugging': 'debug',
            'performance': 'perf',
            'optimization': 'opt',
            'security': 'sec',
            'authentication': 'auth',
            'authorization': 'authz',
            'business': 'biz',
            'management': 'mgmt',
            'administration': 'admin',
            'infrastructure': 'infra',
            'technology': 'tech',
            'machine': 'mach',
            'artificial': 'AI',
            'intelligence': 'intel'
        }
    
    def compress_command(self, command: str, context: str = 'general') -> CompressionResult:
        """Compress a SuperClaude command using ultra compression"""
        original_text = command
        compressed_text = command
        rules_applied = []
        
        # Apply command-specific compression rules
        for rule in self.compression_rules:
            if rule.context in ['command', 'persona', 'mcp', 'analysis'] or rule.context == context:
                if re.search(rule.pattern, compressed_text):
                    compressed_text = re.sub(rule.pattern, rule.replacement, compressed_text)
                    rules_applied.append(f"{rule.context}:{rule.pattern}")
        
        # Apply symbol mappings for ultra compression
        if context == 'ultra':
            for word, symbol in self.symbol_mappings.items():
                pattern = r'\b' + re.escape(word) + r'\b'
                if re.search(pattern, compressed_text, re.IGNORECASE):
                    compressed_text = re.sub(pattern, symbol, compressed_text, flags=re.IGNORECASE)
                    rules_applied.append(f"symbol:{word}→{symbol}")
        
        # Calculate compression metrics
        original_tokens = self._estimate_tokens(original_text)
        compressed_tokens = self._estimate_tokens(compressed_text)
        compression_ratio = (original_tokens - compressed_tokens) / original_tokens if original_tokens > 0 else 0
        
        return CompressionResult(
            original_text=original_text,
            compressed_text=compressed_text,
            original_tokens=original_tokens,
            compressed_tokens=compressed_tokens,
            compression_ratio=compression_ratio,
            rules_applied=rules_applied
        )
    
    def compress_explanation(self, explanation: str, target_compression: float = 0.7) -> CompressionResult:
        """Compress explanation text with target compression ratio"""
        original_text = explanation
        compressed_text = explanation
        rules_applied = []
        
        # Step 1: Apply abbreviations
        for full_word, abbrev in self.abbreviations.items():
            pattern = r'\b' + re.escape(full_word) + r'\b'
            if re.search(pattern, compressed_text, re.IGNORECASE):
                compressed_text = re.sub(pattern, abbrev, compressed_text, flags=re.IGNORECASE)
                rules_applied.append(f"abbrev:{full_word}→{abbrev}")
        
        # Step 2: Apply context-specific patterns
        for context, patterns in self.context_patterns.items():
            for pattern, replacement in patterns:
                if re.search(re.escape(pattern), compressed_text, re.IGNORECASE):
                    compressed_text = re.sub(re.escape(pattern), replacement, compressed_text, flags=re.IGNORECASE)
                    rules_applied.append(f"context:{pattern}→{replacement}")
        
        # Step 3: Apply symbol mappings if more compression needed
        current_ratio = self._calculate_compression_ratio(original_text, compressed_text)
        if current_ratio < target_compression:
            for word, symbol in self.symbol_mappings.items():
                if current_ratio >= target_compression:
                    break
                pattern = r'\b' + re.escape(word) + r'\b'
                if re.search(pattern, compressed_text, re.IGNORECASE):
                    compressed_text = re.sub(pattern, symbol, compressed_text, flags=re.IGNORECASE)
                    rules_applied.append(f"symbol:{word}→{symbol}")
                    current_ratio = self._calculate_compression_ratio(original_text, compressed_text)
        
        # Step 4: Advanced compression techniques
        if current_ratio < target_compression:
            compressed_text = self._apply_advanced_compression(compressed_text, rules_applied)
        
        # Calculate final metrics
        original_tokens = self._estimate_tokens(original_text)
        compressed_tokens = self._estimate_tokens(compressed_text)
        compression_ratio = (original_tokens - compressed_tokens) / original_tokens if original_tokens > 0 else 0
        
        return CompressionResult(
            original_text=original_text,
            compressed_text=compressed_text,
            original_tokens=original_tokens,
            compressed_tokens=compressed_tokens,
            compression_ratio=compression_ratio,
            rules_applied=rules_applied
        )
    
    def _apply_advanced_compression(self, text: str, rules_applied: List[str]) -> str:
        """Apply advanced compression techniques"""
        compressed = text
        
        # Remove redundant words
        redundant_patterns = [
            (r'\bthat\b', ''),
            (r'\bwhich\b', ''),
            (r'\bvery\b', ''),
            (r'\bquite\b', ''),
            (r'\breally\b', ''),
            (r'\bjust\b', ''),
            (r'\bactually\b', ''),
            (r'\bbasically\b', ''),
            (r'\bessentially\b', ''),
            (r'\bobviously\b', '')
        ]
        
        for pattern, replacement in redundant_patterns:
            if re.search(pattern, compressed, re.IGNORECASE):
                compressed = re.sub(pattern, replacement, compressed, flags=re.IGNORECASE)
                rules_applied.append(f"redundant:{pattern}")
        
        # Compress common phrases
        phrase_compression = [
            (r'in order to', 'to'),
            (r'due to the fact that', 'because'),
            (r'for the purpose of', 'for'),
            (r'with regard to', 're:'),
            (r'in the event that', 'if'),
            (r'at this point in time', 'now'),
            (r'it is important to note that', 'note:'),
            (r'please be aware that', 'note:'),
            (r'it should be noted that', 'note:'),
            (r'take into consideration', 'consider'),
            (r'make use of', 'use'),
            (r'put into practice', 'implement'),
            (r'come to the conclusion', 'conclude'),
            (r'make a decision', 'decide')
        ]
        
        for phrase, replacement in phrase_compression:
            if re.search(re.escape(phrase), compressed, re.IGNORECASE):
                compressed = re.sub(re.escape(phrase), replacement, compressed, flags=re.IGNORECASE)
                rules_applied.append(f"phrase:{phrase}→{replacement}")
        
        # Clean up extra whitespace
        compressed = re.sub(r'\s+', ' ', compressed).strip()
        
        return compressed
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count (rough approximation)"""
        # Remove whitespace and estimate based on character count
        clean_text = re.sub(r'\s+', '', text)
        return max(1, len(clean_text) // self.avg_chars_per_token)
    
    def _calculate_compression_ratio(self, original: str, compressed: str) -> float:
        """Calculate compression ratio between two texts"""
        original_tokens = self._estimate_tokens(original)
        compressed_tokens = self._estimate_tokens(compressed)
        return (original_tokens - compressed_tokens) / original_tokens if original_tokens > 0 else 0
    
    def auto_compress_mode(self, text: str, context_size_threshold: int = 1000) -> CompressionResult:
        """Automatically determine compression level based on context size"""
        text_length = len(text)
        
        if text_length < context_size_threshold // 3:
            # Short text - minimal compression
            return self.compress_explanation(text, target_compression=0.2)
        elif text_length < context_size_threshold:
            # Medium text - moderate compression
            return self.compress_explanation(text, target_compression=0.5)
        else:
            # Long text - aggressive compression
            return self.compress_explanation(text, target_compression=0.7)
    
    def decompress_text(self, compressed_text: str, rules_applied: List[str]) -> str:
        """Decompress text using applied rules (for debugging)"""
        decompressed = compressed_text
        
        # Reverse the compression rules
        for rule in reversed(rules_applied):
            if ':' in rule:
                rule_type, rule_detail = rule.split(':', 1)
                if '→' in rule_detail:
                    compressed_form, original_form = rule_detail.split('→', 1)
                    # Simple reversal - may not be perfect
                    decompressed = decompressed.replace(compressed_form, original_form)
        
        return decompressed
    
    def get_compression_stats(self) -> Dict:
        """Get compression system statistics"""
        return {
            'total_rules': len(self.compression_rules),
            'symbol_mappings': len(self.symbol_mappings),
            'abbreviations': len(self.abbreviations),
            'context_patterns': sum(len(patterns) for patterns in self.context_patterns.values()),
            'estimated_max_compression': 0.75  # Theoretical maximum
        }

def main():
    """CLI interface for ultra-compressed mode"""
    import sys
    
    compressor = UltraCompressedMode()
    
    if len(sys.argv) < 2:
        print("Usage: python ultra-compressed-mode.py <command|text> [target_compression]")
        print("Examples:")
        print("  python ultra-compressed-mode.py '/analyze --security --persona-security --c7'")
        print("  python ultra-compressed-mode.py 'Long explanation text here' 0.7")
        sys.exit(1)
    
    input_text = sys.argv[1]
    target_compression = float(sys.argv[2]) if len(sys.argv) > 2 else 0.7
    
    # Determine if input is a command or explanation
    if input_text.startswith('/'):
        result = compressor.compress_command(input_text, 'command')
        print(f"🗜️ Command Compression:")
    else:
        result = compressor.compress_explanation(input_text, target_compression)
        print(f"🗜️ Text Compression:")
    
    print(f"   Original: {result.original_text}")
    print(f"   Compressed: {result.compressed_text}")
    print(f"   Tokens: {result.original_tokens} → {result.compressed_tokens}")
    print(f"   Compression: {result.compression_ratio:.1%}")
    print(f"   Rules Applied: {len(result.rules_applied)}")
    
    if len(result.rules_applied) <= 5:
        print(f"   Applied Rules: {', '.join(result.rules_applied)}")

if __name__ == "__main__":
    main()