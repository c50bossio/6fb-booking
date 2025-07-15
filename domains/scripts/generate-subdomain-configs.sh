#!/bin/bash

# BookedBarber V2 Subdomain Configuration Generator
# Generates nginx configuration files for all subdomains

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAINS_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATE_FILE="$DOMAINS_DIR/templates/nginx-subdomain.conf"
CONFIG_FILE="$DOMAINS_DIR/templates/subdomain-configs.json"
OUTPUT_DIR="$DOMAINS_DIR/generated"
NGINX_SITES_DIR="/etc/nginx/sites-available"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}BookedBarber V2 Subdomain Configuration Generator${NC}"
echo "=================================================="

# Check if required files exist
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: Template file not found: $TEMPLATE_FILE${NC}"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file not found: $CONFIG_FILE${NC}"
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required for JSON processing${NC}"
    echo "Please install jq: sudo apt-get install jq (Ubuntu) or brew install jq (macOS)"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to substitute template variables
substitute_template() {
    local template_content="$1"
    local subdomain="$2"
    local config_key="$3"
    
    # Get configuration values from JSON
    local purpose=$(jq -r ".subdomains.${config_key}.purpose" "$CONFIG_FILE")
    local backend_url=$(jq -r ".subdomains.${config_key}.backend_url" "$CONFIG_FILE")
    local x_frame_options=$(jq -r ".subdomains.${config_key}.x_frame_options" "$CONFIG_FILE")
    local csp_policy=$(jq -r ".subdomains.${config_key}.csp_policy" "$CONFIG_FILE")
    local cors_headers=$(jq -r ".subdomains.${config_key}.cors_headers" "$CONFIG_FILE")
    local rate_limit_zone=$(jq -r ".subdomains.${config_key}.rate_limit_zone" "$CONFIG_FILE")
    local rate_limit_burst=$(jq -r ".subdomains.${config_key}.rate_limit_burst" "$CONFIG_FILE")
    local static_cache_time=$(jq -r ".subdomains.${config_key}.static_cache_time" "$CONFIG_FILE")
    local proxy_timeout=$(jq -r ".subdomains.${config_key}.proxy_timeout" "$CONFIG_FILE")
    local access_control=$(jq -r ".subdomains.${config_key}.access_control" "$CONFIG_FILE")
    local custom_locations=$(jq -r ".subdomains.${config_key}.custom_locations" "$CONFIG_FILE")
    local custom_proxy_settings=$(jq -r ".subdomains.${config_key}.custom_proxy_settings" "$CONFIG_FILE")
    
    # Handle null values
    [ "$cors_headers" = "null" ] && cors_headers=""
    [ "$access_control" = "null" ] && access_control=""
    [ "$custom_locations" = "null" ] && custom_locations=""
    [ "$custom_proxy_settings" = "null" ] && custom_proxy_settings=""
    
    # Perform substitutions
    echo "$template_content" | \
        sed "s|{{SUBDOMAIN}}|$subdomain|g" | \
        sed "s|{{PURPOSE}}|$purpose|g" | \
        sed "s|{{BACKEND_URL}}|$backend_url|g" | \
        sed "s|{{X_FRAME_OPTIONS}}|$x_frame_options|g" | \
        sed "s|{{CSP_POLICY}}|$csp_policy|g" | \
        sed "s|{{RATE_LIMIT_ZONE}}|$rate_limit_zone|g" | \
        sed "s|{{RATE_LIMIT_BURST}}|$rate_limit_burst|g" | \
        sed "s|{{STATIC_CACHE_TIME}}|$static_cache_time|g" | \
        sed "s|{{PROXY_TIMEOUT}}|$proxy_timeout|g" | \
        sed $'s|{{CORS_HEADERS}}|'"$cors_headers"'|g' | \
        sed $'s|{{ACCESS_CONTROL}}|'"$access_control"'|g' | \
        sed $'s|{{CUSTOM_LOCATIONS}}|'"$custom_locations"'|g' | \
        sed $'s|{{CUSTOM_PROXY_SETTINGS}}|'"$custom_proxy_settings"'|g'
}

# Function to generate configuration for a subdomain
generate_subdomain_config() {
    local subdomain="$1"
    local config_key="$2"
    
    echo -e "${BLUE}Generating configuration for $subdomain.bookedbarber.com...${NC}"
    
    # Read template file
    local template_content=$(cat "$TEMPLATE_FILE")
    
    # Substitute variables
    local config_content=$(substitute_template "$template_content" "$subdomain" "$config_key")
    
    # Write output file
    local output_file="$OUTPUT_DIR/${subdomain}.bookedbarber.com.conf"
    echo "$config_content" > "$output_file"
    
    echo -e "${GREEN}✓ Generated: $output_file${NC}"
}

