#!/usr/bin/env python3

"""
Database Query Duplication Detection Hook for Claude Code
Prevents duplicate queries by analyzing semantic similarity and launching
a separate Claude Code instance for query review and refactoring suggestions.

Created: 2025-07-28
"""

import os
import sys
import json
import re
import subprocess
import logging
import hashlib
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime
from dataclasses import dataclass, asdict
from collections import defaultdict

@dataclass
class QueryInfo:
    """Structured information about a database query"""
    file_path: str
    function_name: str
    query_type: str  # SELECT, INSERT, UPDATE, DELETE, etc.
    tables: List[str]
    columns: List[str]
    where_conditions: List[str]
    joins: List[str]
    parameters: List[str]
    return_structure: str
    query_text: str
    line_number: int
    query_format: str  # raw_sql, knex, prisma, sqlalchemy, etc.
    purpose: str  # inferred purpose description

@dataclass
class DuplicationReport:
    """Report of query duplications found"""
    duplicates: List[Dict[str, Any]]
    similar_queries: List[Dict[str, Any]]
    parameterization_opportunities: List[Dict[str, Any]]
    recommendations: List[str]
    summary: str

class QueryParser:
    """Parse queries from various formats and frameworks"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    def parse_file(self, file_path: Path) -> List[QueryInfo]:
        """Parse all queries from a file"""
        queries = []
        
        try:
            content = file_path.read_text(encoding='utf-8')
            file_extension = file_path.suffix.lower()
            
            # Determine parsing strategy based on file content and extension
            if self._is_raw_sql_file(file_path, content):
                queries.extend(self._parse_raw_sql(file_path, content))
            elif self._is_prisma_file(file_path, content):
                queries.extend(self._parse_prisma_queries(file_path, content))
            elif self._is_knex_file(file_path, content):
                queries.extend(self._parse_knex_queries(file_path, content))
            elif self._is_sqlalchemy_file(file_path, content):
                queries.extend(self._parse_sqlalchemy_queries(file_path, content))
            elif self._is_sequelize_file(file_path, content):
                queries.extend(self._parse_sequelize_queries(file_path, content))
            else:
                # Generic query detection
                queries.extend(self._parse_generic_queries(file_path, content))
                
        except Exception as e:
            self.logger.error(f"Error parsing {file_path}: {e}")
            
        return queries
    
    def _is_raw_sql_file(self, file_path: Path, content: str) -> bool:
        """Check if file contains raw SQL"""
        return (
            file_path.suffix.lower() in ['.sql', '.mysql', '.pgsql', '.sqlite'] or
            'CREATE TABLE' in content.upper() or
            'SELECT ' in content.upper() and ('FROM ' in content.upper())
        )
    
    def _is_prisma_file(self, file_path: Path, content: str) -> bool:
        """Check if file uses Prisma ORM"""
        return (
            'prisma' in content.lower() and
            ('findMany' in content or 'findUnique' in content or 'create' in content)
        )
    
    def _is_knex_file(self, file_path: Path, content: str) -> bool:
        """Check if file uses Knex.js query builder"""
        return (
            'knex' in content.lower() or
            '.select(' in content or '.where(' in content or '.join(' in content
        )
    
    def _is_sqlalchemy_file(self, file_path: Path, content: str) -> bool:
        """Check if file uses SQLAlchemy"""
        return (
            'sqlalchemy' in content.lower() or
            'session.query' in content.lower() or
            'db.session' in content.lower()
        )
    
    def _is_sequelize_file(self, file_path: Path, content: str) -> bool:
        """Check if file uses Sequelize ORM"""
        return (
            'sequelize' in content.lower() and
            ('findAll' in content or 'findOne' in content or 'create' in content)
        )
    
    def _parse_raw_sql(self, file_path: Path, content: str) -> List[QueryInfo]:
        """Parse raw SQL queries"""
        queries = []
        
        # Split by common SQL statement terminators
        statements = re.split(r';\s*(?=\n|$)', content)
        
        for i, statement in enumerate(statements):
            statement = statement.strip()
            if not statement:
                continue
                
            query_info = self._analyze_sql_statement(file_path, statement, i + 1, 'raw_sql')
            if query_info:
                queries.append(query_info)
                
        return queries
    
    def _parse_prisma_queries(self, file_path: Path, content: str) -> List[QueryInfo]:
        """Parse Prisma ORM queries"""
        queries = []
        
        # Find Prisma query patterns
        prisma_patterns = [
            r'(\w+)\.findMany\s*\(\s*({[^}]*})\s*\)',
            r'(\w+)\.findUnique\s*\(\s*({[^}]*})\s*\)',
            r'(\w+)\.findFirst\s*\(\s*({[^}]*})\s*\)',
            r'(\w+)\.create\s*\(\s*({[^}]*})\s*\)',
            r'(\w+)\.update\s*\(\s*({[^}]*})\s*\)',
            r'(\w+)\.delete\s*\(\s*({[^}]*})\s*\)',
        ]
        
        for pattern in prisma_patterns:
            matches = re.finditer(pattern, content, re.DOTALL)
            for match in matches:
                line_number = content[:match.start()].count('\n') + 1
                model_name = match.group(1)
                query_options = match.group(2)
                
                query_info = self._analyze_prisma_query(
                    file_path, model_name, query_options, line_number, match.group(0)
                )
                queries.append(query_info)
                
        return queries
    
    def _parse_knex_queries(self, file_path: Path, content: str) -> List[QueryInfo]:
        """Parse Knex.js query builder queries"""
        queries = []
        
        # Find Knex query chains
        knex_pattern = r'knex(?:\([^)]*\))?(?:\.[a-zA-Z]+\([^)]*\))*'
        matches = re.finditer(knex_pattern, content)
        
        for match in matches:
            line_number = content[:match.start()].count('\n') + 1
            query_text = match.group(0)
            
            query_info = self._analyze_knex_query(file_path, query_text, line_number)
            queries.append(query_info)
            
        return queries
    
    def _parse_sqlalchemy_queries(self, file_path: Path, content: str) -> List[QueryInfo]:
        """Parse SQLAlchemy queries"""
        queries = []
        
        # Find SQLAlchemy query patterns
        sqlalchemy_patterns = [
            r'session\.query\([^)]+\)(?:\.[a-zA-Z_]+\([^)]*\))*',
            r'db\.session\.query\([^)]+\)(?:\.[a-zA-Z_]+\([^)]*\))*',
            r'query\([^)]+\)\.filter\([^)]+\)',
        ]
        
        for pattern in sqlalchemy_patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                line_number = content[:match.start()].count('\n') + 1
                query_text = match.group(0)
                
                query_info = self._analyze_sqlalchemy_query(file_path, query_text, line_number)
                queries.append(query_info)
                
        return queries
    
    def _parse_sequelize_queries(self, file_path: Path, content: str) -> List[QueryInfo]:
        """Parse Sequelize ORM queries"""
        queries = []
        
        # Find Sequelize query patterns
        sequelize_patterns = [
            r'(\w+)\.findAll\s*\(\s*({[^}]*})\s*\)',
            r'(\w+)\.findOne\s*\(\s*({[^}]*})\s*\)',
            r'(\w+)\.create\s*\(\s*({[^}]*})\s*\)',
            r'(\w+)\.update\s*\(\s*({[^}]*})\s*\)',
            r'(\w+)\.destroy\s*\(\s*({[^}]*})\s*\)',
        ]
        
        for pattern in sequelize_patterns:
            matches = re.finditer(pattern, content, re.DOTALL)
            for match in matches:
                line_number = content[:match.start()].count('\n') + 1
                model_name = match.group(1)
                query_options = match.group(2)
                
                query_info = self._analyze_sequelize_query(
                    file_path, model_name, query_options, line_number, match.group(0)
                )
                queries.append(query_info)
                
        return queries
    
    def _parse_generic_queries(self, file_path: Path, content: str) -> List[QueryInfo]:
        """Parse queries using generic patterns"""
        queries = []
        
        # Look for SQL keywords in strings
        sql_patterns = [
            r'["\']SELECT\s+.*?FROM\s+.*?["\']',
            r'["\']INSERT\s+INTO\s+.*?["\']',
            r'["\']UPDATE\s+.*?SET\s+.*?["\']',
            r'["\']DELETE\s+FROM\s+.*?["\']',
        ]
        
        for pattern in sql_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE | re.DOTALL)
            for match in matches:
                line_number = content[:match.start()].count('\n') + 1
                query_text = match.group(0).strip('\'"')
                
                query_info = self._analyze_sql_statement(
                    file_path, query_text, line_number, 'embedded_sql'
                )
                if query_info:
                    queries.append(query_info)
                    
        return queries
    
    def _analyze_sql_statement(self, file_path: Path, statement: str, line_number: int, format_type: str) -> Optional[QueryInfo]:
        """Analyze a SQL statement and extract structured information"""
        statement = statement.strip()
        if not statement:
            return None
            
        # Extract query type
        query_type = self._extract_query_type(statement)
        
        # Extract tables
        tables = self._extract_tables(statement)
        
        # Extract columns
        columns = self._extract_columns(statement)
        
        # Extract WHERE conditions
        where_conditions = self._extract_where_conditions(statement)
        
        # Extract JOINs
        joins = self._extract_joins(statement)
        
        # Extract parameters (placeholders)
        parameters = self._extract_parameters(statement)
        
        # Infer purpose
        purpose = self._infer_query_purpose(statement, tables, query_type)
        
        return QueryInfo(
            file_path=str(file_path),
            function_name=self._extract_function_name(file_path, line_number),
            query_type=query_type,
            tables=tables,
            columns=columns,
            where_conditions=where_conditions,
            joins=joins,
            parameters=parameters,
            return_structure=self._infer_return_structure(statement, columns),
            query_text=statement,
            line_number=line_number,
            query_format=format_type,
            purpose=purpose
        )
    
    def _analyze_prisma_query(self, file_path: Path, model_name: str, options: str, line_number: int, full_query: str) -> QueryInfo:
        """Analyze a Prisma query"""
        # Extract operation type from the method
        if 'findMany' in full_query:
            query_type = 'SELECT'
        elif 'findUnique' in full_query or 'findFirst' in full_query:
            query_type = 'SELECT'
        elif 'create' in full_query:
            query_type = 'INSERT'
        elif 'update' in full_query:
            query_type = 'UPDATE'
        elif 'delete' in full_query:
            query_type = 'DELETE'
        else:
            query_type = 'SELECT'
        
        # Extract where conditions from options
        where_conditions = self._extract_prisma_where(options)
        
        # Extract select fields
        columns = self._extract_prisma_select(options)
        
        return QueryInfo(
            file_path=str(file_path),
            function_name=self._extract_function_name(file_path, line_number),
            query_type=query_type,
            tables=[model_name],
            columns=columns,
            where_conditions=where_conditions,
            joins=self._extract_prisma_include(options),
            parameters=self._extract_prisma_parameters(options),
            return_structure=f"Prisma {model_name} object",
            query_text=full_query,
            line_number=line_number,
            query_format='prisma',
            purpose=self._infer_prisma_purpose(model_name, query_type, where_conditions)
        )
    
    def _analyze_knex_query(self, file_path: Path, query_text: str, line_number: int) -> QueryInfo:
        """Analyze a Knex.js query"""
        # Extract table name
        table_match = re.search(r'knex\(["\']([^"\']+)["\']', query_text)
        tables = [table_match.group(1)] if table_match else []
        
        # Extract query type
        if '.insert(' in query_text:
            query_type = 'INSERT'
        elif '.update(' in query_text:
            query_type = 'UPDATE'
        elif '.del(' in query_text or '.delete(' in query_text:
            query_type = 'DELETE'
        else:
            query_type = 'SELECT'
        
        # Extract columns
        columns = self._extract_knex_columns(query_text)
        
        # Extract where conditions
        where_conditions = self._extract_knex_where(query_text)
        
        # Extract joins
        joins = self._extract_knex_joins(query_text)
        
        return QueryInfo(
            file_path=str(file_path),
            function_name=self._extract_function_name(file_path, line_number),
            query_type=query_type,
            tables=tables,
            columns=columns,
            where_conditions=where_conditions,
            joins=joins,
            parameters=self._extract_knex_parameters(query_text),
            return_structure="Knex query result",
            query_text=query_text,
            line_number=line_number,
            query_format='knex',
            purpose=self._infer_knex_purpose(tables, query_type, where_conditions)
        )
    
    def _analyze_sqlalchemy_query(self, file_path: Path, query_text: str, line_number: int) -> QueryInfo:
        """Analyze a SQLAlchemy query"""
        # Extract model/table names
        model_match = re.search(r'query\(([^)]+)\)', query_text)
        tables = [model_match.group(1)] if model_match else []
        
        # Extract filter conditions
        where_conditions = self._extract_sqlalchemy_filters(query_text)
        
        return QueryInfo(
            file_path=str(file_path),
            function_name=self._extract_function_name(file_path, line_number),
            query_type='SELECT',  # Most SQLAlchemy queries are SELECT
            tables=tables,
            columns=[],  # SQLAlchemy often returns full objects
            where_conditions=where_conditions,
            joins=self._extract_sqlalchemy_joins(query_text),
            parameters=self._extract_sqlalchemy_parameters(query_text),
            return_structure="SQLAlchemy model object",
            query_text=query_text,
            line_number=line_number,
            query_format='sqlalchemy',
            purpose=self._infer_sqlalchemy_purpose(tables, where_conditions)
        )
    
    def _analyze_sequelize_query(self, file_path: Path, model_name: str, options: str, line_number: int, full_query: str) -> QueryInfo:
        """Analyze a Sequelize query"""
        # Similar to Prisma analysis
        if 'findAll' in full_query or 'findOne' in full_query:
            query_type = 'SELECT'
        elif 'create' in full_query:
            query_type = 'INSERT'
        elif 'update' in full_query:
            query_type = 'UPDATE'
        elif 'destroy' in full_query:
            query_type = 'DELETE'
        else:
            query_type = 'SELECT'
        
        where_conditions = self._extract_sequelize_where(options)
        
        return QueryInfo(
            file_path=str(file_path),
            function_name=self._extract_function_name(file_path, line_number),
            query_type=query_type,
            tables=[model_name],
            columns=self._extract_sequelize_attributes(options),
            where_conditions=where_conditions,
            joins=self._extract_sequelize_include(options),
            parameters=self._extract_sequelize_parameters(options),
            return_structure=f"Sequelize {model_name} object",
            query_text=full_query,
            line_number=line_number,
            query_format='sequelize',
            purpose=self._infer_sequelize_purpose(model_name, query_type, where_conditions)
        )
    
    # Helper methods for extraction (simplified implementations)
    def _extract_query_type(self, statement: str) -> str:
        """Extract the type of SQL query"""
        statement_upper = statement.upper().strip()
        if statement_upper.startswith('SELECT'):
            return 'SELECT'
        elif statement_upper.startswith('INSERT'):
            return 'INSERT'
        elif statement_upper.startswith('UPDATE'):
            return 'UPDATE'
        elif statement_upper.startswith('DELETE'):
            return 'DELETE'
        elif statement_upper.startswith('CREATE'):
            return 'CREATE'
        elif statement_upper.startswith('DROP'):
            return 'DROP'
        else:
            return 'UNKNOWN'
    
    def _extract_tables(self, statement: str) -> List[str]:
        """Extract table names from SQL statement"""
        tables = []
        
        # FROM clause
        from_match = re.search(r'FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)', statement, re.IGNORECASE)
        if from_match:
            tables.append(from_match.group(1))
        
        # JOIN clauses
        join_matches = re.findall(r'JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)', statement, re.IGNORECASE)
        tables.extend(join_matches)
        
        # INSERT INTO
        insert_match = re.search(r'INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)', statement, re.IGNORECASE)
        if insert_match:
            tables.append(insert_match.group(1))
        
        # UPDATE
        update_match = re.search(r'UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)', statement, re.IGNORECASE)
        if update_match:
            tables.append(update_match.group(1))
        
        return list(set(tables))  # Remove duplicates
    
    def _extract_columns(self, statement: str) -> List[str]:
        """Extract column names from SELECT statement"""
        if not statement.upper().strip().startswith('SELECT'):
            return []
        
        # Find the SELECT clause
        select_match = re.search(r'SELECT\s+(.*?)\s+FROM', statement, re.IGNORECASE | re.DOTALL)
        if not select_match:
            return []
        
        columns_str = select_match.group(1)
        
        # Handle SELECT *
        if '*' in columns_str:
            return ['*']
        
        # Split by comma and clean up
        columns = [col.strip() for col in columns_str.split(',')]
        return columns
    
    def _extract_where_conditions(self, statement: str) -> List[str]:
        """Extract WHERE conditions from SQL statement"""
        where_match = re.search(r'WHERE\s+(.*?)(?:GROUP\s+BY|ORDER\s+BY|LIMIT|$)', statement, re.IGNORECASE | re.DOTALL)
        if not where_match:
            return []
        
        where_clause = where_match.group(1).strip()
        
        # Split by AND/OR
        conditions = re.split(r'\s+(?:AND|OR)\s+', where_clause, flags=re.IGNORECASE)
        return [cond.strip() for cond in conditions]
    
    def _extract_joins(self, statement: str) -> List[str]:
        """Extract JOIN clauses from SQL statement"""
        join_matches = re.findall(r'((?:INNER|LEFT|RIGHT|FULL)?\s*JOIN\s+[^\\s]+(?:\s+ON\s+[^\\n]+)?)', statement, re.IGNORECASE)
        return join_matches
    
    def _extract_parameters(self, statement: str) -> List[str]:
        """Extract parameter placeholders from statement"""
        # Find various parameter formats
        params = []
        
        # ? placeholders
        params.extend(re.findall(r'\?', statement))
        
        # Named parameters (:param, $param, @param)
        params.extend(re.findall(r'[:$@]([a-zA-Z_][a-zA-Z0-9_]*)', statement))
        
        return params
    
    def _extract_function_name(self, file_path: Path, line_number: int) -> str:
        """Extract the function name containing the query"""
        try:
            lines = file_path.read_text().split('\n')
            
            # Look backwards from the query line to find a function definition
            for i in range(line_number - 1, max(0, line_number - 20), -1):
                line = lines[i].strip()
                
                # Function patterns for different languages
                function_patterns = [
                    r'def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(',  # Python
                    r'function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(',  # JavaScript
                    r'const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=',  # JavaScript const
                    r'([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*function',  # JavaScript object method
                    r'async\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(',  # Async function
                ]
                
                for pattern in function_patterns:
                    match = re.search(pattern, line)
                    if match:
                        return match.group(1)
        except:
            pass
        
        return f"line_{line_number}"
    
    def _infer_query_purpose(self, statement: str, tables: List[str], query_type: str) -> str:
        """Infer the purpose of a query based on its structure"""
        if query_type == 'SELECT':
            if 'COUNT(' in statement.upper():
                return f"Count records from {', '.join(tables)}"
            elif 'ORDER BY' in statement.upper():
                return f"Get sorted data from {', '.join(tables)}"
            elif 'WHERE' in statement.upper():
                return f"Filter data from {', '.join(tables)}"
            else:
                return f"Get all data from {', '.join(tables)}"
        elif query_type == 'INSERT':
            return f"Insert data into {', '.join(tables)}"
        elif query_type == 'UPDATE':
            return f"Update data in {', '.join(tables)}"
        elif query_type == 'DELETE':
            return f"Delete data from {', '.join(tables)}"
        else:
            return f"{query_type} operation on {', '.join(tables)}"
    
    def _infer_return_structure(self, statement: str, columns: List[str]) -> str:
        """Infer what the query returns"""
        if '*' in columns:
            return "Complete record(s)"
        elif len(columns) == 1:
            return f"Single column: {columns[0]}"
        else:
            return f"Multiple columns: {', '.join(columns[:3])}{'...' if len(columns) > 3 else ''}"
    
    # Simplified implementations of framework-specific extractors
    def _extract_prisma_where(self, options: str) -> List[str]:
        """Extract WHERE conditions from Prisma options"""
        where_match = re.search(r'where:\s*{([^}]*)}', options)
        if where_match:
            return [where_match.group(1).strip()]
        return []
    
    def _extract_prisma_select(self, options: str) -> List[str]:
        """Extract selected fields from Prisma options"""
        select_match = re.search(r'select:\s*{([^}]*)}', options)
        if select_match:
            fields = select_match.group(1).split(',')
            return [field.strip() for field in fields]
        return []
    
    def _extract_prisma_include(self, options: str) -> List[str]:
        """Extract included relations from Prisma options"""
        include_match = re.search(r'include:\s*{([^}]*)}', options)
        if include_match:
            return [include_match.group(1).strip()]
        return []
    
    def _extract_prisma_parameters(self, options: str) -> List[str]:
        """Extract parameters from Prisma options"""
        # Look for variable references like ${variable}
        return re.findall(r'\$\{([^}]+)\}', options)
    
    def _infer_prisma_purpose(self, model_name: str, query_type: str, where_conditions: List[str]) -> str:
        """Infer purpose of Prisma query"""
        if query_type == 'SELECT':
            if where_conditions:
                return f"Find {model_name} with conditions"
            else:
                return f"Get all {model_name} records"
        else:
            return f"{query_type} {model_name} record"
    
    # Similar methods for other frameworks...
    def _extract_knex_columns(self, query_text: str) -> List[str]:
        select_match = re.search(r'\.select\(["\']([^"\']+)["\']', query_text)
        return [select_match.group(1)] if select_match else []
    
    def _extract_knex_where(self, query_text: str) -> List[str]:
        where_matches = re.findall(r'\.where\([^)]+\)', query_text)
        return where_matches
    
    def _extract_knex_joins(self, query_text: str) -> List[str]:
        join_matches = re.findall(r'\.(?:inner|left|right)?[Jj]oin\([^)]+\)', query_text)
        return join_matches
    
    def _extract_knex_parameters(self, query_text: str) -> List[str]:
        return re.findall(r'\?', query_text)
    
    def _infer_knex_purpose(self, tables: List[str], query_type: str, where_conditions: List[str]) -> str:
        return f"{query_type} operation on {', '.join(tables) if tables else 'table'}"
    
    def _extract_sqlalchemy_filters(self, query_text: str) -> List[str]:
        filter_matches = re.findall(r'\.filter\([^)]+\)', query_text)
        return filter_matches
    
    def _extract_sqlalchemy_joins(self, query_text: str) -> List[str]:
        join_matches = re.findall(r'\.join\([^)]+\)', query_text)
        return join_matches
    
    def _extract_sqlalchemy_parameters(self, query_text: str) -> List[str]:
        return re.findall(r':([a-zA-Z_][a-zA-Z0-9_]*)', query_text)
    
    def _infer_sqlalchemy_purpose(self, tables: List[str], where_conditions: List[str]) -> str:
        return f"Query {', '.join(tables) if tables else 'model'}"
    
    def _extract_sequelize_where(self, options: str) -> List[str]:
        where_match = re.search(r'where:\s*{([^}]*)}', options)
        return [where_match.group(1).strip()] if where_match else []
    
    def _extract_sequelize_attributes(self, options: str) -> List[str]:
        attr_match = re.search(r'attributes:\s*\[([^\]]*)\]', options)
        if attr_match:
            attrs = attr_match.group(1).split(',')
            return [attr.strip().strip('\'"') for attr in attrs]
        return []
    
    def _extract_sequelize_include(self, options: str) -> List[str]:
        include_match = re.search(r'include:\s*\[([^\]]*)\]', options)
        return [include_match.group(1).strip()] if include_match else []
    
    def _extract_sequelize_parameters(self, options: str) -> List[str]:
        return re.findall(r'\$\{([^}]+)\}', options)
    
    def _infer_sequelize_purpose(self, model_name: str, query_type: str, where_conditions: List[str]) -> str:
        return f"{query_type} {model_name} {'with conditions' if where_conditions else ''}"

class QueryDuplicationDetector:
    """Main class for detecting query duplications"""
    
    def __init__(self, project_root: str = None, config: Dict[str, Any] = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.script_dir = Path(__file__).parent
        self.log_file = self.script_dir / "../logs/query-duplication-detector.log"
        self.report_file = self.script_dir / "../logs/query-duplication-report.json"
        
        # Configuration
        self.config = config or self._load_default_config()
        
        # Ensure log directory exists
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # Initialize parser
        self.parser = QueryParser()
        
    def _load_default_config(self) -> Dict[str, Any]:
        """Load default configuration"""
        return {
            'query_directories': ['queries', 'sql', 'database', 'db', 'models'],
            'query_file_patterns': [
                '*query*.ts', '*query*.js', '*query*.py',
                '*sql*.ts', '*sql*.js', '*sql*.py',
                '*db*.ts', '*db*.js', '*db*.py',
                '*.sql', '*.mysql', '*.pgsql', '*.sqlite'
            ],
            'similarity_threshold': 0.8,
            'block_on_duplicates': False,
            'excluded_directories': ['node_modules', '.git', 'dist', 'build', '__pycache__'],
            'claude_command': 'claude-code',
            'reviewer_prompt_template': self._get_reviewer_prompt_template()
        }
    
    def _get_reviewer_prompt_template(self) -> str:
        """Get the template for Claude reviewer prompts"""
        return """
