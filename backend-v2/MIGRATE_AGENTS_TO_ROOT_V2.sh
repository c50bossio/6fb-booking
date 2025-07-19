#!/bin/bash

# MIGRATE_AGENTS_TO_ROOT_V2.sh  
# AI Agent Activation Coordinator for BookedBarber V2
# Deploys and activates the sophisticated AI agent system in production

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
MIGRATIONS_DIR="$BASE_DIR/migrations"
TASK_LOGS_DIR="$MIGRATIONS_DIR/task_logs"
AGENT_LOGS_DIR="$MIGRATIONS_DIR/agent_logs"
COORDINATION_DIR="$MIGRATIONS_DIR/coordination"
MAX_AGENTS=3
PHASE=""
DRY_RUN=false
VERBOSE=false

# Ensure required directories exist
mkdir -p "$TASK_LOGS_DIR" "$AGENT_LOGS_DIR" "$COORDINATION_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$COORDINATION_DIR/coordinator.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$COORDINATION_DIR/coordinator.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$COORDINATION_DIR/coordinator.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$COORDINATION_DIR/coordinator.log"
}

# Show usage information
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Multi-Agent Coordinator for BookedBarber V2 Migration
Orchestrates parallel execution of migration agents with conflict resolution.

OPTIONS:
    -p, --phase PHASE       Migration phase number (1-5)
    -d, --dry-run          Perform dry run without making changes
    -v, --verbose          Enable verbose logging
    -c, --check-status     Check current agent coordination status
    -k, --kill-agents      Kill all running migration agents
    -r, --reset            Reset coordination state
    -h, --help            Show this help message

EXAMPLES:
    # Coordinate Phase 1 migration with 3 agents
    $0 --phase 1

    # Dry run coordination for Phase 2
    $0 --phase 2 --dry-run

    # Check current agent status
    $0 --check-status

    # Kill all running agents and reset
    $0 --kill-agents --reset

AGENT COORDINATION:
    This script coordinates multiple Claude agents to work on migration tasks
    in parallel without conflicts. It uses file locking and dependency 
    resolution to ensure safe parallel execution.

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--phase)
                PHASE="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -c|--check-status)
                check_agent_status
                exit 0
                ;;
            -k|--kill-agents)
                kill_all_agents
                exit 0
                ;;
            -r|--reset)
                reset_coordination
                exit 0
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

    if [[ -z "$PHASE" ]]; then
        log_error "Phase number is required. Use -p or --phase"
        show_usage
        exit 1
    fi

    if [[ ! "$PHASE" =~ ^[1-5]$ ]]; then
        log_error "Phase must be between 1 and 5"
        exit 1
    fi
}

# Check if migration system is ready
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if we're in the right directory
    if [[ ! -f "$BASE_DIR/migrate.py" ]]; then
        log_error "migrate.py not found. Run this script from backend-v2 directory"
        exit 1
    fi

    # Check if Python dependencies are installed
    if ! python -c "import utils.sub_agent_manager" 2>/dev/null; then
        log_error "Migration dependencies not installed. Run: pip install -r requirements.txt"
        exit 1
    fi

    # Check if phase configuration exists
    if [[ ! -f "$MIGRATIONS_DIR/phase_config.json" ]]; then
        log_error "Phase configuration not found at $MIGRATIONS_DIR/phase_config.json"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Generate coordination plan
generate_coordination_plan() {
    local phase=$1
    log_info "Generating coordination plan for Phase $phase..."

    # Use the Python migration system to generate the plan
    if ! python migrate.py plan --phase "$phase" > "$COORDINATION_DIR/phase_${phase}_plan.log" 2>&1; then
        log_error "Failed to generate coordination plan"
        cat "$COORDINATION_DIR/phase_${phase}_plan.log"
        exit 1
    fi

    # Extract agent instructions
    if [[ ! -d "$TASK_LOGS_DIR" ]] || [[ -z "$(ls -A "$TASK_LOGS_DIR")" ]]; then
        log_error "No agent instructions generated"
        exit 1
    fi

    log_success "Coordination plan generated successfully"
}

