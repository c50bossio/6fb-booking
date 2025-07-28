#!/usr/bin/env python3

"""
TypeScript Type Checking Hook for Claude Code
Automatically runs TypeScript type checking after file modifications
and provides formatted feedback to Claude for error resolution.

Created: 2025-07-28
"""

import os
import sys
import json
import subprocess
import re
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime

class TypeScriptTypeChecker:
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.script_dir = Path(__file__).parent
        self.log_file = self.script_dir / "../logs/typescript-type-checker.log"
        self.error_file = self.script_dir / "../logs/typescript-errors.json"
        
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
        
    def find_typescript_projects(self) -> List[Path]:
        """Find all TypeScript projects (directories with tsconfig.json)"""
        typescript_projects = []
        
        # Search for tsconfig.json files
        for tsconfig in self.project_root.rglob("tsconfig.json"):
            project_dir = tsconfig.parent
            
            # Skip node_modules and other irrelevant directories
            if any(part in str(project_dir) for part in ['node_modules', '.git', 'dist', 'build']):
                continue
                
            typescript_projects.append(project_dir)
            self.logger.info(f"Found TypeScript project: {project_dir}")
            
        return typescript_projects
    
    def check_typescript_availability(self, project_dir: Path) -> Tuple[bool, Optional[str]]:
        """Check if TypeScript compiler is available in the project"""
        # Check for local TypeScript installation
        local_tsc = project_dir / "node_modules" / ".bin" / "tsc"
        if local_tsc.exists():
            return True, str(local_tsc)
            
        # Check for global TypeScript installation
        try:
            result = subprocess.run(
                ["which", "tsc"], 
                capture_output=True, 
                text=True, 
                timeout=5
            )
            if result.returncode == 0:
                return True, result.stdout.strip()
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            pass
            
        # Check if npx can find TypeScript
        try:
            result = subprocess.run(
                ["npx", "tsc", "--version"], 
                cwd=project_dir,
                capture_output=True, 
                text=True, 
                timeout=10
            )
            if result.returncode == 0:
                return True, "npx tsc"
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            pass
            
        return False, None
    
    def run_type_checking(self, project_dir: Path, tsc_command: str) -> Tuple[bool, str, str]:
        """Run TypeScript type checking and capture output"""
        try:
            # Determine the command to run
            if tsc_command.startswith("npx"):
                cmd = ["npx", "tsc", "--noEmit", "--pretty", "false"]
            else:
                cmd = [tsc_command, "--noEmit", "--pretty", "false"]
            
            self.logger.info(f"Running type check in {project_dir}: {' '.join(cmd)}")
            
            # Run TypeScript compiler
            result = subprocess.run(
                cmd,
                cwd=project_dir,
                capture_output=True,
                text=True,
                timeout=60  # 1 minute timeout
            )
            
            return result.returncode == 0, result.stdout, result.stderr
            
        except subprocess.TimeoutExpired:
            error_msg = "TypeScript type checking timed out (60 seconds)"
            self.logger.error(error_msg)
            return False, "", error_msg
            
        except Exception as e:
            error_msg = f"Error running TypeScript type checking: {str(e)}"
            self.logger.error(error_msg)
            return False, "", error_msg
    
    def parse_typescript_errors(self, output: str, project_dir: Path) -> List[Dict[str, Any]]:
        """Parse TypeScript compiler output and extract structured error information"""
        errors = []
        
        # TypeScript error pattern: file(line,col): error TS####: message
        error_pattern = r'^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$'
        
        for line in output.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            match = re.match(error_pattern, line)
            if match:
                file_path, line_num, col_num, severity, error_code, message = match.groups()
                
                # Make file path relative to project root
                try:
                    relative_path = Path(file_path).relative_to(project_dir)
                except ValueError:
                    relative_path = Path(file_path)
                
                errors.append({
                    'file': str(relative_path),
                    'line': int(line_num),
                    'column': int(col_num),
                    'severity': severity,
                    'code': error_code,
                    'message': message.strip(),
                    'project_dir': str(project_dir)
                })
            
            # Handle multiline errors or different formats
            elif 'error TS' in line:
                # Fallback parsing for different error formats
                parts = line.split(': ')
                if len(parts) >= 2:
                    errors.append({
                        'file': 'unknown',
                        'line': 0,
                        'column': 0,
                        'severity': 'error',
                        'code': 'TS0000',
                        'message': line.strip(),
                        'project_dir': str(project_dir)
                    })
        
        return errors
    
    def format_errors_for_claude(self, errors: List[Dict[str, Any]]) -> str:
        """Format TypeScript errors for Claude Code feedback"""
        if not errors:
            return "✅ TypeScript type checking passed - no errors found!"
        
        formatted_output = []
        formatted_output.append("🚨 TypeScript Type Errors Found:")
        formatted_output.append("=" * 50)
        formatted_output.append("")
        
        # Group errors by file
        errors_by_file = {}
        for error in errors:
            file_path = error['file']
            if file_path not in errors_by_file:
                errors_by_file[file_path] = []
            errors_by_file[file_path].append(error)
        
        # Format errors by file
        for file_path, file_errors in errors_by_file.items():
            formatted_output.append(f"📁 File: {file_path}")
            formatted_output.append("-" * (len(file_path) + 8))
            
            for error in file_errors:
                line_info = f"Line {error['line']}, Column {error['column']}" if error['line'] > 0 else "Unknown location"
                formatted_output.append(f"  🔴 {line_info}")
                formatted_output.append(f"     Error: {error['code']} - {error['message']}")
                formatted_output.append("")
            
            formatted_output.append("")
        
        # Add summary
        error_count = len(errors)
        file_count = len(errors_by_file)
        formatted_output.append(f"📊 Summary: {error_count} errors found across {file_count} files")
        formatted_output.append("")
        
        # Add Claude guidance
        formatted_output.append("🤖 Claude Code Action Required:")
        formatted_output.append("Please fix these TypeScript errors by:")
        formatted_output.append("1. Reviewing the affected files and error messages")
        formatted_output.append("2. Updating type definitions, interfaces, or function signatures")
        formatted_output.append("3. Ensuring consistency between function definitions and usage")
        formatted_output.append("4. Adding missing type annotations where needed")
        formatted_output.append("")
        
        return "\n".join(formatted_output)
    
    def save_error_report(self, errors: List[Dict[str, Any]], modified_files: List[str] = None):
        """Save detailed error report to JSON file"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'modified_files': modified_files or [],
            'error_count': len(errors),
            'errors': errors
        }
        
        try:
            with open(self.error_file, 'w') as f:
                json.dump(report, f, indent=2)
            self.logger.info(f"Error report saved to {self.error_file}")
        except Exception as e:
            self.logger.error(f"Failed to save error report: {e}")
    
    def should_check_project(self, project_dir: Path, modified_files: List[str] = None) -> bool:
        """Determine if a project should be type-checked based on modified files"""
        if not modified_files:
            return True
            
        # Check if any modified files are in this project
        for file_path in modified_files:
            file_path_obj = Path(file_path)
            try:
                # Check if file is under this project directory
                file_path_obj.relative_to(project_dir)
                
                # Check if it's a TypeScript/JavaScript file
                if file_path_obj.suffix in ['.ts', '.tsx', '.js', '.jsx']:
                    return True
                    
                # Also check config files that might affect types
                if file_path_obj.name in ['tsconfig.json', 'package.json']:
                    return True
                    
            except ValueError:
                # File is not under this project directory
                continue
                
        return False
    
    def check_all_projects(self, modified_files: List[str] = None) -> Tuple[bool, str]:
        """Check all TypeScript projects and return results"""
        typescript_projects = self.find_typescript_projects()
        
        if not typescript_projects:
            self.logger.info("No TypeScript projects found")
            return True, "ℹ️ No TypeScript projects found in the repository."
        
        all_errors = []
        checked_projects = 0
        
        for project_dir in typescript_projects:
            # Skip if this project doesn't need checking
            if not self.should_check_project(project_dir, modified_files):
                self.logger.info(f"Skipping {project_dir} - no relevant files modified")
                continue
                
            checked_projects += 1
            self.logger.info(f"Checking TypeScript project: {project_dir}")
            
            # Check if TypeScript is available
            tsc_available, tsc_command = self.check_typescript_availability(project_dir)
            if not tsc_available:
                error_msg = f"TypeScript compiler not found for project: {project_dir}"
                self.logger.warning(error_msg)
                all_errors.append({
                    'file': 'tsconfig.json',
                    'line': 0,
                    'column': 0,
                    'severity': 'warning',
                    'code': 'TS0001',
                    'message': f"TypeScript compiler not available. Install with: npm install -g typescript",
                    'project_dir': str(project_dir)
                })
                continue
            
            # Run type checking
            success, stdout, stderr = self.run_type_checking(project_dir, tsc_command)
            
            if not success:
                # Parse errors from output
                error_output = stderr if stderr.strip() else stdout
                project_errors = self.parse_typescript_errors(error_output, project_dir)
                all_errors.extend(project_errors)
                
                self.logger.info(f"Found {len(project_errors)} TypeScript errors in {project_dir}")
            else:
                self.logger.info(f"TypeScript type checking passed for {project_dir}")
        
        # Save error report
        self.save_error_report(all_errors, modified_files)
        
        # Format results
        if not all_errors:
            if checked_projects == 0:
                return True, "ℹ️ No TypeScript projects needed type checking for the modified files."
            else:
                return True, f"✅ TypeScript type checking passed for {checked_projects} project(s)!"
        else:
            formatted_errors = self.format_errors_for_claude(all_errors)
            return False, formatted_errors

def main():
    """Main entry point for the hook"""
    # Parse command line arguments
    import argparse
    
    parser = argparse.ArgumentParser(description='TypeScript Type Checking Hook')
    parser.add_argument('--project-root', default=os.getcwd(), 
                       help='Root directory of the project')
    parser.add_argument('--modified-files', nargs='*', 
                       help='List of modified files to focus checking on')
    parser.add_argument('--quiet', action='store_true',
                       help='Suppress non-error output')
    
    args = parser.parse_args()
    
    # Create type checker instance
    checker = TypeScriptTypeChecker(args.project_root)
    
    try:
        # Run type checking
        success, output = checker.check_all_projects(args.modified_files)
        
        # Output results
        if not args.quiet:
            print(output)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        checker.logger.info("Type checking interrupted by user")
        sys.exit(130)
        
    except Exception as e:
        checker.logger.error(f"Unexpected error: {e}")
        print(f"🚨 TypeScript type checking failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()