#!/usr/bin/env python3
"""
Sentry Auto-Fixer System
Automatically detects, analyzes, and fixes common errors using Claude Code
"""

import os
import json
import asyncio
import logging
import subprocess
import tempfile
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

import aiohttp
import requests
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class FixConfidence(Enum):
    SAFE = "safe"  # Auto-fix without approval
    REVIEW = "review"  # Requires human review
    MANUAL = "manual"  # Too complex for automation


@dataclass
class ErrorPattern:
    pattern: str
    error_type: str
    severity: ErrorSeverity
    confidence: FixConfidence
    auto_fixable: bool
    description: str


class SentryWebhookPayload(BaseModel):
    action: str
    data: Dict
    actor: Dict
    installation: Dict


class SentryAutoFixer:
    """Main class for automated error fixing"""

    def __init__(self):
        self.claude_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.sentry_auth_token = os.getenv("SENTRY_AUTH_TOKEN")
        self.github_token = os.getenv("GITHUB_TOKEN")  # For creating PRs

        # Define error patterns that can be auto-fixed
        self.error_patterns = [
            ErrorPattern(
                pattern="column.*does not exist",
                error_type="database_schema",
                severity=ErrorSeverity.HIGH,
                confidence=FixConfidence.SAFE,
                auto_fixable=True,
                description="Missing database column",
            ),
            ErrorPattern(
                pattern="Could not validate credentials",
                error_type="authentication",
                severity=ErrorSeverity.MEDIUM,
                confidence=FixConfidence.REVIEW,
                auto_fixable=True,
                description="JWT authentication error",
            ),
            ErrorPattern(
                pattern="rate limit.*exceeded",
                error_type="api_rate_limit",
                severity=ErrorSeverity.MEDIUM,
                confidence=FixConfidence.SAFE,
                auto_fixable=True,
                description="API rate limiting needed",
            ),
            ErrorPattern(
                pattern="ModuleNotFoundError|ImportError",
                error_type="import_error",
                severity=ErrorSeverity.LOW,
                confidence=FixConfidence.SAFE,
                auto_fixable=True,
                description="Missing import or dependency",
            ),
            ErrorPattern(
                pattern="is not defined|NameError",
                error_type="undefined_variable",
                severity=ErrorSeverity.LOW,
                confidence=FixConfidence.REVIEW,
                auto_fixable=True,
                description="Undefined variable or function",
            ),
        ]

        self.fix_history = []
        self.active_fixes = {}

    def classify_error(
        self, error_message: str, stack_trace: str
    ) -> Optional[ErrorPattern]:
        """Classify error and determine if it can be auto-fixed"""
        import re

        full_error = f"{error_message} {stack_trace}"

        for pattern in self.error_patterns:
            if re.search(pattern.pattern, full_error, re.IGNORECASE):
                logger.info(f"Classified error as: {pattern.error_type}")
                return pattern

        return None

    async def analyze_error_with_claude(self, error_data: Dict) -> Dict:
        """Use Claude API to analyze error and generate fix"""

        prompt = f"""
        You are an expert software engineer tasked with analyzing and fixing a production error.

        Error Details:
        - Message: {error_data.get('message', 'N/A')}
        - Type: {error_data.get('type', 'N/A')}
        - Stack Trace: {error_data.get('stack_trace', 'N/A')}
        - File: {error_data.get('filename', 'N/A')}
        - Line: {error_data.get('line_number', 'N/A')}

        Additional Context:
        - Project: {error_data.get('project', 'Unknown')}
        - Environment: {error_data.get('environment', 'Unknown')}
        - Frequency: {error_data.get('count', 1)} occurrences

        Please analyze this error and provide:
        1. Root cause analysis
        2. Specific fix recommendation
        3. Code changes needed (if any)
        4. Risk assessment (LOW/MEDIUM/HIGH)
        5. Testing recommendations

        Format your response as JSON with these keys:
        - root_cause: string
        - fix_description: string
        - code_changes: array of objects with {file, changes}
        - risk_level: string
        - test_recommendations: array of strings
        - confidence: number (0-100)
        """

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.claude_api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": "claude-3-sonnet-20240229",
                        "max_tokens": 2000,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                ) as response:
                    result = await response.json()

                    if response.status == 200:
                        analysis = result["content"][0]["text"]
                        try:
                            return json.loads(analysis)
                        except json.JSONDecodeError:
                            # If Claude doesn't return valid JSON, wrap the response
                            return {
                                "root_cause": "Analysis failed to parse",
                                "fix_description": analysis,
                                "code_changes": [],
                                "risk_level": "HIGH",
                                "test_recommendations": ["Manual review required"],
                                "confidence": 0,
                            }
                    else:
                        logger.error(f"Claude API error: {result}")
                        return None

        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")
            return None

    async def apply_fix(
        self, fix_data: Dict, error_pattern: ErrorPattern
    ) -> Tuple[bool, str]:
        """Apply the fix to the codebase"""

        if not fix_data or fix_data.get("confidence", 0) < 70:
            return False, "Fix confidence too low"

        if fix_data.get("risk_level") == "HIGH":
            return False, "Risk level too high for auto-fix"

        try:
            # Create a backup branch
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            branch_name = f"auto-fix-{error_pattern.error_type}-{timestamp}"

            # Apply code changes
            success = True
            changes_applied = []

            for change in fix_data.get("code_changes", []):
                file_path = change.get("file")
                modifications = change.get("changes")

                if file_path and modifications:
                    try:
                        # Apply changes using subprocess to call Claude Code
                        result = await self.apply_code_changes(file_path, modifications)
                        if result:
                            changes_applied.append(file_path)
                        else:
                            success = False
                            break
                    except Exception as e:
                        logger.error(f"Failed to apply changes to {file_path}: {e}")
                        success = False
                        break

            if success:
                # Run tests if available
                test_passed = await self.run_tests(error_pattern.error_type)

                if test_passed:
                    # Commit changes
                    commit_message = f"Auto-fix: {fix_data.get('fix_description', 'Automated error fix')}\n\nFixed by Sentry Auto-Fixer"
                    await self.commit_changes(branch_name, commit_message)

                    return True, f"Fix applied successfully to branch {branch_name}"
                else:
                    # Rollback changes
                    await self.rollback_changes()
                    return False, "Tests failed, changes rolled back"
            else:
                return False, "Failed to apply code changes"

        except Exception as e:
            logger.error(f"Error applying fix: {e}")
            return False, str(e)

    async def apply_code_changes(self, file_path: str, modifications: str) -> bool:
        """Apply code changes using Claude API directly"""
        try:
            # Read the current file content
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                return False

            with open(file_path, "r", encoding="utf-8") as f:
                current_content = f.read()

            # Use Claude to generate the modified file content
            prompt = f"""
You are a code editor. I need you to apply specific modifications to a file.

Current file content:
```
{current_content}
```

Requested modifications:
{modifications}

Please provide the complete modified file content. Return ONLY the modified code, no explanations or markdown formatting.
"""

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.claude_api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": "claude-3-sonnet-20240229",
                        "max_tokens": 4000,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                ) as response:

                    if response.status != 200:
                        logger.error(f"Claude API error: {await response.text()}")
                        return False

                    result = await response.json()
                    modified_content = result["content"][0]["text"]

                    # Create backup
                    backup_path = (
                        f"{file_path}.backup.{int(datetime.now().timestamp())}"
                    )
                    with open(backup_path, "w", encoding="utf-8") as f:
                        f.write(current_content)

                    # Write modified content
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(modified_content)

                    logger.info(f"Successfully applied changes to {file_path}")
                    logger.info(f"Backup created at {backup_path}")
                    return True

        except Exception as e:
            logger.error(f"Error applying code changes to {file_path}: {e}")
            return False

    async def run_tests(self, error_type: str) -> bool:
        """Run relevant tests based on error type"""
        try:
            # Determine which tests to run based on error type
            if error_type == "database_schema":
                test_command = ["python3", "-m", "pytest", "tests/test_models.py", "-v"]
            elif error_type == "authentication":
                test_command = ["python3", "-m", "pytest", "tests/test_auth.py", "-v"]
            elif error_type == "api_rate_limit":
                test_command = ["python3", "-m", "pytest", "tests/test_api.py", "-v"]
            else:
                # Run all tests for other error types
                test_command = ["python3", "-m", "pytest", "tests/", "-v", "--tb=short"]

            process = await asyncio.create_subprocess_exec(
                *test_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info("Tests passed successfully")
                return True
            else:
                logger.error(f"Tests failed: {stderr.decode()}")
                return False

        except Exception as e:
            logger.error(f"Error running tests: {e}")
            return False

    async def commit_changes(self, branch_name: str, commit_message: str):
        """Commit changes to git"""
        try:
            # Create and switch to new branch
            subprocess.run(["git", "checkout", "-b", branch_name], check=True)

            # Add all changes
            subprocess.run(["git", "add", "."], check=True)

            # Commit changes
            subprocess.run(["git", "commit", "-m", commit_message], check=True)

            logger.info(f"Changes committed to branch {branch_name}")

        except subprocess.CalledProcessError as e:
            logger.error(f"Git operation failed: {e}")
            raise

    async def rollback_changes(self):
        """Rollback any uncommitted changes"""
        try:
            subprocess.run(["git", "checkout", "."], check=True)
            subprocess.run(["git", "clean", "-fd"], check=True)
            logger.info("Changes rolled back successfully")
        except subprocess.CalledProcessError as e:
            logger.error(f"Rollback failed: {e}")

    async def process_sentry_error(self, webhook_data: Dict) -> Dict:
        """Main method to process Sentry error webhook"""
        try:
            # Extract error information
            issue_data = webhook_data.get("data", {}).get("issue", {})
            error_message = issue_data.get("title", "")
            stack_trace = ""

            # Get latest event for more details
            events = issue_data.get("events", [])
            if events:
                latest_event = events[0]
                stack_trace = str(latest_event.get("entries", []))

            error_data = {
                "message": error_message,
                "stack_trace": stack_trace,
                "project": issue_data.get("project", {}).get("name", ""),
                "environment": latest_event.get("environment") if events else "unknown",
                "count": issue_data.get("count", 1),
                "filename": latest_event.get("culprit") if events else "",
                "line_number": "",
            }

            # Classify the error
            error_pattern = self.classify_error(error_message, stack_trace)

            if not error_pattern:
                return {
                    "status": "ignored",
                    "reason": "Error pattern not recognized for auto-fixing",
                }

            if not error_pattern.auto_fixable:
                return {
                    "status": "manual_review_required",
                    "reason": f"Error type '{error_pattern.error_type}' requires manual review",
                }

            # Analyze with Claude
            logger.info(f"Analyzing error with Claude: {error_pattern.error_type}")
            fix_analysis = await self.analyze_error_with_claude(error_data)

            if not fix_analysis:
                return {"status": "analysis_failed", "reason": "Claude analysis failed"}

            # Apply fix if confidence and safety checks pass
            if error_pattern.confidence == FixConfidence.SAFE:
                fix_success, fix_message = await self.apply_fix(
                    fix_analysis, error_pattern
                )

                result = {
                    "status": "fix_applied" if fix_success else "fix_failed",
                    "error_type": error_pattern.error_type,
                    "fix_description": fix_analysis.get("fix_description", ""),
                    "message": fix_message,
                    "confidence": fix_analysis.get("confidence", 0),
                }

                # Record in history
                self.fix_history.append(
                    {
                        "timestamp": datetime.now().isoformat(),
                        "error_type": error_pattern.error_type,
                        "success": fix_success,
                        "message": fix_message,
                    }
                )

                return result
            else:
                # Create fix recommendation for human review
                return {
                    "status": "fix_recommendation",
                    "error_type": error_pattern.error_type,
                    "analysis": fix_analysis,
                    "requires_review": True,
                    "reason": f"Confidence level is {error_pattern.confidence.value}",
                }

        except Exception as e:
            logger.error(f"Error processing Sentry webhook: {e}")
            return {"status": "processing_error", "error": str(e)}


# FastAPI app for receiving Sentry webhooks
app = FastAPI(title="Sentry Auto-Fixer", version="1.0.0")
auto_fixer = SentryAutoFixer()


@app.post("/sentry/webhook")
async def handle_sentry_webhook(request: Request):
    """Handle incoming Sentry webhook for error alerts"""
    try:
        payload = await request.json()

        # Only process error events
        if (
            payload.get("action") != "created"
            or payload.get("data", {}).get("issue", {}).get("type") != "error"
        ):
            return {"status": "ignored", "reason": "Not an error event"}

        # Process the error
        result = await auto_fixer.process_sentry_error(payload)

        logger.info(f"Processed Sentry error: {result}")
        return result

    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status")
async def get_status():
    """Get auto-fixer status and recent fixes"""
    return {
        "status": "running",
        "recent_fixes": auto_fixer.fix_history[-10:],  # Last 10 fixes
        "active_fixes": len(auto_fixer.active_fixes),
        "supported_error_types": [
            p.error_type for p in auto_fixer.error_patterns if p.auto_fixable
        ],
    }


@app.get("/fix-history")
async def get_fix_history():
    """Get complete fix history"""
    return {
        "total_fixes": len(auto_fixer.fix_history),
        "history": auto_fixer.fix_history,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8003)
