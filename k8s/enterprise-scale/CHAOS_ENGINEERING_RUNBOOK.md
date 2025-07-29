# Chaos Engineering Runbook - Six Figure Barber Platform

## Overview

This runbook provides operational procedures for the chaos engineering system deployed on the Six Figure Barber platform. The system is designed to proactively test system resilience while maintaining strict safety controls to protect business operations.

## System Architecture

### Core Components

1. **Chaos Mesh Controller** - Manages chaos experiment execution
2. **Safety Controller** - Monitors experiments and enforces business safety rules
3. **Scheduler** - Automates experiment scheduling and approval workflows
4. **Recovery Validator** - Validates system recovery after experiments
5. **Monitoring Integration** - Connects with existing Prometheus/Grafana stack

### Safety First Principles

- **No Production Revenue Impact** - All experiments include automated termination if business metrics degrade
- **Business Hours Protection** - High-risk experiments only run during off-hours
- **Executive Approval** - High-risk experiments require executive sign-off
- **Automated Safety Monitoring** - Real-time monitoring with automatic experiment termination

## Quick Reference

### Emergency Procedures

#### Immediate Experiment Termination
```bash
# Kill all active experiments immediately
kubectl delete podchaos,networkchaos,stresschaos,iochaos,httpchaos --all -n chaos-engineering

# Verify no experiments are running
kubectl get podchaos,networkchaos,stresschaos,iochaos,httpchaos -A
```

#### Safety Controller Override
```bash
# Enable emergency safety mode
kubectl patch configmap chaos-safety-config -n chaos-engineering --patch '{"data":{"emergency-mode":"true"}}'

# Restart safety controller to apply changes
kubectl rollout restart deployment/chaos-safety-controller -n chaos-engineering
```

#### System Health Check
```bash
# Check overall system health
kubectl exec -n sre-monitoring deployment/sre-prometheus -- \
  promtool query instant 'sre_uptime_percentage' --time $(date +%s)

# Check business metrics
kubectl exec -n sre-monitoring deployment/sre-prometheus -- \
  promtool query instant 'rate(sixfb_booking_created[5m])' --time $(date +%s)
```

### Status Monitoring

#### Dashboard URLs
- **Chaos Dashboard**: `http://chaos-dashboard.chaos-engineering.svc.cluster.local:2333`
- **Grafana Dashboard**: Navigate to "Chaos Engineering - Six Figure Barber Platform"
- **Prometheus Metrics**: `http://sre-prometheus.sre-monitoring.svc.cluster.local:9090`

#### Key Metrics to Monitor
```bash
# Active experiments
chaos_experiment_active

# Business impact score
chaos_experiment_customer_impact_score

# System health during experiments
chaos_experiment_system_health_score

# Safety violations
chaos_safety_violation_total
```

## Operational Procedures

### 1. Daily Operations

#### Morning Startup Checklist
```bash
# Check chaos engineering stack health
kubectl get pods -n chaos-engineering
kubectl get services -n chaos-engineering

# Verify safety controller is operational
kubectl logs -n chaos-engineering deployment/chaos-safety-controller --tail=50

# Check for any overnight experiments
kubectl get podchaos,networkchaos,stresschaos,iochaos,httpchaos -A

# Review overnight alerts
kubectl logs -n sre-monitoring deployment/sre-alertmanager --tail=100 | grep -i chaos
```

#### Daily Health Check
```bash
#!/bin/bash
# Daily chaos engineering health check script

echo "=== Chaos Engineering Daily Health Check ==="
echo "Date: $(date)"
echo

# Check component health
echo "Component Health:"
kubectl get pods -n chaos-engineering -o wide

echo -e "\nService Status:"
kubectl get services -n chaos-engineering

# Check recent experiments
echo -e "\nRecent Experiments (last 24h):"
kubectl get events -n chaos-engineering --sort-by='.lastTimestamp' | tail -20

# Check safety violations
echo -e "\nSafety Violations (last 24h):"
kubectl logs -n chaos-engineering deployment/chaos-safety-controller --since=24h | grep -i violation

# Check business impact
echo -e "\nBusiness Impact Summary:"
kubectl exec -n sre-monitoring deployment/sre-prometheus -- \
  promtool query instant 'chaos_experiment_customer_impact_score' --time $(date +%s)

echo -e "\n=== Health Check Complete ==="
```

### 2. Experiment Management

#### Manual Experiment Execution
```bash
# Create a low-risk experiment
cat <<EOF | kubectl apply -f -
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: manual-test-$(date +%s)
  namespace: chaos-engineering
  labels:
    experiment-category: "low-risk"
    manual-trigger: "true"
spec:
  selector:
    namespaces:
    - bookedbarber-v2
    labelSelectors:
      app: backend
  mode: one
  action: pod-kill
  duration: "30s"
  annotations:
    chaos.bookedbarber.com/approved-by: "$(whoami)"
    chaos.bookedbarber.com/manual-execution: "true"
EOF
```