You are a database query analysis expert. Your task is to analyze the provided queries and identify duplications, similarities, and refactoring opportunities.

ANALYSIS TASK:
1. Compare the newly added/modified queries with all existing queries
2. Identify semantic similarities (not just exact text matches)
3. Look for queries that access the same tables with similar purposes
4. Find opportunities for parameterization instead of creating new queries

NEW/MODIFIED QUERIES:
{new_queries}

EXISTING QUERIES:
{existing_queries}

Please analyze and provide a structured report with:

1. EXACT DUPLICATES: Queries that do exactly the same thing
2. SIMILAR QUERIES: Queries that could be consolidated or parameterized
3. REFACTORING OPPORTUNITIES: Specific suggestions for reusing existing functionality

Format your response as JSON with this structure:
{{
  "duplicates": [
    {{
      "new_query": "function_name_or_description",
      "existing_query": "existing_function_name",
      "similarity": 1.0,
      "reason": "explanation of why they're duplicates"
    }}
  ],
  "similar_queries": [
    {{
      "new_query": "function_name_or_description", 
      "existing_query": "existing_function_name",
      "similarity": 0.85,
      "refactoring_suggestion": "specific suggestion for consolidation"
    }}
  ],
  "recommendations": [
    "specific actionable recommendations"
  ],
  "summary": "overall assessment and next steps"
}}

