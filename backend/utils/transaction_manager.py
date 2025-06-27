"""
Transaction manager for database operations with proper isolation levels
"""

from enum import Enum
from typing import Optional, Any, Callable
from contextlib import contextmanager
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging

logger = logging.getLogger(__name__)


class IsolationLevel(Enum):
    """Database isolation levels"""

    READ_UNCOMMITTED = "READ UNCOMMITTED"
    READ_COMMITTED = "READ COMMITTED"
    REPEATABLE_READ = "REPEATABLE READ"
    SERIALIZABLE = "SERIALIZABLE"


class TransactionManager:
    """Manages database transactions with isolation levels"""

    def __init__(self, session: Session):
        self.session = session

    @contextmanager
    def transaction(self, isolation_level: Optional[IsolationLevel] = None):
        """Context manager for database transactions"""
        if isolation_level:
            # Set isolation level for this transaction
            self.session.execute(
                f"SET TRANSACTION ISOLATION LEVEL {isolation_level.value}"
            )

        try:
            yield self.session
            self.session.commit()
        except Exception as e:
            self.session.rollback()
            logger.error(f"Transaction failed: {str(e)}")
            raise
        finally:
            self.session.close()

    def execute_with_retry(
        self,
        operation: Callable,
        max_retries: int = 3,
        isolation_level: Optional[IsolationLevel] = None,
    ) -> Any:
        """Execute operation with retry logic for deadlocks"""
        for attempt in range(max_retries):
            try:
                with self.transaction(isolation_level=isolation_level) as session:
                    return operation(session)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"Transaction attempt {attempt + 1} failed: {str(e)}")
