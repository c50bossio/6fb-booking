"""
Base model configuration for BookedBarber V2
"""

from sqlalchemy.ext.declarative import declarative_base

# Create the declarative base
Base = declarative_base()

# Optional: Add common methods/attributes to all models
class BaseMixin:
    """Common functionality for all models"""
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}