#### Experiment Status Monitoring
```bash
# Monitor active experiment
EXPERIMENT_NAME="backend-pod-restart-test"
kubectl describe podchaos $EXPERIMENT_NAME -n chaos-engineering

# Watch experiment progress
kubectl get events -n chaos-engineering --watch --field-selector involvedObject.name=$EXPERIMENT_NAME

# Monitor business impact in real-time
watch 'kubectl exec -n sre-monitoring deployment/sre-prometheus -- promtool query instant "chaos_experiment_customer_impact_score"'
```

#### Experiment Termination
```bash
# Terminate specific experiment
EXPERIMENT_NAME="backend-pod-restart-test"
kubectl delete podchaos $EXPERIMENT_NAME -n chaos-engineering

# Verify termination
kubectl get podchaos $EXPERIMENT_NAME -n chaos-engineering
```

### 3. Safety and Incident Response

#### Safety Violation Response
```bash
# Investigate safety violation
kubectl logs -n chaos-engineering deployment/chaos-safety-controller --tail=100 | grep -A 10 -B 10 violation

# Check which experiment triggered the violation
kubectl get events -n chaos-engineering --sort-by='.lastTimestamp' | grep violation

# Review business impact
kubectl exec -n sre-monitoring deployment/sre-prometheus -- \
  promtool query range 'chaos_experiment_customer_impact_score' \
  --start $(date -d '1 hour ago' +%s) --end $(date +%s) --step 60s
```

#### Business Impact Mitigation
```bash
# Check current business metrics
kubectl exec -n sre-monitoring deployment/sre-prometheus -- \
  promtool query instant 'rate(sixfb_booking_created[2m])' --time $(date +%s)

kubectl exec -n sre-monitoring deployment/sre-prometheus -- \
  promtool query instant 'rate(sixfb_payment_success[2m])' --time $(date +%s)

# If impact detected, terminate all experiments
kubectl delete podchaos,networkchaos,stresschaos,iochaos,httpchaos --all -n chaos-engineering

# Send emergency notification
curl -X POST "${SLACK_WEBHOOK_URL}" -H 'Content-Type: application/json' -d '{
  "text": "🚨 CHAOS ENGINEERING EMERGENCY: All experiments terminated due to business impact",
  "channel": "#sre-alerts"
}'
```

### 4. Recovery Validation

#### Manual Recovery Check
```bash
# Run immediate recovery validation
kubectl exec -n chaos-engineering deployment/chaos-recovery-validator -- \
  /app/recovery-validator --run-immediate-checks

# Check recovery status
kubectl logs -n chaos-engineering deployment/chaos-recovery-validator --tail=20

# Validate business metrics recovery
kubectl exec -n sre-monitoring deployment/sre-prometheus -- \
  promtool query instant 'chaos_experiment_booking_rate_impact' --time $(date +%s)
```

#### Generate Recovery Report
```bash
# Generate manual recovery report
kubectl create job manual-recovery-report-$(date +%s) -n chaos-engineering \
  --from=cronjob/chaos-report-generator

# Monitor report generation
kubectl logs -n chaos-engineering job/manual-recovery-report-$(date +%s) --follow

# Access generated reports
kubectl exec -n chaos-engineering deployment/chaos-recovery-validator -- \
  ls -la /reports/
```

## Troubleshooting Guide

### Common Issues

#### 1. Chaos Controller Not Starting
**Symptoms**: Chaos experiments not being created or executed
```bash
# Check pod status
kubectl get pods -n chaos-engineering -l app=chaos-controller-manager

# Check logs
kubectl logs -n chaos-engineering deployment/chaos-controller-manager

# Common solutions:
# - Verify webhook certificates
kubectl get secret chaos-mesh-webhook-certs -n chaos-engineering -o yaml

# - Restart controller
kubectl rollout restart deployment/chaos-controller-manager -n chaos-engineering
```

#### 2. Safety Controller Blocking All Experiments
**Symptoms**: All experiments being terminated immediately
```bash
# Check safety controller logs
kubectl logs -n chaos-engineering deployment/chaos-safety-controller --tail=50

# Check safety configuration
kubectl get configmap chaos-safety-config -n chaos-engineering -o yaml

# Verify system health metrics
kubectl exec -n sre-monitoring deployment/sre-prometheus -- \
  promtool query instant 'sre_uptime_percentage' --time $(date +%s)

# Temporarily relax safety rules (emergency only)
kubectl patch configmap chaos-safety-config -n chaos-engineering --patch '{"data":{"emergency-bypass":"true"}}'
```