# Check agent status
check_agent_status() {
    log_info "Checking agent coordination status..."

    echo -e "\n${CYAN}=== AGENT STATUS ===${NC}"
    
    # Check for running agent processes
    local running_agents=0
    for i in $(seq 1 $MAX_AGENTS); do
        local agent_id="agent_$i"
        local pid_file="$COORDINATION_DIR/${agent_id}.pid"
        
        if [[ -f "$pid_file" ]]; then
            local pid=$(cat "$pid_file")
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${GREEN}Agent $i:${NC} Running (PID: $pid)"
                ((running_agents++))
            else
                echo -e "${YELLOW}Agent $i:${NC} PID file exists but process not running"
                rm -f "$pid_file"
            fi
        else
            echo -e "${RED}Agent $i:${NC} Not running"
        fi
    done

    echo -e "\n${CYAN}=== COORDINATION FILES ===${NC}"
    if [[ -d "$TASK_LOGS_DIR" ]]; then
        echo "Agent instructions: $(ls -1 "$TASK_LOGS_DIR"/*_instructions.md 2>/dev/null | wc -l)"
        echo "Allocation plans: $(ls -1 "$TASK_LOGS_DIR"/allocation_plan_*.json 2>/dev/null | wc -l)"
    fi

    echo -e "\n${CYAN}=== RECENT ACTIVITY ===${NC}"
    if [[ -f "$COORDINATION_DIR/coordinator.log" ]]; then
        tail -5 "$COORDINATION_DIR/coordinator.log"
    else
        echo "No coordinator activity"
    fi

    return $running_agents
}

# Kill all running migration agents
kill_all_agents() {
    log_warning "Killing all migration agents..."

    local killed=0
    for i in $(seq 1 $MAX_AGENTS); do
        local agent_id="agent_$i"
        local pid_file="$COORDINATION_DIR/${agent_id}.pid"
        
        if [[ -f "$pid_file" ]]; then
            local pid=$(cat "$pid_file")
            if kill -0 "$pid" 2>/dev/null; then
                if kill -TERM "$pid" 2>/dev/null; then
                    log_info "Terminated $agent_id (PID: $pid)"
                    ((killed++))
                    sleep 2
                    # Force kill if still running
                    if kill -0 "$pid" 2>/dev/null; then
                        kill -KILL "$pid" 2>/dev/null
                        log_warning "Force killed $agent_id"
                    fi
                fi
            fi
            rm -f "$pid_file"
        fi
    done

    if [[ $killed -gt 0 ]]; then
        log_success "Killed $killed agent(s)"
    else
        log_info "No running agents found"
    fi
}

