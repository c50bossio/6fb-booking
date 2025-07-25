import logging

class AuditLogger:
    def __init__(self):
        self.logger = logging.getLogger('audit_console')
    def log_action(self, action, user_id=None, details=None):
        print(f'AUDIT: {action}, User: {user_id}')

def get_audit_logger():
    return AuditLogger()