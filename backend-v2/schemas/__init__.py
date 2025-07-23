"""
Schemas package for BookedBarber V2 API

This package contains Pydantic response schemas for all V2 API endpoints.
"""

# Import commonly used schemas from the main schemas.py file
# Avoid circular imports by using direct module import
import importlib.util
import os

# Import DateRange from the parent schemas.py file
schemas_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'schemas.py')
spec = importlib.util.spec_from_file_location("parent_schemas", schemas_path)
parent_schemas = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parent_schemas)

# Import commonly used schemas to avoid circular imports
DateRange = parent_schemas.DateRange
UserType = parent_schemas.UserType
Token = parent_schemas.Token
UserLogin = parent_schemas.UserLogin
BaseResponse = parent_schemas.BaseResponse

# Add all commonly imported schemas
__all__ = ["DateRange", "UserType", "Token", "UserLogin", "BaseResponse"]

# Make the parent schemas module accessible through this module
def __getattr__(name):
    """Fallback to parent schemas for any attribute not explicitly imported"""
    return getattr(parent_schemas, name)