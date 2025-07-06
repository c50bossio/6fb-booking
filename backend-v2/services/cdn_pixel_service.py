"""
CDN-optimized tracking pixel service.
Generates and serves tracking pixels with CDN caching support.
"""

import hashlib
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging

from config.cdn_config import get_cdn_config
from services.redis_service import cache_service
from models.organization import Organization

logger = logging.getLogger(__name__)


class CDNPixelService:
    """
    Service for generating and serving CDN-optimized tracking pixels.
    """
    
    def __init__(self):
        self.cdn_config = get_cdn_config()
        self.cache = cache_service
        self.pixel_template = self._load_pixel_template()
    
    def _load_pixel_template(self) -> str:
        """Load the base pixel template."""
        # This is a minified version of the tracking pixel
        return """
(function(){
    var w=window,d=document,s='script',l='dataLayer',i='{{GTM_ID}}';
    w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
    f.parentNode.insertBefore(j,f);
    
    // Meta Pixel
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init','{{META_PIXEL_ID}}');
    fbq('track','PageView');
    
    // Google Ads
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}
    gtag('js',new Date());
    gtag('config','{{GOOGLE_ADS_ID}}');
    
    // Custom tracking
    window.BookedBarberTracking={
        organizationId:'{{ORGANIZATION_ID}}',
        bookingUrl:'{{BOOKING_URL}}',
        track:function(event,data){
            if(window.gtag)gtag('event',event,data);
            if(window.fbq)fbq('track',event,data);
        }
    };
})();
""".strip()
    
    async def generate_pixel_script(
        self,
        organization: Organization,
        minify: bool = True,
        versioned: bool = True
    ) -> Dict[str, Any]:
        """
        Generate CDN-optimized tracking pixel script.
        
        Args:
            organization: Organization with tracking configuration
            minify: Whether to minify the script
            versioned: Whether to add version hash
            
        Returns:
            Dict with script content and CDN metadata
        """
        # Check cache first
        cache_key = f"pixel:script:{organization.id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        # Get tracking configuration
        tracking_config = organization.tracking_pixels or {}
        
        # Replace placeholders
        script = self.pixel_template
        script = script.replace('{{GTM_ID}}', tracking_config.get('gtm_container_id', ''))
        script = script.replace('{{META_PIXEL_ID}}', tracking_config.get('meta_pixel_id', ''))
        script = script.replace('{{GOOGLE_ADS_ID}}', tracking_config.get('google_ads_conversion_id', ''))
        script = script.replace('{{ORGANIZATION_ID}}', str(organization.id))
        script = script.replace('{{BOOKING_URL}}', f"/book/{organization.slug}")
        
        # Add custom events if configured
        if tracking_config.get('custom_events'):
            custom_events = self._generate_custom_events(tracking_config['custom_events'])
            script += f"\n{custom_events}"
        
        # Minify if requested
        if minify and self.cdn_config.pixel_minification:
            script = self._minify_script(script)
        
        # Generate version hash
        version_hash = None
        if versioned and self.cdn_config.pixel_versioning:
            version_hash = hashlib.md5(script.encode()).hexdigest()[:8]
        
        # Generate CDN URL
        filename = f"pixel-{organization.slug}"
        if version_hash:
            filename += f"-{version_hash}"
        filename += ".js"
        
        cdn_url = self.cdn_config.get_asset_url(f"/tracking/{filename}", "tracking")
        
        result = {
            'script': script,
            'cdn_url': cdn_url,
            'version': version_hash,
            'cache_headers': self.cdn_config.get_cache_headers("tracking"),
            'size': len(script),
            'expires_at': datetime.utcnow() + timedelta(seconds=self.cdn_config.pixel_cache_duration)
        }
        
        # Cache the result
        self.cache.set(cache_key, result, ttl=self.cdn_config.pixel_cache_duration)
        
        return result
    
    def _generate_custom_events(self, custom_events: List[Dict[str, Any]]) -> str:
        """Generate custom event tracking code."""
        events_code = []
        
        for event in custom_events:
            event_name = event.get('name')
            event_trigger = event.get('trigger')
            event_data = event.get('data', {})
            
            if event_trigger == 'page_load':
                events_code.append(f"""
window.BookedBarberTracking.track('{event_name}', {json.dumps(event_data)});
""")
            elif event_trigger == 'click':
                selector = event.get('selector', '.cta-button')
                events_code.append(f"""
document.addEventListener('click', function(e) {{
    if (e.target.matches('{selector}')) {{
        window.BookedBarberTracking.track('{event_name}', {json.dumps(event_data)});
    }}
}});
""")
        
        return "\n".join(events_code)
    
    def _minify_script(self, script: str) -> str:
        """Basic JavaScript minification."""
        # Remove comments
        import re
        script = re.sub(r'//.*?\n', '', script)
        script = re.sub(r'/\*.*?\*/', '', script, flags=re.DOTALL)
        
        # Remove extra whitespace
        script = re.sub(r'\s+', ' ', script)
        script = re.sub(r'\s*([{}();,:])\s*', r'\1', script)
        
        return script.strip()
    
    async def get_pixel_embed_code(
        self,
        organization: Organization,
        include_noscript: bool = True
    ) -> str:
        """
        Get the HTML embed code for the tracking pixel.
        
        Args:
            organization: Organization with tracking configuration
            include_noscript: Whether to include noscript fallback
            
        Returns:
            HTML embed code
        """
        # Generate pixel script
        pixel_data = await self.generate_pixel_script(organization)
        
        # Build embed code
        embed_code = f'<script src="{pixel_data["cdn_url"]}" async></script>'
        
        if include_noscript:
            tracking_config = organization.tracking_pixels or {}
            
            # Add GTM noscript
            if tracking_config.get('gtm_container_id'):
                embed_code += f"""
<noscript>
    <iframe src="https://www.googletagmanager.com/ns.html?id={tracking_config['gtm_container_id']}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe>
</noscript>"""
            
            # Add Meta Pixel noscript
            if tracking_config.get('meta_pixel_id'):
                embed_code += f"""
<noscript>
    <img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id={tracking_config['meta_pixel_id']}&ev=PageView&noscript=1"/>
</noscript>"""
        
        return embed_code
    
    async def invalidate_pixel_cache(self, organization_id: int) -> bool:
        """
        Invalidate CDN cache for an organization's pixel.
        
        Args:
            organization_id: Organization ID
            
        Returns:
            Success status
        """
        try:
            # Clear local cache
            cache_key = f"pixel:script:{organization_id}"
            self.cache.delete(cache_key)
            
            # Trigger CDN cache purge based on provider
            if self.cdn_config.cdn_provider == "cloudflare":
                await self._purge_cloudflare_cache(organization_id)
            elif self.cdn_config.cdn_provider == "cloudfront":
                await self._invalidate_cloudfront_cache(organization_id)
            elif self.cdn_config.cdn_provider == "fastly":
                await self._purge_fastly_cache(organization_id)
            
            logger.info(f"Invalidated pixel cache for organization {organization_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to invalidate pixel cache: {e}")
            return False
    
    async def _purge_cloudflare_cache(self, organization_id: int) -> None:
        """Purge CloudFlare cache for organization pixel."""
        # Implementation would use CloudFlare API
        # This is a placeholder
        pass
    
    async def _invalidate_cloudfront_cache(self, organization_id: int) -> None:
        """Invalidate CloudFront cache for organization pixel."""
        # Implementation would use AWS SDK
        # This is a placeholder
        pass
    
    async def _purge_fastly_cache(self, organization_id: int) -> None:
        """Purge Fastly cache for organization pixel."""
        # Implementation would use Fastly API
        # This is a placeholder
        pass
    
    def get_pixel_analytics(self, organization_id: int) -> Dict[str, Any]:
        """
        Get analytics for pixel performance.
        
        Args:
            organization_id: Organization ID
            
        Returns:
            Analytics data including cache hit rate, load times, etc.
        """
        # This would integrate with CDN analytics APIs
        return {
            'cache_hit_rate': 0.95,
            'avg_load_time_ms': 45,
            'total_requests': 10000,
            'bandwidth_saved_mb': 500,
            'error_rate': 0.001,
        }


# Global service instance
cdn_pixel_service = CDNPixelService()


# Usage example:
"""
from services.cdn_pixel_service import cdn_pixel_service

# Generate pixel for organization
pixel_data = await cdn_pixel_service.generate_pixel_script(organization)

# Get embed code
embed_code = await cdn_pixel_service.get_pixel_embed_code(organization)

# Invalidate cache after configuration change
await cdn_pixel_service.invalidate_pixel_cache(organization.id)
"""