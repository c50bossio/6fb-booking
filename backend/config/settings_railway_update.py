# Add this to the is_allowed_origin method in settings.py

        # Check Railway deployment patterns
        if origin.startswith("https://") and origin.endswith(".railway.app"):
            # Allow any Railway deployment URL
            logger.info(f"Allowing Railway origin: {origin}")
            return True
            
        # Specific Railway URLs
        railway_urls = [
            "https://web-production-92a6c.up.railway.app",
            "https://6fb-booking-frontend.up.railway.app",
        ]
        if origin in railway_urls:
            logger.info(f"Allowing specific Railway origin: {origin}")
            return True
