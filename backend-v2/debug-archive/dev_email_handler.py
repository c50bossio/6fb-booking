#!/usr/bin/env python3
"""Development email handler that logs to console instead of sending"""

def send_development_email(to_email: str, subject: str, body: str):
    """Log email to console in development"""
    print(f"""
    ╔════════════════════════════════════════════════════════════════╗
    ║                     📧 EMAIL (DEVELOPMENT MODE)                 ║
    ╠════════════════════════════════════════════════════════════════╣
    ║ To: {to_email:<55} ║
    ║ Subject: {subject:<50} ║
    ╠════════════════════════════════════════════════════════════════╣
    ║ Body:                                                          ║
    ╚════════════════════════════════════════════════════════════════╝
    
{body}
    
    ╚════════════════════════════════════════════════════════════════╝
    """)
    
    # Extract verification link if present
    import re
    link_match = re.search(r'(http[s]?://[^\s<>"]+verify[^\s<>"]*)', body)
    if link_match:
        print(f"🔗 Verification Link: {link_match.group(1)}")
    
    return True
