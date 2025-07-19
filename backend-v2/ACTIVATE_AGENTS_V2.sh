#!/bin/bash

# ACTIVATE_AGENTS_V2.sh
# AI Agent Activation Script for BookedBarber V2
# Deploys and activates the comprehensive AI agent system for production use

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$SCRIPT_DIR"
VERBOSE=false
DRY_RUN=false
FORCE=false

# Available agent types
AGENT_TYPES=(
    "rebooking"
    "no_show_fee" 
    "birthday_wishes"
    "holiday_greetings"
    "review_request"
    "retention"
    "upsell"
    "appointment_reminder"
)

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage information
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

AI Agent Activation Script for BookedBarber V2
Deploys and activates the comprehensive AI agent system for production use.

OPTIONS:
    -a, --activate TYPE     Activate specific agent type (${AGENT_TYPES[*]})
    -A, --activate-all      Activate all available agent types
    -d, --dry-run          Show what would be done without making changes
    -f, --force            Force activation even if agents already exist
    -v, --verbose          Enable verbose logging
    -s, --status           Check current agent activation status
    -l, --list             List all available agent types
    -t, --test TYPE        Test specific agent functionality
    -h, --help            Show this help message

EXAMPLES:
    # Check current agent status
    $0 --status

    # List all available agent types  
    $0 --list

    # Activate rebooking agent (dry run)
    $0 --activate rebooking --dry-run

    # Activate all agents for production
    $0 --activate-all

    # Test rebooking agent functionality
    $0 --test rebooking

    # Force reactivation of specific agent
    $0 --activate upsell --force

AGENT SYSTEM:
    BookedBarber V2 includes a sophisticated AI agent system with:
    - 8 specialized agent types for different business scenarios
    - Six Figure Barber methodology integration
    - Multi-channel communication (SMS, Email)
    - Automated scheduling and conversation management
    - Performance analytics and optimization

EOF
}

# Parse command line arguments
parse_args() {
    ACTIVATE_TYPE=""
    ACTIVATE_ALL=false
    TEST_TYPE=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -a|--activate)
                ACTIVATE_TYPE="$2"
                shift 2
                ;;
            -A|--activate-all)
                ACTIVATE_ALL=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -s|--status)
                check_agent_status
                exit 0
                ;;
            -l|--list)
                list_agent_types
                exit 0
                ;;
            -t|--test)
                TEST_TYPE="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Validate agent type if specified
    if [[ -n "$ACTIVATE_TYPE" ]] && [[ ! " ${AGENT_TYPES[*]} " =~ " $ACTIVATE_TYPE " ]]; then
        log_error "Invalid agent type: $ACTIVATE_TYPE"
        log_info "Available types: ${AGENT_TYPES[*]}"
        exit 1
    fi

    if [[ -n "$TEST_TYPE" ]] && [[ ! " ${AGENT_TYPES[*]} " =~ " $TEST_TYPE " ]]; then
        log_error "Invalid agent type for testing: $TEST_TYPE"
        log_info "Available types: ${AGENT_TYPES[*]}"
        exit 1
    fi
}