Focus on semantic similarity - queries that achieve the same business purpose even if they use different syntax or frameworks.
"""
    
    def find_query_files(self, modified_files: List[str] = None) -> Tuple[List[Path], List[Path]]:
        """Find query files in the project"""
        all_query_files = []
        new_or_modified_files = []
        
        # Search in configured directories
        for directory in self.config['query_directories']:
            query_dir = self.project_root / directory
            if query_dir.exists():
                for pattern in self.config['query_file_patterns']:
                    all_query_files.extend(query_dir.rglob(pattern))
        
        # Search by file patterns in the entire project
        for pattern in self.config['query_file_patterns']:
            files = self.project_root.rglob(pattern)
            for file in files:
                # Skip excluded directories
                if any(excluded in str(file) for excluded in self.config['excluded_directories']):
                    continue
                all_query_files.append(file)
        
        # Remove duplicates
        all_query_files = list(set(all_query_files))
        
        # Identify new or modified files
        if modified_files:
            modified_paths = [Path(f) for f in modified_files]
            new_or_modified_files = [f for f in all_query_files if f in modified_paths]
        
        self.logger.info(f"Found {len(all_query_files)} total query files")
        self.logger.info(f"Found {len(new_or_modified_files)} modified query files")
        
        return all_query_files, new_or_modified_files
    
    def analyze_queries(self, query_files: List[Path]) -> List[QueryInfo]:
        """Analyze all queries in the provided files"""
        all_queries = []
        
        for file_path in query_files:
            try:
                queries = self.parser.parse_file(file_path)
                all_queries.extend(queries)
                self.logger.info(f"Found {len(queries)} queries in {file_path}")
            except Exception as e:
                self.logger.error(f"Error analyzing {file_path}: {e}")
        
        return all_queries
    
    def launch_claude_reviewer(self, new_queries: List[QueryInfo], existing_queries: List[QueryInfo]) -> Optional[DuplicationReport]:
        """Launch a separate Claude Code instance to review queries"""
        try:
            # Prepare the review prompt
            new_queries_json = json.dumps([asdict(q) for q in new_queries], indent=2)
            existing_queries_json = json.dumps([asdict(q) for q in existing_queries], indent=2)
            
            prompt = self.config['reviewer_prompt_template'].format(
                new_queries=new_queries_json,
                existing_queries=existing_queries_json
            )
            
            # Create temporary file for the prompt
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
                temp_file.write(prompt)
                temp_file_path = temp_file.name
            
            try:
                # Launch Claude Code with the review prompt
                self.logger.info("Launching Claude Code reviewer instance...")
                
                result = subprocess.run([
                    self.config['claude_command'],
                    '--prompt-file', temp_file_path,
                    '--output-format', 'json'
                ], 
                capture_output=True, 
                text=True, 
                timeout=300  # 5 minute timeout
                )
                
                if result.returncode == 0:
                    # Parse the Claude response
                    response_data = json.loads(result.stdout)
                    
                    return DuplicationReport(
                        duplicates=response_data.get('duplicates', []),
                        similar_queries=response_data.get('similar_queries', []),
                        parameterization_opportunities=response_data.get('parameterization_opportunities', []),
                        recommendations=response_data.get('recommendations', []),
                        summary=response_data.get('summary', 'No summary provided')
                    )
                else:
                    self.logger.error(f"Claude reviewer failed: {result.stderr}")
                    return None
                    
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            self.logger.error(f"Error launching Claude reviewer: {e}")
            return None
    
    def generate_feedback(self, report: DuplicationReport) -> str:
        """Generate formatted feedback for the original Claude instance"""
        if not report.duplicates and not report.similar_queries:
            return "✅ No query duplications detected. Your database queries look good!"
        
        feedback = []
        feedback.append("🔍 Database Query Duplication Analysis Results")
        feedback.append("=" * 60)
        feedback.append("")
        
        # Exact duplicates
        if report.duplicates:
            feedback.append("🚨 EXACT DUPLICATES FOUND:")
            feedback.append("-" * 30)
            for dup in report.duplicates:
                feedback.append(f"  ❌ {dup['new_query']}")
                feedback.append(f"     Duplicates: {dup['existing_query']}")
                feedback.append(f"     Reason: {dup['reason']}")
                feedback.append("")
        
        # Similar queries
        if report.similar_queries:
            feedback.append("⚠️ SIMILAR QUERIES DETECTED:")
            feedback.append("-" * 30)
            for sim in report.similar_queries:
                feedback.append(f"  🔶 {sim['new_query']}")
                feedback.append(f"     Similar to: {sim['existing_query']}")
                feedback.append(f"     Similarity: {sim.get('similarity', 'Unknown')}")
                feedback.append(f"     Suggestion: {sim['refactoring_suggestion']}")
                feedback.append("")
        
        # Recommendations
        if report.recommendations:
            feedback.append("💡 REFACTORING RECOMMENDATIONS:")
            feedback.append("-" * 30)
            for i, rec in enumerate(report.recommendations, 1):
                feedback.append(f"  {i}. {rec}")
            feedback.append("")
        
        # Summary
        feedback.append("📋 SUMMARY:")
        feedback.append("-" * 15)
        feedback.append(report.summary)
        feedback.append("")
        
        # Action items
        feedback.append("🤖 REQUIRED ACTIONS:")
        feedback.append("-" * 20)
        feedback.append("1. Review the identified duplications above")
        feedback.append("2. Refactor to use existing query functions where possible")
        feedback.append("3. Consider parameterizing similar queries instead of creating new ones")
        feedback.append("4. Update your code to call existing functions instead of duplicating logic")
        feedback.append("")
        
        if self.config['block_on_duplicates'] and report.duplicates:
            feedback.append("🛑 BLOCKING: Duplicates detected. Please refactor before proceeding.")
        
        return "\n".join(feedback)
    
    def save_report(self, report: DuplicationReport, modified_files: List[str] = None):
        """Save the duplication report to file"""
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'modified_files': modified_files or [],
            'report': asdict(report)
        }
        
        try:
            with open(self.report_file, 'w') as f:
                json.dump(report_data, f, indent=2)
            self.logger.info(f"Report saved to {self.report_file}")
        except Exception as e:
            self.logger.error(f"Failed to save report: {e}")
    
    def check_duplications(self, modified_files: List[str] = None) -> Tuple[bool, str]:
        """Main method to check for query duplications"""
        try:
            # Find query files
            all_query_files, modified_query_files = self.find_query_files(modified_files)
            
            if not modified_query_files:
                return True, "ℹ️ No query files were modified."
            
            # Analyze queries
            all_queries = self.analyze_queries(all_query_files)
            modified_queries = self.analyze_queries(modified_query_files)
            
            if not modified_queries:
                return True, "ℹ️ No queries found in modified files."
            
            # Filter existing queries (exclude the modified ones)
            modified_query_texts = {q.query_text for q in modified_queries}
            existing_queries = [q for q in all_queries if q.query_text not in modified_query_texts]
            
            self.logger.info(f"Analyzing {len(modified_queries)} new queries against {len(existing_queries)} existing queries")
            
            # Launch Claude reviewer
            report = self.launch_claude_reviewer(modified_queries, existing_queries)
            
            if not report:
                return True, "⚠️ Could not complete query duplication analysis. Proceeding with caution."
            
            # Save report
            self.save_report(report, modified_files)
            
            # Generate feedback
            feedback = self.generate_feedback(report)
            
            # Determine if we should block
            should_block = (
                self.config['block_on_duplicates'] and 
                (report.duplicates or report.similar_queries)
            )
            
            return not should_block, feedback
            
        except Exception as e:
            self.logger.error(f"Error in duplication check: {e}")
            return True, f"⚠️ Query duplication check failed: {e}"

def main():
    """Main entry point for the hook"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Query Duplication Detection Hook')
    parser.add_argument('--project-root', default=os.getcwd(),
                       help='Root directory of the project')
    parser.add_argument('--modified-files', nargs='*',
                       help='List of modified files to analyze')
    parser.add_argument('--config-file',
                       help='Path to configuration file')
    parser.add_argument('--quiet', action='store_true',
                       help='Suppress non-error output')
    
    args = parser.parse_args()
    
    # Load configuration
    config = None
    if args.config_file and Path(args.config_file).exists():
        with open(args.config_file, 'r') as f:
            config = json.load(f)
    
    # Create detector instance
    detector = QueryDuplicationDetector(args.project_root, config)
    
    try:
        # Run duplication check
        success, output = detector.check_duplications(args.modified_files)
        
        # Output results
        if not args.quiet:
            print(output)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        detector.logger.info("Query duplication check interrupted by user")
        sys.exit(130)
        
    except Exception as e:
        detector.logger.error(f"Unexpected error: {e}")
        print(f"🚨 Query duplication check failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()