#!/usr/bin/env python3
"""
Capture and store Trafft webhook data for analysis
"""
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime, Text, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

Base = declarative_base()

class WebhookLog(Base):
    __tablename__ = "webhook_logs"
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    event_type = Column(String(100))
    content_type = Column(String(100))
    body_raw = Column(Text)
    body_parsed = Column(Text)
    headers = Column(Text)

# Create a simple SQLite database to store webhook data
engine = create_engine("sqlite:///trafft_webhooks.db")
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

def log_webhook(event_type, content_type, body_raw, body_parsed, headers):
    """Log webhook data to database"""
    session = Session()
    log_entry = WebhookLog(
        event_type=event_type,
        content_type=content_type,
        body_raw=body_raw,
        body_parsed=json.dumps(body_parsed) if isinstance(body_parsed, dict) else str(body_parsed),
        headers=json.dumps(headers) if isinstance(headers, dict) else str(headers)
    )
    session.add(log_entry)
    session.commit()
    session.close()

def view_recent_webhooks(limit=10):
    """View recent webhook logs"""
    session = Session()
    logs = session.query(WebhookLog).order_by(WebhookLog.timestamp.desc()).limit(limit).all()
    
    print(f"\n📋 Recent Trafft Webhooks (Last {limit})")
    print("=" * 80)
    
    for log in logs:
        print(f"\n🕐 {log.timestamp}")
        print(f"📌 Event: {log.event_type}")
        print(f"📄 Content-Type: {log.content_type}")
        print(f"📦 Raw Body: {log.body_raw[:200]}...")
        
        if log.body_parsed:
            try:
                parsed = json.loads(log.body_parsed)
                print(f"✅ Parsed Data:")
                print(json.dumps(parsed, indent=2)[:500])
            except:
                print(f"📝 Parsed: {log.body_parsed[:200]}")
        
        print("-" * 80)
    
    session.close()

if __name__ == "__main__":
    view_recent_webhooks()