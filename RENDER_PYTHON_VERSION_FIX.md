# Render Python Version Configuration Fix

## Issue
Render was attempting to use Python 3.11 instead of Python 3.11.10, even though we had set the PYTHON_VERSION environment variable to "3.11.10".

## Root Cause
The render.yaml file was using the incorrect syntax:
```yaml
runtime: python-3.11
```

This syntax forces Render to use Python 3.11 and ignores the PYTHON_VERSION environment variable.

## Solution
Changed the render.yaml configuration from:
```yaml
runtime: python-3.11
```

To:
```yaml
env: python
```

## How It Works
- When using `env: python`, Render respects the PYTHON_VERSION environment variable
- We already have `PYTHON_VERSION: "3.11.10"` set in the envVars section
- The .python-version files in the root and backend directories also specify 3.11.10 as a fallback

## Verification
After deployment, Render should now use Python 3.11.10 as specified in:
1. PYTHON_VERSION environment variable in render.yaml
2. .python-version files in the project

## References
- [Render Docs: Setting Your Python Version](https://render.com/docs/python-version)
- [Render Changelog: Default Python version updated to 3.11.10](https://render.com/changelog/default-python-version-updated-to-3-11-10)
