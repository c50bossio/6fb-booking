#!/bin/bash
# AWS Configuration Helper for BookedBarber ElastiCache

echo "🔧 AWS CLI Configuration for BookedBarber"
echo "========================================"
echo ""
echo "Please enter your AWS credentials:"
echo ""

# Prompt for credentials
read -p "AWS Access Key ID (starts with AKIA): " access_key
read -s -p "AWS Secret Access Key: " secret_key
echo ""
read -p "Default region [us-east-1]: " region
region=${region:-us-east-1}
read -p "Default output format [json]: " output
output=${output:-json}

# Configure AWS
aws configure set aws_access_key_id "$access_key"
aws configure set aws_secret_access_key "$secret_key"
aws configure set default.region "$region"
aws configure set default.output "$output"

echo ""
echo "✅ AWS CLI configured successfully!"
echo ""

# Test the configuration
echo "🔍 Testing AWS credentials..."
if aws sts get-caller-identity > /dev/null 2>&1; then
    echo "✅ Credentials are valid!"
    echo ""
    aws sts get-caller-identity
else
    echo "❌ Error: Invalid credentials or configuration"
    exit 1
fi

echo ""
echo "Ready to deploy ElastiCache!"