#!/bin/bash

# BookedBarber V2 Franchise Infrastructure - EKS Node Userdata
# This script configures EKS worker nodes with franchise-specific settings

set -e

# Variables passed from Terraform
CLUSTER_NAME="${cluster_name}"
SHARD_ID="${shard_id}"
REGION="${region}"

# System configuration
echo "Configuring EKS worker node for BookedBarber V2 Franchise Infrastructure"
echo "Cluster: $CLUSTER_NAME"
echo "Shard ID: $SHARD_ID"
echo "Region: $REGION"

# Update system packages
yum update -y

# Install additional packages for franchise operations
yum install -y \
    amazon-cloudwatch-agent \
    awscli \
    htop \
    iotop \
    jq \
    wget \
    curl \
    unzip \
    git

# Configure CloudWatch agent for enhanced monitoring
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "cwagent"
    },
    "metrics": {
        "namespace": "BookedBarber/EKS/Node",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60,
                "resources": ["*"],
                "totalcpu": false
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "diskio": {
                "measurement": [
                    "io_time",
                    "read_bytes",
                    "write_bytes",
                    "reads",
                    "writes"
                ],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            },
            "netstat": {
                "measurement": [
                    "tcp_established",
                    "tcp_time_wait"
                ],
                "metrics_collection_interval": 60
            },
            "swap": {
                "measurement": [
                    "swap_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        },
        "append_dimensions": {
            "AutoScalingGroupName": "\${aws:AutoScalingGroupName}",
            "ImageId": "\${aws:ImageId}",
            "InstanceId": "\${aws:InstanceId}",
            "InstanceType": "\${aws:InstanceType}",
            "ClusterName": "$CLUSTER_NAME",
            "ShardId": "$SHARD_ID",
            "Region": "$REGION"
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/messages",
                        "log_group_name": "/aws/eks/$CLUSTER_NAME/node/system",
                        "log_stream_name": "{instance_id}/messages"
                    },
                    {
                        "file_path": "/var/log/dmesg",
                        "log_group_name": "/aws/eks/$CLUSTER_NAME/node/system",
                        "log_stream_name": "{instance_id}/dmesg"
                    },
                    {
                        "file_path": "/var/log/docker",
                        "log_group_name": "/aws/eks/$CLUSTER_NAME/node/docker",
                        "log_stream_name": "{instance_id}/docker"
                    }
                ]
            }
        }
    }
}
EOF

# Start CloudWatch agent
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# Configure kubelet with franchise-specific labels
mkdir -p /etc/kubernetes/kubelet/kubelet-config.json.d

cat > /etc/kubernetes/kubelet/kubelet-config.json.d/99-franchise-labels.json << EOF
{
    "kind": "KubeletConfiguration",
    "apiVersion": "kubelet.config.k8s.io/v1beta1",
    "nodeLabels": {
        "franchise.bookedbarber.com/shard-id": "$SHARD_ID",
        "franchise.bookedbarber.com/region": "$REGION",
        "franchise.bookedbarber.com/node-type": "general-purpose",
        "bookedbarber.com/cluster": "$CLUSTER_NAME",
        "bookedbarber.com/environment": "enterprise"
    },
    "nodeTaints": []
}
EOF

# Configure Docker daemon with optimized settings for franchise workloads
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "storage-opts": [
        "overlay2.override_kernel_check=true"
    ],
    "exec-opts": ["native.cgroupdriver=systemd"],
    "live-restore": true,
    "max-concurrent-downloads": 10,
    "max-concurrent-uploads": 5,
    "default-shm-size": "64M",
    "metrics-addr": "127.0.0.1:9323",
    "experimental": false
}
EOF

# Restart Docker to apply configuration
systemctl restart docker

# Install and configure Node Exporter for Prometheus monitoring
useradd --no-create-home --shell /bin/false node_exporter

cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvf node_exporter-1.6.1.linux-amd64.tar.gz
cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
chown node_exporter:node_exporter /usr/local/bin/node_exporter

# Create Node Exporter systemd service
cat > /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter \\
    --collector.filesystem.ignored-mount-points="^/(dev|proc|sys|var/lib/docker/.+)(\$|/)" \\
    --collector.filesystem.ignored-fs-types="^(autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|fusectl|hugetlbfs|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tracefs)\$" \\
    --web.listen-address=:9100

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