# Function to validate generated configurations
validate_configurations() {
    echo -e "${BLUE}Validating generated configurations...${NC}"
    
    local validation_errors=0
    
    for config_file in "$OUTPUT_DIR"/*.conf; do
        if [ -f "$config_file" ]; then
            echo -n "Validating $(basename "$config_file")... "
            
            # Test nginx configuration syntax
            if nginx -t -c "$config_file" 2>/dev/null; then
                echo -e "${GREEN}✓${NC}"
            else
                echo -e "${RED}✗${NC}"
                ((validation_errors++))
            fi
        fi
    done
    
    if [ $validation_errors -eq 0 ]; then
        echo -e "${GREEN}All configurations are valid${NC}"
        return 0
    else
        echo -e "${RED}$validation_errors configuration(s) have errors${NC}"
        return 1
    fi
}

# Function to install configurations to nginx
install_configurations() {
    echo -e "${BLUE}Installing configurations to nginx...${NC}"
    
    if [ ! -d "$NGINX_SITES_DIR" ]; then
        echo -e "${RED}Error: Nginx sites directory not found: $NGINX_SITES_DIR${NC}"
        echo "Please install nginx first"
        return 1
    fi
    
    local installed_count=0
    
    for config_file in "$OUTPUT_DIR"/*.conf; do
        if [ -f "$config_file" ]; then
            local filename=$(basename "$config_file")
            local target_file="$NGINX_SITES_DIR/$filename"
            
            echo -n "Installing $filename... "
            
            # Backup existing file if it exists
            if [ -f "$target_file" ]; then
                sudo cp "$target_file" "$target_file.backup.$(date +%Y%m%d-%H%M%S)"
            fi
            
            # Copy new configuration
            sudo cp "$config_file" "$target_file"
            
            # Enable site
            sudo ln -sf "$target_file" "/etc/nginx/sites-enabled/"
            
            echo -e "${GREEN}✓${NC}"
            ((installed_count++))
        fi
    done
    
    echo -e "${GREEN}Installed $installed_count configuration(s)${NC}"
    
    # Test nginx configuration
    echo -n "Testing nginx configuration... "
    if sudo nginx -t; then
        echo -e "${GREEN}✓${NC}"
        
        # Offer to reload nginx
        read -p "Reload nginx to apply changes? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo systemctl reload nginx
            echo -e "${GREEN}Nginx reloaded successfully${NC}"
        fi
    else
        echo -e "${RED}✗ Nginx configuration test failed${NC}"
        return 1
    fi
}

# Function to create htpasswd files for protected subdomains
create_auth_files() {
    echo -e "${BLUE}Creating authentication files...${NC}"
    
    # Check if htpasswd is available
    if ! command -v htpasswd &> /dev/null; then
        echo -e "${YELLOW}Warning: htpasswd not found. Install apache2-utils to create auth files${NC}"
        return 0
    fi
    
    # Create staging auth file
    if [ ! -f "/etc/nginx/.htpasswd-staging" ]; then
        echo -n "Create staging authentication file? (y/N): "
        read -r reply
        if [[ $reply =~ ^[Yy]$ ]]; then
            read -p "Enter username for staging: " staging_user
            sudo htpasswd -c /etc/nginx/.htpasswd-staging "$staging_user"
            echo -e "${GREEN}Created staging auth file${NC}"
        fi
    fi
    
    # Create admin monitoring auth file
    if [ ! -f "/etc/nginx/.htpasswd" ]; then
        echo -n "Create admin monitoring authentication file? (y/N): "
        read -r reply
        if [[ $reply =~ ^[Yy]$ ]]; then
            read -p "Enter username for admin monitoring: " admin_user
            sudo htpasswd -c /etc/nginx/.htpasswd "$admin_user"
            echo -e "${GREEN}Created admin monitoring auth file${NC}"
        fi
    fi
}

# Function to show summary
show_summary() {
    echo ""
    echo -e "${GREEN}Configuration Generation Complete!${NC}"
    echo "======================================"
    echo ""
    echo "Generated configurations:"
    ls -la "$OUTPUT_DIR"/*.conf 2>/dev/null | awk '{print "  " $9}' | sed 's|.*/||'
    echo ""
    echo "Next steps:"
    echo "1. Review the generated configurations in: $OUTPUT_DIR"
    echo "2. Update SSL certificate paths if needed"
    echo "3. Configure DNS records for all subdomains"
    echo "4. Obtain SSL certificates for each subdomain"
    echo "5. Test each subdomain after deployment"
    echo ""
    echo "Subdomain URLs to test:"
    jq -r '.subdomains | keys[]' "$CONFIG_FILE" | while read subdomain; do
        echo "  - https://$subdomain.bookedbarber.com"
    done
}

# Main execution
main() {
    echo "Template file: $TEMPLATE_FILE"
    echo "Configuration file: $CONFIG_FILE"
    echo "Output directory: $OUTPUT_DIR"
    echo ""
    
    # Get list of subdomains from configuration
    local subdomains=$(jq -r '.subdomains | keys[]' "$CONFIG_FILE")
    
    if [ -z "$subdomains" ]; then
        echo -e "${RED}Error: No subdomains found in configuration file${NC}"
        exit 1
    fi
    
    echo "Subdomains to generate:"
    echo "$subdomains" | sed 's/^/  - /'
    echo ""
    
    read -p "Generate configurations for all subdomains? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Configuration generation cancelled."
        exit 0
    fi
    
    # Generate configurations
    while IFS= read -r subdomain; do
        generate_subdomain_config "$subdomain" "$subdomain"
    done <<< "$subdomains"
    
    echo ""
    
    # Validate configurations
    if ! validate_configurations; then
        echo -e "${RED}Validation failed. Please check the configurations.${NC}"
        exit 1
    fi
    
    echo ""
    
    # Ask if user wants to install to nginx
    read -p "Install configurations to nginx? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_configurations
        create_auth_files
    fi
    
    # Show summary
    show_summary
}

# Command line options
case "${1:-generate}" in
    "generate")
        main
        ;;
    "install")
        install_configurations
        ;;
    "validate")
        validate_configurations
        ;;
    "clean")
        echo -e "${YELLOW}Removing generated configurations...${NC}"
        rm -f "$OUTPUT_DIR"/*.conf
        echo -e "${GREEN}Cleaned generated configurations${NC}"
        ;;
    *)
        echo "Usage: $0 {generate|install|validate|clean}"
        echo ""
        echo "Commands:"
        echo "  generate  - Generate nginx configurations for all subdomains (default)"
        echo "  install   - Install generated configurations to nginx"
        echo "  validate  - Validate generated configurations"
        echo "  clean     - Remove generated configuration files"
        exit 1
        ;;
esac