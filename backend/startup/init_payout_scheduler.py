"""
Initialize the payout scheduler service on application startup
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

from services.payout_scheduler_service import payout_scheduler_service
from config.database import get_async_db
from models.payout_schedule import PayoutSchedule

logger = logging.getLogger(__name__)


async def initialize_payout_scheduler():
    """Initialize and start the payout scheduler service"""
    try:
        # Start the scheduler service
        await payout_scheduler_service.start()
        logger.info("Payout scheduler service started successfully")

        # Load existing schedules
        async with get_async_db() as db:
            # Get all active schedules
            from sqlalchemy import select

            result = await db.execute(
                select(PayoutSchedule).where(
                    PayoutSchedule.is_active == True,
                    PayoutSchedule.auto_payout_enabled == True,
                )
            )
            schedules = result.scalars().all()

            # Schedule jobs for each active schedule
            for schedule in schedules:
                try:
                    await payout_scheduler_service._schedule_payout_job(schedule)
                    logger.info(f"Scheduled payout job for schedule {schedule.id}")
                except Exception as e:
                    logger.error(
                        f"Error scheduling job for schedule {schedule.id}: {str(e)}"
                    )

            logger.info(f"Loaded {len(schedules)} active payout schedules")

    except Exception as e:
        logger.error(f"Error initializing payout scheduler: {str(e)}")
        # Don't fail the entire app startup if scheduler fails
        # It can be started manually later


async def shutdown_payout_scheduler():
    """Shutdown the payout scheduler service"""
    try:
        await payout_scheduler_service.stop()
        logger.info("Payout scheduler service stopped")
    except Exception as e:
        logger.error(f"Error stopping payout scheduler: {str(e)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI app"""
    # Startup
    await initialize_payout_scheduler()

    yield

    # Shutdown
    await shutdown_payout_scheduler()


# Function to add to main.py
def setup_payout_scheduler(app: FastAPI):
    """
    Add this to your main.py file to set up the payout scheduler:

    from startup.init_payout_scheduler import setup_payout_scheduler

    app = FastAPI(lifespan=lifespan)
    # or if you already have a lifespan manager, merge them
    """

    @app.on_event("startup")
    async def startup_event():
        await initialize_payout_scheduler()

    @app.on_event("shutdown")
    async def shutdown_event():
        await shutdown_payout_scheduler()


# Example integration code for main.py
"""
# In your main.py file, add:

from contextlib import asynccontextmanager
from startup.init_payout_scheduler import initialize_payout_scheduler, shutdown_payout_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    await initialize_payout_scheduler()
    # Add other startup tasks here

    yield

    # Shutdown tasks
    await shutdown_payout_scheduler()
    # Add other shutdown tasks here

app = FastAPI(lifespan=lifespan)

# Or if using events:
@app.on_event("startup")
async def startup_event():
    await initialize_payout_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    await shutdown_payout_scheduler()
"""
