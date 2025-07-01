"""
Short URL redirect handler for BookedBarber branded links
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import logging
from typing import Dict, Any

from database import get_db
from utils.url_shortener import url_shortener

router = APIRouter(
    tags=["short-urls"]
)

logger = logging.getLogger(__name__)

@router.get("/{short_code}")
async def redirect_short_url(
    short_code: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Redirect short URLs to their original destinations
    
    This handles branded short links like:
    - bkdbrbr.com/appt123v (appointment view)
    - bkdbrbr.com/appt123c (appointment cancel)  
    - bkdbrbr.com/book (booking page)
    """
    try:
        # Get original URL and track click
        result = url_shortener.get_original_url(db, short_code)
        
        if not result:
            logger.warning(f"Short code not found: {short_code}")
            # Redirect to main booking page as fallback
            return RedirectResponse(
                url="https://app.bookedbarber.com/book",
                status_code=302
            )
        
        original_url = result["original_url"]
        
        # Log the redirect for analytics
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        logger.info(f"Short URL redirect: {short_code} -> {original_url} (IP: {client_ip})")
        
        # Perform the redirect
        return RedirectResponse(url=original_url, status_code=302)
        
    except Exception as e:
        logger.error(f"Error redirecting short URL {short_code}: {str(e)}")
        # Fallback to main site
        return RedirectResponse(
            url="https://app.bookedbarber.com",
            status_code=302
        )

@router.get("/stats/{short_code}")
async def get_short_url_stats(
    short_code: str,
    db: Session = Depends(get_db)
):
    """
    Get statistics for a short URL (admin use)
    """
    try:
        stats = url_shortener.get_stats(db, short_code)
        
        if not stats:
            raise HTTPException(status_code=404, detail="Short URL not found")
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting stats for {short_code}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving stats")

@router.post("/create")
async def create_short_url(
    url_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Create a new short URL (admin use)
    """
    try:
        result = url_shortener.create_short_url(
            db=db,
            original_url=url_data.get("original_url"),
            title=url_data.get("title"),
            description=url_data.get("description"),
            custom_code=url_data.get("custom_code"),
            expires_in_days=url_data.get("expires_in_days"),
            created_by=url_data.get("created_by", "api")
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating short URL: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating short URL")

@router.get("/admin/top-links")
async def get_top_links(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get top clicked short URLs (admin use)
    """
    try:
        top_links = url_shortener.get_top_links(db, limit)
        return {"top_links": top_links}
        
    except Exception as e:
        logger.error(f"Error getting top links: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving top links")

@router.post("/admin/cleanup")
async def cleanup_expired_urls(
    db: Session = Depends(get_db)
):
    """
    Clean up expired short URLs (admin use)
    """
    try:
        count = url_shortener.cleanup_expired_urls(db)
        return {"expired_urls_cleaned": count}
        
    except Exception as e:
        logger.error(f"Error cleaning up expired URLs: {str(e)}")
        raise HTTPException(status_code=500, detail="Error cleaning up URLs")