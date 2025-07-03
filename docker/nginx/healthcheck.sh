#!/bin/sh
# Nginx health check script for BookedBarber V2

# Check if nginx is responding
if curl -f http://localhost/health >/dev/null 2>&1; then
    echo "Nginx health check passed"
    exit 0
else
    echo "Nginx health check failed"
    exit 1
fi