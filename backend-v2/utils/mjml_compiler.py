"""
MJML Template Compiler for BookedBarber
Compiles MJML templates to responsive HTML emails
"""
import os
import tempfile
from typing import Dict, Any, Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape
import logging

try:
    from mjml import mjml_to_html
except ImportError:
    mjml_to_html = None

logger = logging.getLogger(__name__)

class MJMLCompiler:
    """Compiles MJML templates with Jinja2 variable substitution"""
    
    def __init__(self, template_dir: str):
        self.template_dir = template_dir
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'mjml'])
        )
    
    def compile_template(
        self, 
        template_name: str, 
        context: Dict[str, Any],
        fallback_to_html: bool = True
    ) -> tuple[str, str]:
        """
        Compile MJML template to HTML with Jinja2 context
        
        Args:
            template_name: Name of MJML template (e.g., 'appointment_confirmation.mjml')
            context: Variables to substitute in template
            fallback_to_html: If True, fallback to HTML template if MJML fails
            
        Returns:
            Tuple of (html_content, plain_text_content)
        """
        try:
            # First, render Jinja2 template with context
            template = self.jinja_env.get_template(f"emails/transactional/{template_name}")
            mjml_content = template.render(**context)
            
            # Compile MJML to HTML if available
            if mjml_to_html:
                try:
                    result = mjml_to_html(mjml_content)
                    if result['errors']:
                        logger.warning(f"MJML compilation warnings: {result['errors']}")
                    html_content = result['html']
                except Exception as e:
                    logger.error(f"MJML compilation failed: {str(e)}")
                    if fallback_to_html:
                        return self._get_html_fallback(template_name, context)
                    else:
                        raise
            else:
                logger.warning("MJML not available, using HTML fallback")
                if fallback_to_html:
                    return self._get_html_fallback(template_name, context)
                else:
                    raise ImportError("MJML library not available")
            
            # Generate plain text version
            plain_text = self._html_to_text(html_content)
            
            return html_content, plain_text
            
        except Exception as e:
            logger.error(f"Template compilation failed for {template_name}: {str(e)}")
            if fallback_to_html:
                return self._get_html_fallback(template_name, context)
            else:
                raise
    
    def _get_html_fallback(self, template_name: str, context: Dict[str, Any]) -> tuple[str, str]:
        """Fallback to HTML template if MJML fails"""
        html_template_name = template_name.replace('.mjml', '.html')
        
        try:
            # Try to find corresponding HTML template
            template = self.jinja_env.get_template(f"notifications/{html_template_name}")
            html_content = template.render(**context)
            plain_text = self._html_to_text(html_content)
            return html_content, plain_text
        except Exception as e:
            logger.error(f"HTML fallback failed for {template_name}: {str(e)}")
            # Return basic HTML as last resort
            basic_html = self._create_basic_html(template_name, context)
            return basic_html, self._html_to_text(basic_html)
    
    def _html_to_text(self, html_content: str) -> str:
        """Convert HTML to plain text"""
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            return soup.get_text(separator='\n', strip=True)
        except ImportError:
            # Basic HTML tag removal if BeautifulSoup not available
            import re
            text = re.sub(r'<[^>]+>', '', html_content)
            return text.strip()
    
    def _create_basic_html(self, template_name: str, context: Dict[str, Any]) -> str:
        """Create basic HTML email as last resort"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>BookedBarber Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #0891b2;">BookedBarber</h2>
                <p>This is a notification from BookedBarber.</p>
                <p>Template: {template_name}</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    © {context.get('current_year', '2025')} BookedBarber. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
    
    def preview_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Generate preview HTML for testing"""
        html_content, _ = self.compile_template(template_name, context)
        
        # Wrap in preview container
        preview_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Preview - {template_name}</title>
            <style>
                body {{ margin: 0; padding: 20px; background-color: #f0f0f0; font-family: Arial, sans-serif; }}
                .preview-container {{ max-width: 800px; margin: 0 auto; }}
                .preview-header {{ background: white; padding: 15px; margin-bottom: 10px; border-radius: 5px; }}
                .preview-content {{ border: 1px solid #ddd; }}
            </style>
        </head>
        <body>
            <div class="preview-container">
                <div class="preview-header">
                    <h3>Email Preview: {template_name}</h3>
                    <p>Template compiled with MJML → HTML</p>
                </div>
                <div class="preview-content">
                    {html_content}
                </div>
            </div>
        </body>
        </html>
        """
        return preview_html

# Global compiler instance
_compiler_instance = None

def get_mjml_compiler(template_dir: Optional[str] = None) -> MJMLCompiler:
    """Get global MJML compiler instance"""
    global _compiler_instance
    
    if _compiler_instance is None:
        if template_dir is None:
            # Default to templates directory relative to this file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            template_dir = os.path.join(os.path.dirname(current_dir), 'templates')
        
        _compiler_instance = MJMLCompiler(template_dir)
    
    return _compiler_instance