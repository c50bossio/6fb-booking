#!/bin/bash

# Test script to demonstrate port environment variable usage
# This shows how worktrees can use different ports

echo "=== Testing Port Environment Variables ==="
echo ""

echo "Default ports (no environment variables):"
echo "FRONTEND_PORT: ${FRONTEND_PORT:-3000}"
echo "BACKEND_PORT: ${BACKEND_PORT:-8000}"
echo ""

echo "Example usage for different worktrees:"
echo "Worktree 1 (main): Default ports 3000/8000"
echo "Worktree 2: FRONTEND_PORT=3002 BACKEND_PORT=8002"
echo "Worktree 3: FRONTEND_PORT=3003 BACKEND_PORT=8003"
echo ""

echo "Testing verify-api.sh URL construction:"
backend_port=${BACKEND_PORT:-8000}
echo "API URL would be: http://localhost:${backend_port}/api/v1/auth/test"
echo ""

echo "Testing verify-analytics.sh URL construction:"
frontend_port=${FRONTEND_PORT:-3000}
echo "Analytics URL would be: http://localhost:${frontend_port}/agents/analytics"
echo ""

echo "Testing test-homepage-resilience.sh URL construction:"
echo "Homepage URL would be: http://localhost:${frontend_port}"
echo ""

echo "=== All Claude hook scripts now support flexible port configuration! ==="