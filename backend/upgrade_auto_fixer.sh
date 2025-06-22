#!/bin/bash

echo "🚀 Upgrading to Enhanced Auto-Fixer v2.0..."

# Stop current auto-fixer
echo "🛑 Stopping current auto-fixer..."
pkill -f "test_auto_fixer.py" 2>/dev/null || true
pkill -f "sentry_auto_fixer.py" 2>/dev/null || true

# Install additional dependencies
echo "📦 Installing additional dependencies..."
pip3 install redis aiosmtplib sqlalchemy pyyaml

# Update environment variables
echo "🔧 Updating environment configuration..."

ENV_FILE="/Users/bossio/6fb-booking/backend/.env"

# Add new environment variables if not present
if ! grep -q "SLACK_WEBHOOK_URL" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# Enhanced Auto-Fixer Settings" >> "$ENV_FILE"
    echo "SLACK_WEBHOOK_URL=your-slack-webhook-url" >> "$ENV_FILE"
    echo "NOTIFICATION_EMAILS=dev-team@6fbmentorship.com" >> "$ENV_FILE"
fi

# Create database for pattern learning
echo "🗄️ Setting up pattern learning database..."
python3 -c "
from enhanced_auto_fixer import Base, engine
Base.metadata.create_all(engine)
print('✅ Database tables created')
"

# Create startup script for enhanced version
cat > /Users/bossio/start-enhanced-auto-fixer.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Enhanced Auto-Fixer v2.0..."

# Load environment
source /Users/bossio/6fb-booking/backend/.env

# Start enhanced auto-fixer
cd /Users/bossio/6fb-booking/backend
python3 enhanced_auto_fixer.py &
FIXER_PID=$!

echo "✅ Enhanced Auto-Fixer started with PID: $FIXER_PID"

# Get ngrok URL if running
if pgrep -f ngrok > /dev/null; then
    sleep 2
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data['tunnels'][0]['public_url'])
except:
    print('')
")

    if [ ! -z "$NGROK_URL" ]; then
        echo ""
        echo "🌐 Webhook URL: $NGROK_URL/sentry/webhook"
        echo "📊 Dashboard: $NGROK_URL/docs"
        echo "🔍 Status: $NGROK_URL/status"
        echo "🧠 Patterns: $NGROK_URL/patterns"
    fi
fi

echo ""
echo "📋 Enhanced Features Active:"
echo "  ✅ Slack/Email notifications"
echo "  ✅ Pattern learning & confidence scoring"
echo "  ✅ Automatic rollback on error spikes"
echo "  ✅ Smart error grouping"
echo "  ✅ Rate limiting & circuit breakers"
echo "  ✅ Database migration suggestions"
echo "  ✅ Performance monitoring"
echo "  ✅ Approval workflows"

# Save PID
echo "$FIXER_PID" > /tmp/enhanced_auto_fixer.pid

# Wait
trap 'kill $FIXER_PID; exit 0' INT
wait
EOF

chmod +x /Users/bossio/start-enhanced-auto-fixer.sh

