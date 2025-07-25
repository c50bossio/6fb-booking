import logging

class AuditLogger:
    def __init__(self):
        self.logger = logging.getLogger('audit_console')
    
    def log_action(self, action, user_id=None, details=None):
        print(f'AUDIT: {action}, User: {user_id}')
    
    def log_auth_event(self, event_type, user_id=None, ip_address=None, details=None):
        """Log authentication events like login_success, login_failure, etc."""
        print(f'AUDIT AUTH: {event_type}, User: {user_id}, IP: {ip_address}, Details: {details}')

def get_audit_logger():
    return AuditLogger()