# Configure system limits for high-performance workloads
cat >> /etc/security/limits.conf << EOF
# BookedBarber V2 Franchise - Performance Optimizations
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Configure kernel parameters for franchise workloads
cat > /etc/sysctl.d/99-bookedbarber-franchise.conf << EOF
# BookedBarber V2 Franchise - Kernel Optimizations

# Network optimizations
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 65536 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr

# File system optimizations
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288

# Memory management
vm.swappiness = 1
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# Connection tracking
net.netfilter.nf_conntrack_max = 262144
net.netfilter.nf_conntrack_tcp_timeout_established = 86400

# Process management
kernel.pid_max = 4194304
EOF

sysctl -p /etc/sysctl.d/99-bookedbarber-franchise.conf

# Install additional monitoring tools
pip3 install --upgrade awscli

# Create franchise-specific monitoring scripts
mkdir -p /opt/bookedbarber/monitoring

cat > /opt/bookedbarber/monitoring/franchise-health-check.sh << 'EOF'
#!/bin/bash
# Franchise node health check script

CLUSTER_NAME="$1"
SHARD_ID="$2"
REGION="$3"

# Check system resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.2f"), $3/$2 * 100.0}')
DISK_USAGE=$(df -h / | awk 'NR==2{printf("%s"), $5}' | sed 's/%//')

# Check container runtime
DOCKER_STATUS=$(systemctl is-active docker)
KUBELET_STATUS=$(systemctl is-active kubelet)

# Check node registration
KUBECTL_STATUS="unknown"
if command -v kubectl &> /dev/null; then
    KUBECTL_STATUS=$(kubectl get nodes $(hostname) --no-headers 2>/dev/null | awk '{print $2}' || echo "unknown")
fi

# Report metrics to CloudWatch
aws cloudwatch put-metric-data \
    --region "$REGION" \
    --namespace "BookedBarber/EKS/Node/Health" \
    --metric-data \
    MetricName=CPUUtilization,Value=$CPU_USAGE,Unit=Percent,Dimensions=ClusterName=$CLUSTER_NAME,ShardId=$SHARD_ID,InstanceId=$(curl -s http://169.254.169.254/latest/meta-data/instance-id) \
    MetricName=MemoryUtilization,Value=$MEMORY_USAGE,Unit=Percent,Dimensions=ClusterName=$CLUSTER_NAME,ShardId=$SHARD_ID,InstanceId=$(curl -s http://169.254.169.254/latest/meta-data/instance-id) \
    MetricName=DiskUtilization,Value=$DISK_USAGE,Unit=Percent,Dimensions=ClusterName=$CLUSTER_NAME,ShardId=$SHARD_ID,InstanceId=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)

# Log health status
echo "$(date): Health Check - CPU: $CPU_USAGE%, Memory: $MEMORY_USAGE%, Disk: $DISK_USAGE%, Docker: $DOCKER_STATUS, Kubelet: $KUBELET_STATUS, Node: $KUBECTL_STATUS" >> /var/log/franchise-health.log
EOF

chmod +x /opt/bookedbarber/monitoring/franchise-health-check.sh

# Create cron job for health checks
cat > /etc/cron.d/franchise-health-check << EOF
# BookedBarber V2 Franchise Health Check
*/5 * * * * root /opt/bookedbarber/monitoring/franchise-health-check.sh "$CLUSTER_NAME" "$SHARD_ID" "$REGION" >/dev/null 2>&1
EOF

# Configure log rotation for franchise logs
cat > /etc/logrotate.d/franchise-logs << EOF
/var/log/franchise-health.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

# Join the EKS cluster
/etc/eks/bootstrap.sh "$CLUSTER_NAME" \
    --b64-cluster-ca "${cluster_ca_certificate}" \
    --apiserver-endpoint "${cluster_endpoint}" \
    --container-runtime containerd \
    --kubelet-extra-args "--node-labels=franchise.bookedbarber.com/shard-id=$SHARD_ID,franchise.bookedbarber.com/region=$REGION,bookedbarber.com/cluster=$CLUSTER_NAME"

# Wait for kubelet to be ready
sleep 30

# Final health check
systemctl status kubelet
systemctl status docker
systemctl status node_exporter
systemctl status amazon-cloudwatch-agent

echo "BookedBarber V2 Franchise Infrastructure - EKS Node configuration completed successfully"
echo "Cluster: $CLUSTER_NAME"
echo "Shard ID: $SHARD_ID"
echo "Region: $REGION"
echo "Node ready for franchise workloads"