# Create monitoring dashboard
cat > /Users/bossio/6fb-booking/backend/auto_fixer_dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Auto-Fixer Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat { text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #2196F3; }
        .stat-label { color: #666; margin-top: 5px; }
        .status { display: inline-block; padding: 5px 10px; border-radius: 4px; color: white; }
        .status.running { background: #4CAF50; }
        .status.stopped { background: #f44336; }
        .chart-container { position: relative; height: 300px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: bold; }
        .confidence { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.9em; }
        .confidence.high { background: #4CAF50; color: white; }
        .confidence.medium { background: #FF9800; color: white; }
        .confidence.low { background: #f44336; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 Enhanced Auto-Fixer Dashboard</h1>

        <div class="card">
            <h2>System Status</h2>
            <div id="system-status">Loading...</div>
        </div>

        <div class="card">
            <h2>Statistics</h2>
            <div class="stats" id="stats">Loading...</div>
        </div>

        <div class="card">
            <h2>Fix Success Rate</h2>
            <div class="chart-container">
                <canvas id="successChart"></canvas>
            </div>
        </div>

        <div class="card">
            <h2>Recent Fixes</h2>
            <table id="recent-fixes">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Error Type</th>
                        <th>Project</th>
                        <th>Status</th>
                        <th>Confidence</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="5">Loading...</td></tr>
                </tbody>
            </table>
        </div>

        <div class="card">
            <h2>Learned Patterns</h2>
            <table id="patterns">
                <thead>
                    <tr>
                        <th>Pattern</th>
                        <th>Type</th>
                        <th>Success Rate</th>
                        <th>Confidence</th>
                        <th>Auto-Fix</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="5">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        const API_BASE = 'http://localhost:8003';

        async function fetchData() {
            try {
                // Fetch status
                const statusRes = await fetch(`${API_BASE}/status`);
                const status = await statusRes.json();

                // Update system status
                document.getElementById('system-status').innerHTML = `
                    <span class="status ${status.status}">${status.status.toUpperCase()}</span>
                    <span style="margin-left: 20px;">Version: ${status.version}</span>
                    <span style="margin-left: 20px;">Circuit Breaker: ${status.features.circuit_breaker}</span>
                `;

                // Update stats
                document.getElementById('stats').innerHTML = `
                    <div class="stat">
                        <div class="stat-value">${status.stats.total_fixes}</div>
                        <div class="stat-label">Total Fixes</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${status.stats.success_rate.toFixed(1)}%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${status.stats.patterns_learned}</div>
                        <div class="stat-label">Patterns Learned</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${status.stats.avg_confidence.toFixed(1)}%</div>
                        <div class="stat-label">Avg Confidence</div>
                    </div>
                `;

                // Update recent fixes
                const fixesHtml = status.recent_fixes.map(fix => `
                    <tr>
                        <td>${new Date(fix.timestamp).toLocaleString()}</td>
                        <td>${fix.error_type}</td>
                        <td>${fix.project}</td>
                        <td>${fix.success ? '✅ Success' : '❌ Failed'}</td>
                        <td><span class="confidence ${fix.confidence > 80 ? 'high' : fix.confidence > 60 ? 'medium' : 'low'}">${fix.confidence.toFixed(1)}%</span></td>
                    </tr>
                `).join('');
                document.querySelector('#recent-fixes tbody').innerHTML = fixesHtml || '<tr><td colspan="5">No recent fixes</td></tr>';

                // Fetch patterns
                const patternsRes = await fetch(`${API_BASE}/patterns`);
                const patternsData = await patternsRes.json();

                const patternsHtml = patternsData.patterns.map(pattern => `
                    <tr>
                        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${pattern.pattern}</td>
                        <td>${pattern.error_type}</td>
                        <td>${pattern.success_rate.toFixed(1)}%</td>
                        <td><span class="confidence ${pattern.confidence > 80 ? 'high' : pattern.confidence > 60 ? 'medium' : 'low'}">${pattern.confidence.toFixed(1)}%</span></td>
                        <td>${pattern.auto_fixable ? '✅' : '❌'}</td>
                    </tr>
                `).join('');
                document.querySelector('#patterns tbody').innerHTML = patternsHtml || '<tr><td colspan="5">No patterns learned yet</td></tr>';

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }

        // Initialize chart
        const ctx = document.getElementById('successChart').getContext('2d');
        const successChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Success Rate',
                    data: [],
                    borderColor: '#4CAF50',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // Update data every 5 seconds
        fetchData();
        setInterval(fetchData, 5000);
    </script>
</body>
</html>
EOF

echo ""
echo "✅ Upgrade complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update SLACK_WEBHOOK_URL in $ENV_FILE"
echo "2. Configure notification emails in $ENV_FILE"
echo "3. Review auto_fixer_config.yaml for advanced settings"
echo "4. Run: ./start-enhanced-auto-fixer.sh"
echo "5. Open dashboard: open auto_fixer_dashboard.html"
echo ""
echo "🎯 New features available:"
echo "  • Slack/Email notifications"
echo "  • Pattern learning with confidence scoring"
echo "  • Automatic rollback on error spikes"
echo "  • Smart error grouping"
echo "  • Rate limiting & circuit breakers"
echo "  • Performance monitoring"
echo "  • Web dashboard for monitoring"
echo ""
echo "📊 API Endpoints:"
echo "  • GET  /status - System status"
echo "  • GET  /patterns - Learned patterns"
echo "  • POST /patterns/{id}/toggle - Enable/disable pattern"
echo "  • GET  /performance - Performance metrics"