#### 3. Experiments Stuck in Running State
**Symptoms**: Experiments not completing or terminating
```bash
# Check experiment status
kubectl get podchaos,networkchaos,stresschaos -A -o wide

# Force delete stuck experiment
EXPERIMENT_NAME="stuck-experiment"
kubectl delete podchaos $EXPERIMENT_NAME -n chaos-engineering --force --grace-period=0

# Check target pods
kubectl get pods -n bookedbarber-v2 -l app=backend

# Restart chaos controller if needed
kubectl rollout restart deployment/chaos-controller-manager -n chaos-engineering
```

#### 4. Business Metrics Not Updating
**Symptoms**: Recovery validation failing due to missing metrics
```bash
# Check Prometheus connectivity
kubectl exec -n chaos-engineering deployment/chaos-safety-controller -- \
  curl -s http://sre-prometheus.sre-monitoring.svc.cluster.local:9090/api/v1/query?query=up

# Verify business metrics collection
kubectl exec -n sre-monitoring deployment/sre-prometheus -- \
  promtool query instant 'sixfb_booking_created' --time $(date +%s)

# Check service discovery
kubectl get servicemonitor -n sre-monitoring -o yaml
```

### Performance Issues

#### High Resource Usage
```bash
# Check resource usage
kubectl top pods -n chaos-engineering

# Check resource limits
kubectl describe pods -n chaos-engineering | grep -A 5 -B 5 Resources

# Scale down if necessary
kubectl scale deployment chaos-dashboard --replicas=0 -n chaos-engineering

# Review resource requests/limits
kubectl get deployments -n chaos-engineering -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].resources}{"\n"}{end}'
```

#### Storage Issues
```bash
# Check PVC usage
kubectl get pvc -n chaos-engineering

# Check available storage
kubectl exec -n chaos-engineering deployment/chaos-dashboard -- df -h /data

# Clean up old reports
kubectl exec -n chaos-engineering deployment/chaos-recovery-validator -- \
  find /reports -name "*.json" -mtime +30 -delete
```

## Maintenance Procedures

### Weekly Maintenance
```bash
#!/bin/bash
# Weekly chaos engineering maintenance

echo "=== Weekly Chaos Engineering Maintenance ==="
echo "Date: $(date)"

# Generate weekly report
kubectl create job weekly-maintenance-report-$(date +%s) -n chaos-engineering \
  --from=cronjob/chaos-report-generator

# Clean up completed experiments
kubectl delete podchaos,networkchaos,stresschaos,iochaos,httpchaos \
  --field-selector='status.phase==Finished' -n chaos-engineering

# Check storage usage
kubectl exec -n chaos-engineering deployment/chaos-recovery-validator -- \
  du -sh /reports/

# Update experiment schedules if needed
kubectl get cronjobs -n chaos-engineering

echo "=== Maintenance Complete ==="
```

### Monthly Maintenance
```bash
#!/bin/bash
# Monthly chaos engineering maintenance

# Update Chaos Mesh if new version available
helm repo update chaos-mesh
helm list -n chaos-engineering

# Review and update safety thresholds
kubectl get configmap chaos-safety-config -n chaos-engineering -o yaml > safety-config-backup.yaml
# Edit configuration as needed
# kubectl apply -f updated-safety-config.yaml

# Generate comprehensive monthly report
kubectl create job monthly-report-$(date +%s) -n chaos-engineering \
  --from=cronjob/chaos-dr-test-validator

# Archive old reports
kubectl exec -n chaos-engineering deployment/chaos-recovery-validator -- \
  tar -czf /reports/archive/reports-$(date +%Y%m).tar.gz /reports/*.json

# Review experiment effectiveness
echo "Reviewing experiment success rates..."
kubectl exec -n sre-monitoring deployment/sre-prometheus -- \
  promtool query range 'chaos_experiment_success_rate' \
  --start $(date -d '30 days ago' +%s) --end $(date +%s) --step 86400s
```

## Contact Information

### Escalation Contacts
- **SRE Team**: sre@bookedbarber.com
- **Engineering Manager**: engineering-manager@bookedbarber.com
- **Executive On-Call**: executives@bookedbarber.com

### Slack Channels
- **#sre-alerts** - Real-time alerts and notifications
- **#chaos-engineering** - General chaos engineering discussions
- **#engineering-alerts** - Engineering team notifications

### Emergency Procedures
1. **P0 Incidents**: Call +1-XXX-XXX-XXXX (SRE On-Call)
2. **Business Impact**: Immediately notify executives
3. **Safety Violations**: Terminate all experiments, investigate immediately

## References

- [Chaos Mesh Documentation](https://chaos-mesh.org/docs/)
- [Six Figure Barber Methodology](../SIX_FIGURE_BARBER_METHODOLOGY.md)
- [SRE Monitoring Stack](./sre-monitoring-stack.yaml)
- [Prometheus Queries](https://prometheus.io/docs/prometheus/latest/querying/)

---

**Last Updated**: $(date)
**Version**: 1.0.0
**Maintained By**: SRE Team