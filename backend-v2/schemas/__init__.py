"""
Schemas package for BookedBarber V2.
Contains Pydantic models for API request/response validation.
"""

# Re-export schemas from the existing schemas files
try:
    # Import core schemas (DateRange, etc.)
    from .core import *
except ImportError:
    pass

try:
    # Import basic schemas (User, SlotsResponse, etc.)
    from .basic import *
except ImportError:
    pass

try:
    # Import auth schemas
    from .auth import *
except ImportError:
    pass

try:
    # Try importing from integration schemas first
    from .integration import *
except ImportError:
    pass

try:
    # Try importing from review schemas
    from .review import *
except ImportError:
    pass

try:
    # Try importing from booking schemas
    from .booking import *
except ImportError:
    pass

# Note: Removed circular imports that were causing startup issues
# If you need these schemas, import them directly from their respective modules