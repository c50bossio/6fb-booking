#!/bin/bash

# Create Feature Branches Script for 6FB Booking Platform
# This script creates all necessary feature branches for parallel development

echo "🌿 6FB Booking Platform - Feature Branch Creator"
echo "=============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get current date for branch naming
DATE=$(date +%Y%m%d)

# Feature branches to create (compatible with all shells)
FEATURES="google-calendar:Google Calendar integration with OAuth, sync, and availability
payment-complete:Payment processing, success/failed pages, and Stripe integration
payout-system:Barber payout system with Stripe Connect
booking-flow:Public booking flow with service selection and confirmation
client-management:Client database, history, and communication preferences
analytics-dashboard:6FB methodology analytics and business insights
notification-system:Email/SMS notifications with SendGrid and Twilio
production-deploy:Production configuration and deployment setup"

# Function to create a feature branch
create_feature_branch() {
    local feature_name=$1
    local description=$2
    local branch_name="feature/${feature_name}-${DATE}"

    echo -e "${BLUE}Creating branch: ${branch_name}${NC}"
    echo "Description: $description"

    # Check if branch already exists
    if git show-ref --verify --quiet "refs/heads/${branch_name}"; then
        echo -e "${YELLOW}⚠ Branch already exists, skipping...${NC}"
    else
        # Create and checkout the branch
        if git checkout -b "$branch_name" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Branch created successfully${NC}"

            # Create initial commit with branch info
            echo "# $feature_name Feature" > ".branch-info.md"
            echo "" >> ".branch-info.md"
            echo "## Description" >> ".branch-info.md"
            echo "$description" >> ".branch-info.md"
            echo "" >> ".branch-info.md"
            echo "## Created" >> ".branch-info.md"
            echo "Date: $(date)" >> ".branch-info.md"
            echo "Branch: $branch_name" >> ".branch-info.md"

            git add .branch-info.md > /dev/null 2>&1
            git commit -m "Initialize $feature_name feature branch" > /dev/null 2>&1

            # Return to main branch
            git checkout main > /dev/null 2>&1
        else
            echo -e "${RED}✗ Failed to create branch${NC}"
        fi
    fi
    echo ""
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Check current status
echo "Checking git status..."
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    echo "It's recommended to commit or stash changes before creating branches."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Ensure we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
    echo -e "${YELLOW}Currently on branch: $current_branch${NC}"
    echo "Switching to main branch..."
    git checkout main || git checkout master
fi

# Fetch latest from remote
echo "Fetching latest from remote..."
git fetch origin

# Create all feature branches
echo ""
echo "Creating feature branches..."
echo ""

echo "$FEATURES" | while IFS=':' read -r feature description; do
    create_feature_branch "$feature" "$description"
done

# Create a development session script
echo "Creating development session launcher..."
cat > "start-dev-session.sh" << 'EOF'
#!/bin/bash

# Development Session Launcher for 6FB Booking Platform
echo "🚀 Starting 6FB Development Session"
echo "=================================="
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux is not installed. Install it for the best experience:"
    echo "  macOS: brew install tmux"
    echo "  Ubuntu/Debian: sudo apt-get install tmux"
    echo ""
    echo "Starting without tmux..."
    echo ""
    echo "Please open 6 terminal windows manually and run:"
    echo ""
    echo "Window 1 - Backend Server:"
    echo "  cd backend && source venv/bin/activate && uvicorn main:app --reload"
    echo ""
    echo "Window 2 - Frontend Server:"
    echo "  cd frontend && npm run dev"
    echo ""
    echo "Window 3 - Backend Tests:"
    echo "  cd backend && source venv/bin/activate && ptw"
    echo ""
    echo "Window 4 - Frontend Tests:"
    echo "  cd frontend && npm test"
    echo ""
    echo "Window 5 - Git/Features:"
    echo "  git status"
    echo ""
    echo "Window 6 - Logs/Monitoring:"
    echo "  tail -f backend/logs/*.log"
    exit 0
fi

# Create tmux session with multiple windows
tmux new-session -d -s sixfb -n backend-server
tmux send-keys -t sixfb:backend-server 'cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000' C-m

tmux new-window -t sixfb -n frontend-server
tmux send-keys -t sixfb:frontend-server 'cd frontend && npm run dev' C-m

tmux new-window -t sixfb -n backend-tests
tmux send-keys -t sixfb:backend-tests 'cd backend && source venv/bin/activate && echo "Run: ptw" for continuous testing' C-m

tmux new-window -t sixfb -n frontend-tests
tmux send-keys -t sixfb:frontend-tests 'cd frontend && echo "Run: npm test" for testing' C-m

tmux new-window -t sixfb -n git-features
tmux send-keys -t sixfb:git-features 'git branch -a | grep feature/' C-m

tmux new-window -t sixfb -n monitoring
tmux send-keys -t sixfb:monitoring 'echo "Monitoring window ready"' C-m

# Attach to the session
tmux attach-session -t sixfb

# Instructions for tmux navigation
echo ""
echo "tmux commands:"
echo "  Ctrl+b, n - Next window"
echo "  Ctrl+b, p - Previous window"
echo "  Ctrl+b, 0-5 - Go to window number"
echo "  Ctrl+b, d - Detach from session"
echo "  tmux attach -t sixfb - Reattach to session"
EOF

chmod +x start-dev-session.sh

# Summary
echo "=============================================="
echo "Feature Branches Created"
echo "=============================================="
echo ""
git branch -a | grep "feature/" | sed 's/^/  /'
echo ""
echo -e "${GREEN}✓ All feature branches created successfully!${NC}"
echo ""
echo "Quick Commands:"
echo ""
echo "Switch to a feature branch:"
echo "$FEATURES" | while IFS=':' read -r feature description; do
    echo "  git checkout feature/${feature}-${DATE}"
done
echo ""
echo "Start development session:"
echo "  ./start-dev-session.sh"
echo ""
echo "Run parallel tests:"
echo "  ./scripts/parallel-tests.sh"
echo ""
echo "Tips:"
echo "- Work on one feature per terminal window"
echo "- Commit frequently to your feature branch"
echo "- Run tests before pushing changes"
echo "- Create PRs when features are ready"
