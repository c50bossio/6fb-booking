#!/bin/bash

echo "🔍 GitHub Codespace Port Debugging"
echo "=================================="

echo ""
echo "📋 In your Codespace terminal, run these commands:"
echo ""

echo "1️⃣ Check container status:"
echo "docker ps"
echo ""

echo "2️⃣ Check port forwarding:"
echo "gh codespace ports"
echo ""

echo "3️⃣ Forward ports manually if needed:"
echo "gh codespace ports forward 3000:3000 --visibility public"
echo "gh codespace ports forward 8000:8000 --visibility public"
echo ""

echo "4️⃣ Test containers locally first:"
echo "curl http://localhost:3000"
echo "curl http://localhost:8000/health"
echo ""

echo "5️⃣ Check frontend container logs:"
echo "docker-compose -f docker-compose.dev.yml logs frontend"
echo ""

echo "6️⃣ Restart frontend if needed:"
echo "docker-compose -f docker-compose.dev.yml restart frontend"
echo ""

echo "🎯 Expected result:"
echo "- Ports should auto-forward and be accessible"
echo "- Frontend should respond on both localhost:3000 and Codespace URL"