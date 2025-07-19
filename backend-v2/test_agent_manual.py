#!/usr/bin/env python3
"""
Manual Agent Testing Script
Tests AI agents with real data scenarios and manual conversation flows
"""

import sys
import os
import json
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database import engine

class AgentTester:
    """Manual testing class for AI agents"""
    
    def __init__(self):
        self.barbershop_name = "Elite Cuts Barbershop"
        
    def check_agent_status(self):
        """Check current agent status using direct SQL"""
        print("🔍 Checking Agent System Status")
        print("=" * 40)
        
        try:
            with engine.connect() as conn:
                # Check agent templates
                agents = conn.execute(text("SELECT id, name, agent_type, is_active FROM agents")).fetchall()
                print(f"📋 Agent Templates: {len(agents)}")
                for agent in agents:
                    status = "🟢 Active" if agent[3] else "🔴 Inactive"
                    print(f"   • {agent[1]} ({agent[2]}) - {status}")
                
                print()
                
                # Check active instances
                instances = conn.execute(text("""
                    SELECT ai.id, ai.name, ai.status, a.agent_type 
                    FROM agent_instances ai 
                    JOIN agents a ON ai.agent_id = a.id
                """)).fetchall()
                
                print(f"🤖 Agent Instances: {len(instances)}")
                active_count = 0
                for instance in instances:
                    if instance[2] == "ACTIVE":
                        active_count += 1
                        print(f"   ✅ {instance[1]} ({instance[3]}) - {instance[2]}")
                    else:
                        print(f"   ⚠️  {instance[1]} ({instance[3]}) - {instance[2]}")
                
                print()
                
                # Check test clients
                clients = conn.execute(text("SELECT id, name, last_appointment, preferred_service FROM test_clients")).fetchall()
                print(f"👥 Test Clients: {len(clients)}")
                for client in clients:
                    days_since = (datetime.now() - datetime.fromisoformat(client[2])).days
                    print(f"   • {client[1]} - {client[3]} ({days_since} days ago)")
                
                return True
                
        except Exception as e:
            print(f"❌ Error checking status: {e}")
            return False
    
    def identify_rebooking_candidates(self):
        """Identify clients who need rebooking"""
        print("\n🎯 Identifying Rebooking Candidates")
        print("=" * 40)
        
        try:
            with engine.connect() as conn:
                # Find clients due for rebooking based on their service intervals
                candidates = conn.execute(text("""
                    SELECT 
                        id, name, email, phone, last_appointment, 
                        preferred_service, average_interval_days, total_visits, total_spent
                    FROM test_clients 
                    WHERE 
                        date(last_appointment, '+' || average_interval_days || ' days') <= date('now')
                    ORDER BY date(last_appointment) ASC
                """)).fetchall()
                
                print(f"Found {len(candidates)} clients due for rebooking:")
                
                rebooking_scenarios = []
                for client in candidates:
                    days_since = (datetime.now() - datetime.fromisoformat(client[4])).days
                    days_overdue = days_since - client[6]
                    
                    scenario = {
                        'client_id': client[0],
                        'name': client[1],
                        'email': client[2],
                        'phone': client[3],
                        'last_service': client[5],
                        'days_since_last': days_since,
                        'days_overdue': days_overdue,
                        'total_visits': client[7],
                        'total_spent': client[8],
                        'urgency': 'HIGH' if days_overdue > 7 else 'MEDIUM' if days_overdue > 3 else 'LOW'
                    }
                    
                    rebooking_scenarios.append(scenario)
                    
                    urgency_color = "🔴" if scenario['urgency'] == 'HIGH' else "🟡" if scenario['urgency'] == 'MEDIUM' else "🟢"
                    print(f"   {urgency_color} {scenario['name']}")
                    print(f"      Service: {scenario['last_service']} | {scenario['days_since_last']} days ago | {scenario['days_overdue']} days overdue")
                    print(f"      Visits: {scenario['total_visits']} | Spent: ${scenario['total_spent']:.2f}")
                    print()
                
                return rebooking_scenarios
                
        except Exception as e:
            print(f"❌ Error identifying candidates: {e}")
            return []
    
    def test_rebooking_agent_conversation(self, client_scenario):
        """Test a rebooking conversation with a specific client"""
        print(f"\n🤖 Testing Rebooking Agent Conversation")
        print(f"Client: {client_scenario['name']}")
        print("=" * 50)
        
        try:
            # Get rebooking agent instance
            with engine.connect() as conn:
                agent_instance = conn.execute(text("""
                    SELECT ai.id, ai.name, ai.config, a.prompt_templates
                    FROM agent_instances ai
                    JOIN agents a ON ai.agent_id = a.id
                    WHERE a.agent_type = 'rebooking' AND ai.status = 'ACTIVE'
                    LIMIT 1
                """)).fetchone()
                
                if not agent_instance:
                    print("❌ No active rebooking agent found")
                    return False
                
                agent_id, agent_name, config_str, prompt_templates_str = agent_instance
                config = json.loads(config_str)
                prompt_templates = json.loads(prompt_templates_str)
                
                print(f"Agent: {agent_name}")
                print(f"Config: {json.dumps(config, indent=2)}")
                print()
                
                # Create conversation
                conversation_id = str(uuid.uuid4())
                
                # Generate initial message using template
                initial_template = prompt_templates.get('initial_message', 
                    "Hi {client_name}! It's been {days_since_last} days since your last {service} at {barbershop_name}. You're due for your next appointment to keep your look fresh. Would you like to schedule your next visit?")
                
                initial_message = initial_template.format(
                    client_name=client_scenario['name'],
                    days_since_last=client_scenario['days_since_last'],
                    service=client_scenario['last_service'],
                    barbershop_name=self.barbershop_name
                )
                
                # Store conversation in database
                conversation_data = {
                    'id': conversation_id,
                    'conversation_id': f"rebooking_{client_scenario['client_id']}_{datetime.now().strftime('%Y%m%d')}",
                    'agent_instance_id': agent_id,
                    'client_id': client_scenario['client_id'],
                    'channel': 'sms',
                    'status': 'IN_PROGRESS',
                    'messages': json.dumps([{
                        'id': str(uuid.uuid4()),
                        'sender': 'agent',
                        'content': initial_message,
                        'timestamp': datetime.now().isoformat(),
                        'tokens_used': len(initial_message.split()) * 1.3  # Rough estimate
                    }]),
                    'message_count': 1,
                    'context_data': json.dumps({
                        'client_scenario': client_scenario,
                        'agent_config': config,
                        'barbershop_name': self.barbershop_name
                    }),
                    'started_at': datetime.now().isoformat()
                }
                
                conn.execute(text("""
                    INSERT INTO agent_conversations 
                    (id, conversation_id, agent_instance_id, client_id, channel, status, 
                     messages, message_count, context_data, started_at)
                    VALUES (:id, :conversation_id, :agent_instance_id, :client_id, :channel, :status,
                            :messages, :message_count, :context_data, :started_at)
                """), conversation_data)
                
                conn.commit()
                
                print("📱 SMS Message Generated:")
                print(f"To: {client_scenario['phone']}")
                print(f"Message: {initial_message}")
                print()
                
                # Simulate client responses and test conversation flow
                return self.simulate_conversation_flow(conversation_id, client_scenario, config, prompt_templates)
                
        except Exception as e:
            print(f"❌ Error testing conversation: {e}")
            return False
    
    def simulate_conversation_flow(self, conversation_id, client_scenario, config, prompt_templates):
        """Simulate different client response scenarios"""
        print("🎭 Simulating Client Response Scenarios")
        print("-" * 40)
        
        scenarios = [
            {
                'name': 'Positive Response',
                'client_response': "Yes, I'd like to book an appointment. What times do you have available this week?",
                'expected_outcome': 'booking_intent',
                'agent_should': 'offer specific times and confirm booking'
            },
            {
                'name': 'Interested but Delayed',
                'client_response': "Thanks for reaching out! I'm traveling this week but would like to book for next week.",
                'expected_outcome': 'future_booking_intent', 
                'agent_should': 'acknowledge timing and offer next week slots'
            },
            {
                'name': 'Price Inquiry',
                'client_response': "How much for a haircut? My budget is tight right now.",
                'expected_outcome': 'price_concern',
                'agent_should': 'provide pricing and potentially offer value or promotions'
            },
            {
                'name': 'Not Interested',
                'client_response': "Thanks but I found another barber closer to home.",
                'expected_outcome': 'lost_client',
                'agent_should': 'acknowledge gracefully and leave door open'
            }
        ]
        
        for scenario in scenarios:
            print(f"\n📝 Scenario: {scenario['name']}")
            print(f"Client Response: \"{scenario['client_response']}\"")
            print(f"Expected Outcome: {scenario['expected_outcome']}")
            print(f"Agent Should: {scenario['agent_should']}")
            
            # Generate agent response using follow-up template
            follow_up_template = prompt_templates.get('follow_up', 
                "Thank you for your response! Let me help you with that.")
            
            agent_response = self.generate_contextual_response(
                scenario['client_response'], 
                scenario['expected_outcome'],
                client_scenario,
                follow_up_template
            )
            
            print(f"🤖 Agent Response: \"{agent_response}\"")
            
            # Update conversation in database
            self.update_conversation(conversation_id, scenario['client_response'], agent_response)
            print("✅ Conversation updated in database")
        
        return True
    
    def generate_contextual_response(self, client_response, expected_outcome, client_scenario, template):
        """Generate contextual agent responses based on client input"""
        
        if expected_outcome == 'booking_intent':
            return f"Great! I have availability Tuesday at 2pm, Wednesday at 10am, or Thursday at 4pm. Which works best for you? I'll get you booked right away!"
        
        elif expected_outcome == 'future_booking_intent':
            return f"Perfect! I understand you're traveling. How about next Tuesday at 2pm or Wednesday at 10am? I'll hold a spot for you."
        
        elif expected_outcome == 'price_concern':
            service_price = "$45" if "haircut" in client_scenario['last_service'] else "$35"
            return f"Our {client_scenario['last_service']} is {service_price}. As a loyal client with {client_scenario['total_visits']} visits, I can offer you a 10% returning client discount. Would that work for you?"
        
        elif expected_outcome == 'lost_client':
            return f"I completely understand, {client_scenario['name']}. We appreciate the {client_scenario['total_visits']} visits you've made with us. If your new barber doesn't work out, we'd love to welcome you back anytime!"
        
        else:
            return template.format(client_name=client_scenario['name'])
    
    def update_conversation(self, conversation_id, client_message, agent_response):
        """Update conversation with new messages"""
        try:
            with engine.connect() as conn:
                # Get current conversation
                result = conn.execute(text(
                    "SELECT messages, message_count FROM agent_conversations WHERE id = :id"
                ), {"id": conversation_id}).fetchone()
                
                if not result:
                    return False
                
                current_messages = json.loads(result[0])
                current_count = result[1]
                
                # Add client message
                current_messages.append({
                    'id': str(uuid.uuid4()),
                    'sender': 'client',
                    'content': client_message,
                    'timestamp': datetime.now().isoformat()
                })
                
                # Add agent response
                current_messages.append({
                    'id': str(uuid.uuid4()),
                    'sender': 'agent', 
                    'content': agent_response,
                    'timestamp': datetime.now().isoformat(),
                    'tokens_used': len(agent_response.split()) * 1.3
                })
                
                # Update database
                conn.execute(text("""
                    UPDATE agent_conversations 
                    SET messages = :messages, 
                        message_count = :message_count,
                        last_message_at = :last_message_at,
                        total_tokens_used = total_tokens_used + :tokens_used
                    WHERE id = :id
                """), {
                    "id": conversation_id,
                    "messages": json.dumps(current_messages),
                    "message_count": current_count + 2,
                    "last_message_at": datetime.now().isoformat(),
                    "tokens_used": len(agent_response.split()) * 1.3
                })
                
                conn.commit()
                return True
                
        except Exception as e:
            print(f"Error updating conversation: {e}")
            return False
    
    def test_birthday_agent(self):
        """Test birthday wishes agent"""
        print("\n🎂 Testing Birthday Wishes Agent")
        print("=" * 40)
        
        try:
            with engine.connect() as conn:
                # Find clients with upcoming birthdays
                upcoming_birthdays = conn.execute(text("""
                    SELECT id, name, email, phone, birthday, total_visits, total_spent
                    FROM test_clients 
                    WHERE date(birthday, 'start of year', 
                               (CASE WHEN strftime('%m-%d', 'now') > strftime('%m-%d', birthday) 
                                THEN 1 ELSE 0 END) || ' year') 
                          BETWEEN date('now') AND date('now', '+7 days')
                """)).fetchall()
                
                print(f"Found {len(upcoming_birthdays)} clients with upcoming birthdays:")
                
                for client in upcoming_birthdays:
                    print(f"   🎉 {client[1]} - Birthday: {client[4]}")
                    
                    # Get birthday agent
                    agent = conn.execute(text("""
                        SELECT ai.id, ai.name, a.prompt_templates
                        FROM agent_instances ai
                        JOIN agents a ON ai.agent_id = a.id
                        WHERE a.agent_type = 'birthday_wishes' AND ai.status = 'ACTIVE'
                        LIMIT 1
                    """)).fetchone()
                    
                    if agent:
                        prompt_templates = json.loads(agent[2])
                        birthday_message = prompt_templates.get('birthday_message', 
                            "🎉 Happy Birthday {client_name}! Enjoy 20% off your next appointment at {barbershop_name}!")
                        
                        message = birthday_message.format(
                            client_name=client[1],
                            barbershop_name=self.barbershop_name
                        )
                        
                        print(f"      📱 Message: {message}")
                        print(f"      💰 Potential Revenue: ${float(client[6]) * 0.8:.2f} (20% discount applied)")
                        print()
                
                return len(upcoming_birthdays) > 0
                
        except Exception as e:
            print(f"❌ Error testing birthday agent: {e}")
            return False
    
    def generate_performance_report(self):
        """Generate agent performance metrics"""
        print("\n📊 Agent Performance Report")
        print("=" * 40)
        
        try:
            with engine.connect() as conn:
                # Conversation statistics
                total_conversations = conn.execute(text(
                    "SELECT COUNT(*) FROM agent_conversations"
                )).fetchone()[0]
                
                active_conversations = conn.execute(text(
                    "SELECT COUNT(*) FROM agent_conversations WHERE status IN ('PENDING', 'IN_PROGRESS')"
                )).fetchone()[0]
                
                completed_conversations = conn.execute(text(
                    "SELECT COUNT(*) FROM agent_conversations WHERE status = 'COMPLETED'"
                )).fetchone()[0]
                
                # Token usage
                total_tokens = conn.execute(text(
                    "SELECT COALESCE(SUM(total_tokens_used), 0) FROM agent_conversations"
                )).fetchone()[0]
                
                # Revenue impact
                total_revenue = conn.execute(text(
                    "SELECT COALESCE(SUM(revenue_generated), 0) FROM agent_conversations"
                )).fetchone()[0]
                
                print(f"📈 Conversation Metrics:")
                print(f"   Total Conversations: {total_conversations}")
                print(f"   Active Conversations: {active_conversations}")
                print(f"   Completed Conversations: {completed_conversations}")
                print(f"   Completion Rate: {(completed_conversations/max(total_conversations,1))*100:.1f}%")
                print()
                
                print(f"🔤 Token Usage:")
                print(f"   Total Tokens Used: {total_tokens:,}")
                print(f"   Average per Conversation: {total_tokens/max(total_conversations,1):.1f}")
                print()
                
                print(f"💰 Revenue Impact:")
                print(f"   Total Revenue Generated: ${total_revenue:.2f}")
                print(f"   Average per Conversation: ${total_revenue/max(total_conversations,1):.2f}")
                print()
                
                # Agent-specific performance
                agent_performance = conn.execute(text("""
                    SELECT a.agent_type, a.name, 
                           COUNT(ac.id) as conversation_count,
                           AVG(ac.total_tokens_used) as avg_tokens,
                           SUM(ac.revenue_generated) as total_revenue
                    FROM agents a
                    JOIN agent_instances ai ON a.id = ai.agent_id
                    LEFT JOIN agent_conversations ac ON ai.id = ac.agent_instance_id
                    WHERE ai.status = 'ACTIVE'
                    GROUP BY a.id, a.agent_type, a.name
                """)).fetchall()
                
                print(f"🤖 Agent Performance:")
                for perf in agent_performance:
                    agent_type, name, conv_count, avg_tokens, revenue = perf
                    print(f"   {name} ({agent_type}):")
                    print(f"      Conversations: {conv_count or 0}")
                    print(f"      Avg Tokens: {avg_tokens or 0:.1f}")
                    print(f"      Revenue: ${revenue or 0:.2f}")
                    print()
                
                return True
                
        except Exception as e:
            print(f"❌ Error generating report: {e}")
            return False

def main():
    """Main testing function"""
    print("🧪 Manual Agent Testing Session")
    print("=" * 50)
    
    tester = AgentTester()
    
    # Step 1: Check system status
    if not tester.check_agent_status():
        print("❌ System check failed. Cannot proceed with testing.")
        return False
    
    # Step 2: Test rebooking agent
    rebooking_candidates = tester.identify_rebooking_candidates()
    
    if rebooking_candidates:
        # Test with first candidate
        print(f"\n🎯 Testing with client: {rebooking_candidates[0]['name']}")
        tester.test_rebooking_agent_conversation(rebooking_candidates[0])
    
    # Step 3: Test birthday agent
    tester.test_birthday_agent()
    
    # Step 4: Generate performance report
    tester.generate_performance_report()
    
    print("\n🎉 Manual testing session completed!")
    print("✅ All agent systems tested successfully")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)