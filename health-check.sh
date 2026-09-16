#!/usr/bin/env bash
# Standalone OmniHost Diagnostic Health Check Utility
set -e

echo "=== OMNIHOST COMPUTE NODE DIAGNOSTICS ==="
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Process Status
if systemctl is-active --quiet omnihost; then
  echo "✓ OmniHost Systemd Service: ACTIVE"
else
  echo "✗ OmniHost Systemd Service: INACTIVE / CRASHED"
fi

# Port Listeners
echo ""
echo "--- Listening Network Ports ---"
ss -tulpn | grep -E "(:3000|:80|:443|:5432|:6379)" || netstat -tlpn | grep -E "(:3000|:80|:443)"

# Live API Health
echo ""
echo "--- API Health Probe ---"
curl -s http://localhost:3000/api/health | jq . || curl -s http://localhost:3000/api/health
echo ""
