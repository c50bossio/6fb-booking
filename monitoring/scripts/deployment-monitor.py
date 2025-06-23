#!/usr/bin/env python3
"""
Deployment monitoring and alerting for 6FB Booking Platform
Monitors deployment status and sends completion alerts
"""

import requests
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
import os
import hashlib
import subprocess
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("/var/log/6fb-monitoring/deployment.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# Deployment services to monitor
DEPLOYMENT_SERVICES = {
    "render_backend": {
        "name": "Render Backend",
        "api_url": "https://api.render.com/v1/services",
        "service_id": os.getenv("RENDER_BACKEND_SERVICE_ID", ""),
        "webhook_url": os.getenv("RENDER_BACKEND_WEBHOOK", ""),
        "health_check": "https://sixfb-backend.onrender.com/health",
    },
    "vercel_frontend": {
        "name": "Vercel Frontend",
        "api_url": "https://api.vercel.com/v6/deployments",
        "project_id": os.getenv("VERCEL_PROJECT_ID", ""),
        "health_check": os.getenv("FRONTEND_URL", "https://6fb-booking.vercel.app"),
    },
    "github_actions": {
        "name": "GitHub Actions",
        "api_url": "https://api.github.com/repos/{owner}/{repo}/actions/runs",
        "owner": os.getenv("GITHUB_OWNER", ""),
        "repo": os.getenv("GITHUB_REPO", "6fb-booking"),
    },
}


class DeploymentMonitor:
    def __init__(self):
        self.deployment_state_file = Path(
            "/var/log/6fb-monitoring/deployment_state.json"
        )
        self.deployment_history = []
        self.last_deployment_hash = {}
        self.load_state()

    def load_state(self):
        """Load previous deployment state"""
        if self.deployment_state_file.exists():
            try:
                with open(self.deployment_state_file, "r") as f:
                    data = json.load(f)
                    self.deployment_history = data.get("history", [])
                    self.last_deployment_hash = data.get("last_hash", {})
            except Exception as e:
                logger.error(f"Failed to load deployment state: {e}")

    def save_state(self):
        """Save deployment state"""
        try:
            self.deployment_state_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.deployment_state_file, "w") as f:
                json.dump(
                    {
                        "history": self.deployment_history[
                            -100:
                        ],  # Keep last 100 deployments
                        "last_hash": self.last_deployment_hash,
                        "updated_at": datetime.utcnow().isoformat(),
                    },
                    f,
                    indent=2,
                )
        except Exception as e:
            logger.error(f"Failed to save deployment state: {e}")

    def check_render_deployment(self, config: Dict) -> Optional[Dict]:
        """Check Render deployment status"""
        if not config.get("service_id"):
            return None

        try:
            headers = {
                "Accept": "application/json",
                "Authorization": f"Bearer {os.getenv('RENDER_API_KEY', '')}",
            }

            # Get service details
            service_url = f"{config['api_url']}/{config['service_id']}"
            response = requests.get(service_url, headers=headers, timeout=10)

            if response.status_code == 200:
                service_data = response.json()

                # Get latest deployment
                deploy_url = f"{service_url}/deploys?limit=1"
                deploy_response = requests.get(deploy_url, headers=headers, timeout=10)

                if deploy_response.status_code == 200:
                    deploys = deploy_response.json()
                    if deploys:
                        latest = deploys[0]
                        return {
                            "service": "render_backend",
                            "deployment_id": latest["id"],
                            "status": latest["status"],
                            "commit": latest.get("commit", {}).get("id", ""),
                            "created_at": latest["createdAt"],
                            "updated_at": latest["updatedAt"],
                            "trigger": latest.get("trigger", {}).get("type", "unknown"),
                        }
        except Exception as e:
            logger.error(f"Failed to check Render deployment: {e}")

        return None

    def check_vercel_deployment(self, config: Dict) -> Optional[Dict]:
        """Check Vercel deployment status"""
        if not config.get("project_id"):
            return None

        try:
            headers = {"Authorization": f"Bearer {os.getenv('VERCEL_TOKEN', '')}"}

            params = {"projectId": config["project_id"], "limit": 1}

            response = requests.get(
                config["api_url"], headers=headers, params=params, timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                deployments = data.get("deployments", [])

                if deployments:
                    latest = deployments[0]
                    return {
                        "service": "vercel_frontend",
                        "deployment_id": latest["uid"],
                        "status": latest["state"],
                        "commit": latest.get("meta", {}).get("githubCommitSha", ""),
                        "created_at": latest["created"],
                        "updated_at": latest.get("ready", latest["created"]),
                        "url": latest.get("url", ""),
                    }
        except Exception as e:
            logger.error(f"Failed to check Vercel deployment: {e}")

        return None

    def check_github_actions(self, config: Dict) -> Optional[Dict]:
        """Check GitHub Actions workflow status"""
        if not config.get("owner") or not config.get("repo"):
            return None

        try:
            headers = {
                "Authorization": f"token {os.getenv('GITHUB_TOKEN', '')}",
                "Accept": "application/vnd.github.v3+json",
            }

            url = config["api_url"].format(owner=config["owner"], repo=config["repo"])

            params = {"per_page": 1, "status": "completed"}

            response = requests.get(url, headers=headers, params=params, timeout=10)

            if response.status_code == 200:
                data = response.json()
                runs = data.get("workflow_runs", [])

                if runs:
                    latest = runs[0]
                    return {
                        "service": "github_actions",
                        "workflow_id": latest["id"],
                        "status": latest["conclusion"],
                        "commit": latest["head_sha"],
                        "created_at": latest["created_at"],
                        "updated_at": latest["updated_at"],
                        "workflow_name": latest["name"],
                    }
        except Exception as e:
            logger.error(f"Failed to check GitHub Actions: {e}")

        return None

    def verify_deployment_health(self, service: str, config: Dict) -> bool:
        """Verify deployment health by checking service endpoints"""
        health_url = config.get("health_check")
        if not health_url:
            return True  # Skip if no health check configured

        try:
            # Wait a bit for deployment to stabilize
            time.sleep(30)

            # Try health check multiple times
            for attempt in range(5):
                try:
                    response = requests.get(health_url, timeout=30)
                    if response.status_code == 200:
                        logger.info(f"Health check passed for {service}")
                        return True
                except:
                    pass

                if attempt < 4:
                    time.sleep(30)

            logger.error(f"Health check failed for {service}")
            return False

        except Exception as e:
            logger.error(f"Failed to verify deployment health: {e}")
            return False

    def send_deployment_alert(self, deployment: Dict, success: bool):
        """Send deployment completion alert"""
        service_name = DEPLOYMENT_SERVICES[deployment["service"]]["name"]

        # Prepare alert message
        status_emoji = "✅" if success else "❌"
        message = f"""
{status_emoji} Deployment {'Successful' if success else 'Failed'}: {service_name}

Service: {service_name}
Deployment ID: {deployment['deployment_id']}
Status: {deployment['status']}
Commit: {deployment['commit'][:8] if deployment['commit'] else 'N/A'}
Time: {deployment['updated_at']}
Health Check: {'Passed' if success else 'Failed'}
"""

        # Send email alert
        if os.getenv("ENABLE_DEPLOYMENT_EMAILS", "true").lower() == "true":
            self.send_email_alert(
                f"Deployment {deployment['status']}: {service_name}", message
            )

        # Send webhook alert
        webhook_url = DEPLOYMENT_SERVICES[deployment["service"]].get("webhook_url")
        if webhook_url:
            self.send_webhook_alert(
                webhook_url,
                {
                    "service": deployment["service"],
                    "deployment": deployment,
                    "success": success,
                    "message": message,
                },
            )

        # Send to Slack if configured
        if os.getenv("SLACK_WEBHOOK_URL"):
            self.send_slack_alert(deployment, success)

    def send_email_alert(self, subject: str, body: str):
        """Send email alert for deployment"""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart()
            msg["Subject"] = f"[6FB Deployment] {subject}"
            msg["From"] = os.getenv("ALERT_FROM_EMAIL", "deployments@6fb-booking.com")
            msg["To"] = os.getenv("DEPLOYMENT_ALERT_EMAILS", "")

            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(
                os.getenv("SMTP_HOST", "smtp.sendgrid.net"),
                int(os.getenv("SMTP_PORT", "587")),
            ) as server:
                server.starttls()
                server.login(
                    os.getenv("SMTP_USER", "apikey"), os.getenv("SENDGRID_API_KEY", "")
                )
                server.send_message(msg)

            logger.info("Deployment email alert sent")

        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")

    def send_webhook_alert(self, webhook_url: str, payload: Dict):
        """Send webhook alert"""
        try:
            response = requests.post(webhook_url, json=payload, timeout=10)
            if response.status_code == 200:
                logger.info("Webhook alert sent successfully")
            else:
                logger.error(f"Webhook alert failed: {response.status_code}")
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")

    def send_slack_alert(self, deployment: Dict, success: bool):
        """Send Slack notification"""
        try:
            slack_webhook = os.getenv("SLACK_WEBHOOK_URL")
            if not slack_webhook:
                return

            color = "good" if success else "danger"
            service_name = DEPLOYMENT_SERVICES[deployment["service"]]["name"]

            payload = {
                "attachments": [
                    {
                        "color": color,
                        "title": f"Deployment {'Successful' if success else 'Failed'}: {service_name}",
                        "fields": [
                            {"title": "Service", "value": service_name, "short": True},
                            {
                                "title": "Status",
                                "value": deployment["status"],
                                "short": True,
                            },
                            {
                                "title": "Commit",
                                "value": (
                                    deployment["commit"][:8]
                                    if deployment["commit"]
                                    else "N/A"
                                ),
                                "short": True,
                            },
                            {
                                "title": "Health Check",
                                "value": "Passed" if success else "Failed",
                                "short": True,
                            },
                        ],
                        "footer": "6FB Deployment Monitor",
                        "ts": int(time.time()),
                    }
                ]
            }

            response = requests.post(slack_webhook, json=payload, timeout=10)
            if response.status_code == 200:
                logger.info("Slack notification sent")

        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")

    def monitor_deployments(self):
        """Monitor all deployment services"""
        for service_key, config in DEPLOYMENT_SERVICES.items():
            deployment = None

            # Check deployment status based on service type
            if service_key == "render_backend":
                deployment = self.check_render_deployment(config)
            elif service_key == "vercel_frontend":
                deployment = self.check_vercel_deployment(config)
            elif service_key == "github_actions":
                deployment = self.check_github_actions(config)

            if deployment:
                # Generate hash for deployment to detect new ones
                deployment_hash = hashlib.sha256(
                    f"{deployment['deployment_id']}{deployment['status']}".encode()
                ).hexdigest()

                # Check if this is a new completed deployment
                if deployment_hash != self.last_deployment_hash.get(
                    service_key
                ) and deployment["status"] in ["live", "READY", "success"]:

                    logger.info(f"New deployment detected for {service_key}")

                    # Verify deployment health
                    health_passed = self.verify_deployment_health(service_key, config)

                    # Send alert
                    self.send_deployment_alert(deployment, health_passed)

                    # Update state
                    self.last_deployment_hash[service_key] = deployment_hash
                    self.deployment_history.append(
                        {
                            **deployment,
                            "health_check_passed": health_passed,
                            "detected_at": datetime.utcnow().isoformat(),
                        }
                    )

                    self.save_state()


def main():
    """Main monitoring loop"""
    monitor = DeploymentMonitor()

    logger.info("Starting deployment monitoring...")

    while True:
        try:
            monitor.monitor_deployments()

            # Check every 2 minutes
            time.sleep(120)

        except KeyboardInterrupt:
            logger.info("Deployment monitoring stopped by user")
            break
        except Exception as e:
            logger.error(f"Deployment monitoring error: {e}")
            time.sleep(120)


if __name__ == "__main__":
    main()
