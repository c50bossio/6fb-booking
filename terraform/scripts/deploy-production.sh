#!/bin/bash

# BookedBarber V2 - Production Deployment Script
# This script handles the complete deployment of production infrastructure

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENVIRONMENT="production"
TERRAFORM_DIR="$PROJECT_ROOT/environments/$ENVIRONMENT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        error "Terraform is not installed. Please install Terraform."
        exit 1
    fi
    
    # Check Terraform version
    TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
    log "Terraform version: $TERRAFORM_VERSION"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install AWS CLI."
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        error "jq is not installed. Please install jq for JSON processing."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials are not configured or invalid."
        exit 1
    fi
    
    # Get AWS account info
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region)
    log "AWS Account ID: $AWS_ACCOUNT_ID"
    log "AWS Region: $AWS_REGION"
    
    success "Prerequisites check completed"
}

# Validate configuration
validate_config() {
    log "Validating configuration..."
    
    if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
        error "terraform.tfvars file not found in $TERRAFORM_DIR"
        error "Please copy terraform.tfvars.example to terraform.tfvars and configure it"
        exit 1
    fi
    
    # Check for required secrets in Parameter Store
    REQUIRED_SECRETS=(
        "/bookedbarber/production/secrets/db_master_password"
        "/bookedbarber/production/secrets/jwt_secret_key"
        "/bookedbarber/production/secrets/stripe_secret_key"
        "/bookedbarber/production/secrets/sendgrid_api_key"
        "/bookedbarber/production/secrets/twilio_auth_token"
        "/bookedbarber/production/secrets/google_client_secret"
        "/bookedbarber/production/secrets/sentry_dsn"
    )
    
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if ! aws ssm get-parameter --name "$secret" --with-decryption &> /dev/null; then
            error "Required secret not found: $secret"
            error "Please create all required secrets in AWS Parameter Store"
            exit 1
        fi
    done
    
    success "Configuration validation completed"
}

# Setup Terraform backend
setup_backend() {
    log "Setting up Terraform backend..."
    
    # Check if S3 bucket exists
    BUCKET_NAME="bookedbarber-terraform-state-prod"
    if ! aws s3 ls "s3://$BUCKET_NAME" &> /dev/null; then
        log "Creating S3 bucket for Terraform state..."
        aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$BUCKET_NAME" \
            --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "$BUCKET_NAME" \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'
        
        # Block public access
        aws s3api put-public-access-block \
            --bucket "$BUCKET_NAME" \
            --public-access-block-configuration \
            BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
    fi
    
    # Check if DynamoDB table exists
    TABLE_NAME="bookedbarber-terraform-locks"
    if ! aws dynamodb describe-table --table-name "$TABLE_NAME" &> /dev/null; then
        log "Creating DynamoDB table for Terraform locks..."
        aws dynamodb create-table \
            --table-name "$TABLE_NAME" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --region "$AWS_REGION"
        
        # Wait for table to be created
        aws dynamodb wait table-exists --table-name "$TABLE_NAME"
    fi
    
    success "Terraform backend setup completed"
}

# Initialize Terraform
init_terraform() {
    log "Initializing Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize with backend configuration
    terraform init \
        -backend-config="bucket=bookedbarber-terraform-state-prod" \
        -backend-config="key=production/terraform.tfstate" \
        -backend-config="region=$AWS_REGION" \
        -backend-config="dynamodb_table=bookedbarber-terraform-locks" \
        -backend-config="encrypt=true"
    
    success "Terraform initialization completed"
}

# Plan deployment
plan_deployment() {
    log "Creating Terraform plan..."
    
    cd "$TERRAFORM_DIR"
    
    # Create plan
    terraform plan \
        -var-file="terraform.tfvars" \
        -out="production.tfplan" \
        -detailed-exitcode
    
    local plan_exit_code=$?
    
    if [ $plan_exit_code -eq 0 ]; then
        warning "No changes detected in Terraform plan"
    elif [ $plan_exit_code -eq 2 ]; then
        success "Terraform plan created successfully with changes"
    else
        error "Terraform plan failed"
        exit 1
    fi
    
    return $plan_exit_code
}

# Apply deployment
apply_deployment() {
    log "Applying Terraform deployment..."
    
    cd "$TERRAFORM_DIR"
    
    # Apply the plan
    terraform apply "production.tfplan"
    
    if [ $? -eq 0 ]; then
        success "Terraform deployment completed successfully"
    else
        error "Terraform deployment failed"
        exit 1
    fi
}

# Post-deployment verification
verify_deployment() {
    log "Verifying deployment..."
    
    cd "$TERRAFORM_DIR"
    
    # Get outputs
    terraform output -json > deployment_outputs.json
    
    # Extract key endpoints
    API_URL=$(terraform output -raw application_urls | jq -r '.api_url' 2>/dev/null || echo "")
    FRONTEND_URL=$(terraform output -raw application_urls | jq -r '.frontend_url' 2>/dev/null || echo "")
    
    if [ -n "$API_URL" ]; then
        log "Testing API endpoint: $API_URL"
        if curl -f -s "$API_URL/health" > /dev/null; then
            success "API health check passed"
        else
            warning "API health check failed - this may be expected during initial deployment"
        fi
    fi
    
    if [ -n "$FRONTEND_URL" ]; then
        log "Testing frontend endpoint: $FRONTEND_URL"
        if curl -f -s "$FRONTEND_URL" > /dev/null; then
            success "Frontend health check passed"
        else
            warning "Frontend health check failed - this may be expected during initial deployment"
        fi
    fi
    
    success "Deployment verification completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    
    cd "$TERRAFORM_DIR"
    
    # Remove plan file
    if [ -f "production.tfplan" ]; then
        rm -f "production.tfplan"
    fi
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting BookedBarber V2 production deployment..."
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Run deployment steps
    check_prerequisites
    validate_config
    setup_backend
    init_terraform
    
    # Plan deployment
    plan_deployment
    local plan_result=$?
    
    if [ $plan_result -eq 0 ]; then
        log "No changes to apply, skipping deployment"
        success "Deployment completed - no changes needed"
        return 0
    fi
    
    # Confirm deployment
    if [ "${AUTO_APPROVE:-false}" != "true" ]; then
        echo
        warning "This will deploy changes to the PRODUCTION environment!"
        echo "Review the plan above carefully."
        read -p "Do you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Apply deployment
    apply_deployment
    verify_deployment
    
    success "BookedBarber V2 production deployment completed successfully!"
    
    # Display important outputs
    echo
    log "Deployment Summary:"
    echo "=================="
    cd "$TERRAFORM_DIR"
    terraform output application_urls
    echo
    terraform output infrastructure_details
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi