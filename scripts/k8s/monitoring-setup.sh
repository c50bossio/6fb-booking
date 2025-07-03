#!/bin/bash
# BookedBarber V2 Monitoring Setup Script

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

NAMESPACE="${1:-bookedbarber}"
MONITORING_NAMESPACE="monitoring"

print_status "Setting up monitoring stack for BookedBarber V2"
print_status "Application namespace: $NAMESPACE"
print_status "Monitoring namespace: $MONITORING_NAMESPACE"

# Create monitoring namespace
print_status "Creating monitoring namespace..."
kubectl create namespace "$MONITORING_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Add Prometheus community Helm repository
print_status "Adding Prometheus community Helm repository..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack
print_status "Installing kube-prometheus-stack..."
cat << EOF | helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
    --namespace "$MONITORING_NAMESPACE" \
    --values -
prometheus:
  prometheusSpec:
    retention: 15d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
    additionalScrapeConfigs:
      - job_name: 'bookedbarber-backend'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - $NAMESPACE
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
            action: keep
            regex: bookedbarber-backend
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: \$1:\$2
            target_label: __address__

      - job_name: 'bookedbarber-frontend'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - $NAMESPACE
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
            action: keep
            regex: bookedbarber-frontend

grafana:
  adminPassword: admin123  # Change this in production
  persistence:
    enabled: true
    size: 10Gi
  datasources:
    datasources.yaml:
      apiVersion: 1
      datasources:
        - name: Prometheus
          type: prometheus
          url: http://prometheus-kube-prometheus-prometheus:9090
          access: proxy
          isDefault: true
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
        - name: 'bookedbarber'
          orgId: 1
          folder: 'BookedBarber V2'
          type: file
          disableDeletion: false
          editable: true
          options:
            path: /var/lib/grafana/dashboards/bookedbarber

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 5Gi
EOF

# Wait for Prometheus to be ready
print_status "Waiting for Prometheus to be ready..."
kubectl -n "$MONITORING_NAMESPACE" wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus --timeout=300s

# Create custom Grafana dashboard for BookedBarber
print_status "Creating BookedBarber Grafana dashboard..."
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: bookedbarber-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  bookedbarber-dashboard.json: |
    {
      "dashboard": {
        "id": null,
        "title": "BookedBarber V2 Dashboard",
        "description": "Monitoring dashboard for BookedBarber V2 application",
        "tags": ["bookedbarber", "application"],
        "style": "dark",
        "timezone": "browser",
        "panels": [
          {
            "id": 1,
            "title": "API Request Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(http_requests_total{job=\"bookedbarber-backend\"}[5m])",
                "legendFormat": "{{method}} {{handler}}"
              }
            ],
            "yAxes": [
              {
                "label": "requests/sec"
              }
            ],
            "gridPos": {
              "h": 8,
              "w": 12,
              "x": 0,
              "y": 0
            }
          },
          {
            "id": 2,
            "title": "Response Time",
            "type": "graph",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"bookedbarber-backend\"}[5m]))",
                "legendFormat": "95th percentile"
              },
              {
                "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{job=\"bookedbarber-backend\"}[5m]))",
                "legendFormat": "50th percentile"
              }
            ],
            "yAxes": [
              {
                "label": "seconds"
              }
            ],
            "gridPos": {
              "h": 8,
              "w": 12,
              "x": 12,
              "y": 0
            }
          },
          {
            "id": 3,
            "title": "Error Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(http_requests_total{job=\"bookedbarber-backend\",status=~\"5..\"}[5m])",
                "legendFormat": "5xx errors"
              },
              {
                "expr": "rate(http_requests_total{job=\"bookedbarber-backend\",status=~\"4..\"}[5m])",
                "legendFormat": "4xx errors"
              }
            ],
            "yAxes": [
              {
                "label": "errors/sec"
              }
            ],
            "gridPos": {
              "h": 8,
              "w": 12,
              "x": 0,
              "y": 8
            }
          },
          {
            "id": 4,
            "title": "Database Connections",
            "type": "graph",
            "targets": [
              {
                "expr": "postgresql_connections{job=\"bookedbarber-backend\"}",
                "legendFormat": "active connections"
              }
            ],
            "gridPos": {
              "h": 8,
              "w": 12,
              "x": 12,
              "y": 8
            }
          }
        ],
        "time": {
          "from": "now-1h",
          "to": "now"
        },
        "refresh": "5s"
      }
    }
EOF

# Create ServiceMonitor for BookedBarber
print_status "Creating ServiceMonitor for BookedBarber..."
cat << EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: bookedbarber-backend
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: bookedbarber
    app.kubernetes.io/component: backend
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: bookedbarber
      app.kubernetes.io/component: api
  endpoints:
  - port: http
    interval: 30s
    path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: bookedbarber-frontend
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: bookedbarber
    app.kubernetes.io/component: frontend
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: bookedbarber
      app.kubernetes.io/component: web
  endpoints:
  - port: http
    interval: 30s
    path: /api/metrics
EOF

# Create alerting rules
print_status "Creating alerting rules..."
cat << EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: bookedbarber-alerts
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: bookedbarber
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: bookedbarber.rules
    rules:
    - alert: BookedBarberHighErrorRate
      expr: rate(http_requests_total{job="bookedbarber-backend",status=~"5.."}[5m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate in BookedBarber backend"
        description: "Error rate is {{ \$value }} errors per second"
    
    - alert: BookedBarberHighLatency
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="bookedbarber-backend"}[5m])) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High latency in BookedBarber backend"
        description: "95th percentile latency is {{ \$value }} seconds"
    
    - alert: BookedBarberPodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total{namespace="$NAMESPACE"}[15m]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "BookedBarber pod is crash looping"
        description: "Pod {{ \$labels.pod }} is restarting frequently"
    
    - alert: BookedBarberDatabaseConnections
      expr: postgresql_connections{job="bookedbarber-backend"} > 80
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High database connection count"
        description: "Database connections: {{ \$value }}"
EOF

# Expose Grafana service
print_status "Exposing Grafana service..."
kubectl -n "$MONITORING_NAMESPACE" patch svc prometheus-grafana -p '{"spec":{"type":"LoadBalancer"}}'

print_success "Monitoring stack setup complete!"
print_status "Access information:"

# Get Grafana external IP (may take a moment)
GRAFANA_IP=$(kubectl -n "$MONITORING_NAMESPACE" get svc prometheus-grafana -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
GRAFANA_PORT=$(kubectl -n "$MONITORING_NAMESPACE" get svc prometheus-grafana -o jsonpath='{.spec.ports[0].port}')

if [ "$GRAFANA_IP" = "pending" ] || [ -z "$GRAFANA_IP" ]; then
    print_status "Grafana LoadBalancer IP is pending. Use port-forward:"
    echo "kubectl -n $MONITORING_NAMESPACE port-forward svc/prometheus-grafana 3000:80"
    echo "Then access: http://localhost:3000"
else
    echo "Grafana: http://$GRAFANA_IP:$GRAFANA_PORT"
fi

echo "Default credentials: admin / admin123"
echo "Prometheus: http://prometheus-ip:9090"

print_status "To access Prometheus:"
echo "kubectl -n $MONITORING_NAMESPACE port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090"

print_warning "Remember to change default passwords in production!"
print_success "Monitoring setup completed successfully!"