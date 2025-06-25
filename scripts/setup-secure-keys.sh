#!/bin/bash

# Secure Stripe Key Setup Script
# Created: 2025-06-25
# Purpose: Help set up secure storage for production Stripe keys

echo "🔒 SECURE STRIPE KEY SETUP"
echo "=========================="
echo ""

# Function to validate Stripe key format
validate_key() {
    local key="$1"
    local type="$2"

    if [[ $type == "secret" ]]; then
        if [[ $key =~ ^sk_live_[a-zA-Z0-9]{24,}$ ]]; then
            return 0
        else
            echo "❌ Invalid secret key format. Should start with 'sk_live_'"
            return 1
        fi
    elif [[ $type == "publishable" ]]; then
        if [[ $key =~ ^pk_live_[a-zA-Z0-9]{24,}$ ]]; then
            return 0
        else
            echo "❌ Invalid publishable key format. Should start with 'pk_live_'"
            return 1
        fi
    fi
}

# Function to setup environment variables
setup_env_vars() {
    echo "Setting up environment variables in ~/.zshrc..."

    # Backup existing zshrc
    if [ -f ~/.zshrc ]; then
        cp ~/.zshrc ~/.zshrc.backup.$(date +%Y%m%d_%H%M%S)
        echo "✅ Backed up existing ~/.zshrc"
    fi

    # Add Stripe keys to zshrc
    echo "" >> ~/.zshrc
    echo "# Stripe Production Keys (Added $(date))" >> ~/.zshrc
    echo "export STRIPE_SECRET_KEY=\"$1\"" >> ~/.zshrc
    echo "export STRIPE_PUBLISHABLE_KEY=\"$2\"" >> ~/.zshrc

    echo "✅ Added keys to ~/.zshrc"
    echo "Run 'source ~/.zshrc' to load them"
}

# Function to setup secure file
setup_secure_file() {
    local secure_dir="$HOME/secure-configs"
    local env_file="$secure_dir/stripe-production.env"

    # Create secure directory
    mkdir -p "$secure_dir"
    chmod 700 "$secure_dir"

    # Create env file
    cat > "$env_file" << EOF
# Stripe Production Keys
# Created: $(date)
# Purpose: Secure storage for Bossio Investing Machine production keys

STRIPE_SECRET_KEY=$1
STRIPE_PUBLISHABLE_KEY=$2
EOF

    # Set secure permissions
    chmod 600 "$env_file"

    echo "✅ Created secure env file: $env_file"
    echo "Load with: source $env_file"
}

# Function to setup keychain storage
setup_keychain() {
    echo "Setting up macOS Keychain storage..."

    # Delete existing entries if they exist
    security delete-generic-password -a "bossio-stripe" -s "secret_key" 2>/dev/null || true
    security delete-generic-password -a "bossio-stripe" -s "publishable_key" 2>/dev/null || true

    # Add new entries
    security add-generic-password -a "bossio-stripe" -s "secret_key" -w "$1" -T ""
    security add-generic-password -a "bossio-stripe" -s "publishable_key" -w "$2" -T ""

    echo "✅ Added keys to macOS Keychain"
    echo "Retrieve with: security find-generic-password -a 'bossio-stripe' -s 'secret_key' -w"
}

# Main menu
echo "Choose your preferred secure storage method:"
echo "1. Environment Variables (in ~/.zshrc) - Recommended"
echo "2. Secure File (~/secure-configs/stripe-production.env)"
echo "3. macOS Keychain (Most secure)"
echo "4. All of the above"
echo ""
read -p "Enter your choice (1-4): " choice

echo ""
echo "Please enter your NEW Stripe keys (after rotation):"
echo ""

# Get secret key
while true; do
    read -s -p "Enter your SECRET key (sk_live_...): " secret_key  # pragma: allowlist secret
    echo ""
    if validate_key "$secret_key" "secret"; then
        break
    fi
done

# Get publishable key
while true; do
    read -p "Enter your PUBLISHABLE key (pk_live_...): " publishable_key
    echo ""
    if validate_key "$publishable_key" "publishable"; then
        break
    fi
done

echo ""
echo "Setting up secure storage..."
echo ""

case $choice in
    1)
        setup_env_vars "$secret_key" "$publishable_key"
        ;;
    2)
        setup_secure_file "$secret_key" "$publishable_key"
        ;;
    3)
        setup_keychain "$secret_key" "$publishable_key"
        ;;
    4)
        setup_env_vars "$secret_key" "$publishable_key"
        setup_secure_file "$secret_key" "$publishable_key"
        setup_keychain "$secret_key" "$publishable_key"
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "🔒 SECURITY REMINDERS:"
echo "======================"
echo "1. ✅ Keys are now stored securely"
echo "2. 🔄 Remember to update your deployment platforms:"
echo "   - Railway: Project → Variables"
echo "   - Render: Service → Environment"
echo "   - Vercel: Project → Settings → Environment Variables"
echo "3. 🗑️  Revoke the OLD keys in Stripe Dashboard ONLY after updating deployments"
echo "4. 🧪 Test payment functionality after deployment updates"
echo ""
echo "✅ Secure key setup complete!"

# Clear sensitive variables
unset secret_key
unset publishable_key
