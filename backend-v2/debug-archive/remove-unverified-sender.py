#!/usr/bin/env python3
"""Remove unverified sender from SendGrid"""

import subprocess
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import settings

# First get the sender ID
get_command = [
    'curl',
    '--request', 'GET',
    '--url', 'https://api.sendgrid.com/v3/verified_senders',
    '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
    '--header', 'Content-Type: application/json',
    '--silent'
]

result = subprocess.run(get_command, capture_output=True, text=True)
if result.returncode == 0:
    senders = json.loads(result.stdout).get('results', [])
    for sender in senders:
        if sender.get('from_email') == 'noreply@bookedbarber.com' and not sender.get('verified'):
            sender_id = sender.get('id')
            print(f"Removing unverified sender: {sender.get('from_email')} (ID: {sender_id})")
            
            # Delete the sender
            delete_command = [
                'curl',
                '--request', 'DELETE',
                '--url', f'https://api.sendgrid.com/v3/verified_senders/{sender_id}',
                '--header', f'Authorization: Bearer {settings.sendgrid_api_key}',
                '--silent'
            ]
            
            delete_result = subprocess.run(delete_command, capture_output=True, text=True)
            if delete_result.returncode == 0:
                print("✅ Successfully removed unverified sender")
            else:
                print(f"❌ Failed to remove: {delete_result.stderr}")