# Check if agent system is ready
check_prerequisites() {
    log_info "Checking AI agent system prerequisites..."

    # Check if we're in the right directory
    if [[ ! -f "$BASE_DIR/main.py" ]]; then
        log_error "main.py not found. Run this script from backend-v2 directory"
        exit 1
    fi

    # Check if agent models exist
    if [[ ! -f "$BASE_DIR/models/agent.py" ]]; then
        log_error "Agent models not found. AI agent system not properly installed"
        exit 1
    fi

    # Check if agent templates exist
    if [[ ! -f "$BASE_DIR/services/agent_templates.py" ]]; then
        log_error "Agent templates not found. AI agent system not properly configured"
        exit 1
    fi

    # Check if database is accessible
    if ! python -c "from database import engine; engine.connect()" 2>/dev/null; then
        log_error "Database connection failed. Check database configuration"
        exit 1
    fi

    # Check if agent tables exist
    if ! python -c "from models.agent import Agent; print('Agent tables ready')" 2>/dev/null; then
        log_error "Agent database tables not found. Run database migrations first"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# List available agent types
list_agent_types() {
    log_info "Available AI Agent Types:"
    echo ""
    
    for agent_type in "${AGENT_TYPES[@]}"; do
        echo -e "${CYAN}  • ${agent_type}${NC}"
        
        # Get description from templates
        description=$(python -c "
from services.agent_templates import AgentTemplates
templates = AgentTemplates.get_all_templates()
print(templates.get('$agent_type', {}).get('description', 'No description available'))
" 2>/dev/null || echo "Description not available")
        
        echo -e "    ${description}"
        echo ""
    done
}

# Check current agent activation status
check_agent_status() {
    log_info "Checking AI agent activation status..."
    
    echo -e "\n${CYAN}=== AGENT TEMPLATES STATUS ===${NC}"
    
    # Check if templates are populated in database
    local template_count=$(python -c "
from sqlalchemy.orm import Session
from database import SessionLocal
from models.agent import Agent

db = SessionLocal()
count = db.query(Agent).count()
db.close()
print(count)
" 2>/dev/null || echo "0")

    echo "Agent templates in database: $template_count"
    
    echo -e "\n${CYAN}=== ACTIVE AGENT INSTANCES ===${NC}"
    
    # Check active agent instances
    python -c "
from sqlalchemy.orm import Session
from database import SessionLocal
from models.agent import Agent, AgentInstance, AgentStatus
from sqlalchemy import func

db = SessionLocal()
try:
    # Get active instances by type
    results = db.query(
        Agent.agent_type, 
        func.count(AgentInstance.id).label('active_count')
    ).outerjoin(AgentInstance, 
        (Agent.id == AgentInstance.agent_id) & 
        (AgentInstance.status == AgentStatus.ACTIVE)
    ).group_by(Agent.agent_type).all()
    
    if results:
        for agent_type, count in results:
            print(f'{agent_type.value}: {count} active instances')
    else:
        print('No agent instances found')
        
except Exception as e:
    print(f'Error checking agent instances: {e}')
finally:
    db.close()
" 2>/dev/null || echo "Could not check agent instances"

    echo -e "\n${CYAN}=== RECENT CONVERSATIONS ===${NC}"
    
    # Check recent conversations
    python -c "
from sqlalchemy.orm import Session
from database import SessionLocal
from models.agent import AgentConversation
from datetime import datetime, timedelta

db = SessionLocal()
try:
    recent_count = db.query(AgentConversation).filter(
        AgentConversation.created_at >= datetime.utcnow() - timedelta(days=7)
    ).count()
    
    total_count = db.query(AgentConversation).count()
    
    print(f'Recent conversations (7 days): {recent_count}')
    print(f'Total conversations: {total_count}')
    
except Exception as e:
    print(f'Error checking conversations: {e}')
finally:
    db.close()
" 2>/dev/null || echo "Could not check conversations"
}

# Populate agent templates in database
populate_agent_templates() {
    log_info "Populating agent templates in database..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would populate agent templates"
        return 0
    fi
    
    # Check if script exists
    if [[ -f "$BASE_DIR/scripts/populate_agent_templates.py" ]]; then
        log_info "Running populate_agent_templates.py..."
        if python scripts/populate_agent_templates.py; then
            log_success "Agent templates populated successfully"
        else
            log_error "Failed to populate agent templates"
            return 1
        fi
    elif [[ -f "$BASE_DIR/populate_agents_simple.py" ]]; then
        log_info "Running populate_agents_simple.py..."
        if python populate_agents_simple.py; then
            log_success "Agent templates populated successfully"
        else
            log_error "Failed to populate agent templates"
            return 1
        fi
    else
        log_error "No agent population script found"
        return 1
    fi
}

# Activate specific agent type
activate_agent() {
    local agent_type=$1
    log_info "Activating ${agent_type} agent..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would activate ${agent_type} agent"
        return 0
    fi
    
    # Check if agent template exists in database
    local exists=$(python -c "
from sqlalchemy.orm import Session
from database import SessionLocal  
from models.agent import Agent, AgentType

db = SessionLocal()
try:
    agent = db.query(Agent).filter(Agent.agent_type == AgentType.${agent_type^^}).first()
    print('true' if agent else 'false')
except:
    print('false')
finally:
    db.close()
" 2>/dev/null || echo "false")

    if [[ "$exists" != "true" ]]; then
        log_warning "Agent template for ${agent_type} not found in database"
        log_info "Populating templates first..."
        populate_agent_templates
    fi
    
    # Create agent activation script
    python -c "
from sqlalchemy.orm import Session
from database import SessionLocal
from models.agent import Agent, AgentInstance, AgentType, AgentStatus
from datetime import datetime
import uuid

agent_type = AgentType.${agent_type^^}
db = SessionLocal()

try:
    # Find the agent template
    agent_template = db.query(Agent).filter(Agent.agent_type == agent_type).first()
    if not agent_template:
        print(f'ERROR: Agent template for {agent_type.value} not found')
        exit(1)
    
    # Check if already has active instance
    existing = db.query(AgentInstance).filter(
        AgentInstance.agent_id == agent_template.id,
        AgentInstance.status == AgentStatus.ACTIVE
    ).first()
    
    force_activation = '$FORCE' == 'true'
    
    if existing and not force_activation:
        print(f'Agent {agent_type.value} already has an active instance')
        exit(0)
    elif existing and force_activation:
        print(f'Force reactivating {agent_type.value} agent')
        existing.status = AgentStatus.INACTIVE
        db.commit()
    
    # Create new agent instance
    instance = AgentInstance(
        id=str(uuid.uuid4()),
        agent_id=agent_template.id,
        name=f'{agent_template.name} Instance',
        status=AgentStatus.ACTIVE,
        config=agent_template.default_config or {},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(instance)
    db.commit()
    
    print(f'Successfully activated {agent_type.value} agent')
    
except Exception as e:
    print(f'ERROR: Failed to activate agent: {e}')
    db.rollback()
    exit(1)
finally:
    db.close()
"
    
    if [[ $? -eq 0 ]]; then
        log_success "${agent_type} agent activated successfully"
    else
        log_error "Failed to activate ${agent_type} agent"
        return 1
    fi
}

# Activate all available agents
activate_all_agents() {
    log_info "Activating all AI agents..."
    
    # First ensure templates are populated
    populate_agent_templates
    
    local success_count=0
    local total_count=${#AGENT_TYPES[@]}
    
    for agent_type in "${AGENT_TYPES[@]}"; do
        if activate_agent "$agent_type"; then
            ((success_count++))
        fi
    done
    
    echo ""
    if [[ $success_count -eq $total_count ]]; then
        log_success "All $total_count agents activated successfully!"
    else
        log_warning "Activated $success_count out of $total_count agents"
    fi
    
    echo ""
    log_info "Agent system activation completed!"
    echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     AI Agents Ready for Production   ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
}

# Test agent functionality
test_agent() {
    local agent_type=$1
    log_info "Testing ${agent_type} agent functionality..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would test ${agent_type} agent"
        return 0
    fi
    
    # Run agent test
    python -c "
from services.agent_templates import AgentTemplates
from models.agent import AgentType

agent_type = AgentType.${agent_type^^}
templates = AgentTemplates.get_all_templates()

if agent_type.value in templates:
    template = templates[agent_type.value]
    print(f'Agent Name: {template[\"name\"]}')
    print(f'Description: {template[\"description\"]}')
    print(f'Config: {template[\"default_config\"]}')
    print('Template validation: PASSED')
else:
    print('Template validation: FAILED')
    exit(1)
"
    
    if [[ $? -eq 0 ]]; then
        log_success "${agent_type} agent test passed"
    else
        log_error "${agent_type} agent test failed"
        return 1
    fi
}

# Main execution function
main() {
    echo -e "${PURPLE}╔══════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║      BookedBarber V2 AI Agents      ║${NC}"
    echo -e "${PURPLE}║         Activation System           ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════╝${NC}"
    echo ""

    parse_args "$@"
    check_prerequisites
    
    if [[ -n "$TEST_TYPE" ]]; then
        test_agent "$TEST_TYPE"
    elif [[ "$ACTIVATE_ALL" == "true" ]]; then
        activate_all_agents
    elif [[ -n "$ACTIVATE_TYPE" ]]; then
        activate_agent "$ACTIVATE_TYPE"
    else
        log_error "No action specified. Use --help for usage information"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"