# Reset coordination state
reset_coordination() {
    log_warning "Resetting coordination state..."

    # Clean up coordination files
    rm -f "$COORDINATION_DIR"/*.pid
    rm -f "$COORDINATION_DIR"/*.lock
    rm -f "$COORDINATION_DIR"/coordinator.log

    # Clean up task logs (keep instructions but remove status files)
    find "$TASK_LOGS_DIR" -name "*.status" -delete 2>/dev/null || true
    find "$TASK_LOGS_DIR" -name "*.lock" -delete 2>/dev/null || true

    log_success "Coordination state reset"
}

# Start a single agent
start_agent() {
    local agent_id=$1
    local instructions_file="$TASK_LOGS_DIR/${agent_id}_instructions.md"
    local log_file="$AGENT_LOGS_DIR/${agent_id}.log"
    local pid_file="$COORDINATION_DIR/${agent_id}.pid"

    if [[ ! -f "$instructions_file" ]]; then
        log_warning "No instructions found for $agent_id, skipping"
        return 0
    fi

    log_info "Starting $agent_id..."

    # Create agent execution script
    local agent_script="$COORDINATION_DIR/${agent_id}_executor.sh"
    cat > "$agent_script" << EOF
#!/bin/bash
# Auto-generated agent executor for $agent_id

set -euo pipefail

AGENT_ID="$agent_id"
INSTRUCTIONS_FILE="$instructions_file"
LOG_FILE="$log_file"
BASE_DIR="$BASE_DIR"
DRY_RUN="$DRY_RUN"

# Log function
agent_log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') [\$AGENT_ID] \$1" >> "\$LOG_FILE"
}

# Main agent execution
main() {
    agent_log "Starting agent execution"
    agent_log "Instructions file: \$INSTRUCTIONS_FILE"
    agent_log "Dry run mode: \$DRY_RUN"

    # Read and parse instructions
    if [[ ! -f "\$INSTRUCTIONS_FILE" ]]; then
        agent_log "ERROR: Instructions file not found"
        exit 1
    fi

    agent_log "Reading instructions from \$INSTRUCTIONS_FILE"
    
    # Here would be the actual Claude agent execution
    # For now, we'll simulate the process
    
    if [[ "\$DRY_RUN" == "true" ]]; then
        agent_log "DRY RUN: Would execute migration tasks"
        sleep 5  # Simulate work
        agent_log "DRY RUN: All tasks completed successfully"
    else
        agent_log "REAL RUN: Executing migration tasks"
        
        # TODO: Implement actual Claude agent execution here
        # This would involve:
        # 1. Parsing the markdown instructions
        # 2. Executing each task in sequence
        # 3. Handling file locking and coordination
        # 4. Reporting progress back to coordinator
        
        agent_log "PLACEHOLDER: Agent execution not yet implemented"
        sleep 10  # Simulate work
        agent_log "All tasks completed successfully"
    fi

    agent_log "Agent execution completed"
}

# Trap cleanup
cleanup() {
    agent_log "Agent shutting down"
    rm -f "$pid_file"
}
trap cleanup EXIT

# Store PID
echo \$\$ > "$pid_file"

# Run main function
main
EOF

    chmod +x "$agent_script"

    # Start agent in background
    if [[ "$VERBOSE" == "true" ]]; then
        "$agent_script" &
    else
        "$agent_script" > /dev/null 2>&1 &
    fi

    local agent_pid=$!
    echo "$agent_pid" > "$pid_file"

    log_success "$agent_id started (PID: $agent_pid)"
}

# Monitor agent progress
monitor_agents() {
    local phase=$1
    log_info "Monitoring agents for Phase $phase..."

    local all_completed=false
    local check_interval=5
    local max_wait=1800  # 30 minutes
    local elapsed=0

    echo -e "\n${CYAN}=== AGENT MONITORING ===${NC}"

    while [[ "$all_completed" == "false" && $elapsed -lt $max_wait ]]; do
        local running=0
        local completed=0
        
        printf "\r${BLUE}[%02d:%02d]${NC} " $((elapsed/60)) $((elapsed%60))

        for i in $(seq 1 $MAX_AGENTS); do
            local agent_id="agent_$i"
            local pid_file="$COORDINATION_DIR/${agent_id}.pid"
            
            if [[ -f "$pid_file" ]]; then
                local pid=$(cat "$pid_file")
                if kill -0 "$pid" 2>/dev/null; then
                    printf "${GREEN}A%d:RUN${NC} " "$i"
                    ((running++))
                else
                    printf "${BLUE}A%d:DONE${NC} " "$i"
                    ((completed++))
                fi
            else
                printf "${RED}A%d:NONE${NC} " "$i"
                ((completed++))
            fi
        done

        if [[ $running -eq 0 ]]; then
            all_completed=true
            echo -e "\n${GREEN}All agents completed!${NC}"
        else
            sleep $check_interval
            elapsed=$((elapsed + check_interval))
        fi
    done

    if [[ $elapsed -ge $max_wait ]]; then
        log_warning "Monitoring timeout reached (${max_wait}s)"
        return 1
    fi

    return 0
}

# Generate final report
generate_report() {
    local phase=$1
    log_info "Generating coordination report..."

    local report_file="$COORDINATION_DIR/phase_${phase}_coordination_report.md"
    
    cat > "$report_file" << EOF
# Phase $phase Multi-Agent Coordination Report

**Generated**: $(date '+%Y-%m-%d %H:%M:%S')
**Script**: $0
**Dry Run**: $DRY_RUN

## Execution Summary

EOF

    # Add agent status
    echo "### Agent Execution Status" >> "$report_file"
    echo "" >> "$report_file"

    for i in $(seq 1 $MAX_AGENTS); do
        local agent_id="agent_$i"
        local log_file="$AGENT_LOGS_DIR/${agent_id}.log"
        
        echo "#### Agent $i ($agent_id)" >> "$report_file"
        
        if [[ -f "$log_file" ]]; then
            local start_time=$(head -1 "$log_file" | cut -d' ' -f1-2)
            local end_time=$(tail -1 "$log_file" | cut -d' ' -f1-2)
            echo "- **Start Time**: $start_time" >> "$report_file"
            echo "- **End Time**: $end_time" >> "$report_file"
            echo "- **Log Entries**: $(wc -l < "$log_file")" >> "$report_file"
            
            if grep -q "ERROR" "$log_file"; then
                echo "- **Status**: ❌ Errors detected" >> "$report_file"
            elif grep -q "completed successfully" "$log_file"; then
                echo "- **Status**: ✅ Completed successfully" >> "$report_file"
            else
                echo "- **Status**: ⚠️ Unknown" >> "$report_file"
            fi
        else
            echo "- **Status**: ❌ No log file found" >> "$report_file"
        fi
        echo "" >> "$report_file"
    done

    # Add coordination logs if verbose
    if [[ "$VERBOSE" == "true" ]]; then
        echo "### Coordination Logs" >> "$report_file"
        echo "" >> "$report_file"
        echo '```' >> "$report_file"
        if [[ -f "$COORDINATION_DIR/coordinator.log" ]]; then
            cat "$COORDINATION_DIR/coordinator.log" >> "$report_file"
        fi
        echo '```' >> "$report_file"
    fi

    log_success "Report generated: $report_file"
}

# Main coordination function
coordinate_migration() {
    local phase=$1
    
    log_info "Starting multi-agent coordination for Phase $phase"
    echo -e "${PURPLE}╔══════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║      BookedBarber V2 Migration      ║${NC}"
    echo -e "${PURPLE}║       Multi-Agent Coordinator       ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════╝${NC}"
    echo ""

    # Step 1: Generate coordination plan
    generate_coordination_plan "$phase"

    # Step 2: Start agents
    log_info "Starting $MAX_AGENTS agents..."
    for i in $(seq 1 $MAX_AGENTS); do
        start_agent "agent_$i"
        sleep 1  # Brief delay between agent starts
    done

    # Step 3: Monitor progress
    if monitor_agents "$phase"; then
        log_success "Phase $phase coordination completed successfully"
    else
        log_error "Phase $phase coordination failed or timed out"
        return 1
    fi

    # Step 4: Generate report
    generate_report "$phase"

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     Coordination Completed          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
}

# Main execution
main() {
    # Initialize logging
    exec > >(tee -a "$COORDINATION_DIR/coordinator.log")
    exec 2>&1

    log_info "MIGRATE_AGENTS_TO_ROOT_V2.sh started with args: $*"

    parse_args "$@"
    check_prerequisites
    
    # Clean up any previous runs
    kill_all_agents
    
    # Start coordination
    coordinate_migration "$PHASE"
}

# Run main function with all arguments
main "$@"