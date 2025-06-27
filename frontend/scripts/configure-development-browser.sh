#!/bin/bash

# Development Browser Configuration Script
# Helps set up browser environments optimized for 6FB Booking development

set -e

echo "🌐 6FB Booking Platform - Development Browser Configuration"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
CHROME_DEV_PROFILE_DIR="$HOME/.chrome-dev-6fb"
FIREFOX_DEV_PROFILE_DIR="$HOME/.firefox-dev-6fb"

# Helper functions
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Detect operating system
detect_os() {
    case "$(uname -s)" in
        Darwin*) OS="mac" ;;
        Linux*)  OS="linux" ;;
        CYGWIN*|MINGW*|MSYS*) OS="windows" ;;
        *) OS="unknown" ;;
    esac
    print_info "Detected OS: $OS"
}

# Find browser executables
find_browsers() {
    print_info "Detecting installed browsers..."

    # Chrome/Chromium detection
    CHROME_EXEC=""
    case $OS in
        "mac")
            if [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
                CHROME_EXEC="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            elif [ -f "/Applications/Chromium.app/Contents/MacOS/Chromium" ]; then
                CHROME_EXEC="/Applications/Chromium.app/Contents/MacOS/Chromium"
            fi
            ;;
        "linux")
            if command -v google-chrome >/dev/null 2>&1; then
                CHROME_EXEC="google-chrome"
            elif command -v chromium-browser >/dev/null 2>&1; then
                CHROME_EXEC="chromium-browser"
            elif command -v chromium >/dev/null 2>&1; then
                CHROME_EXEC="chromium"
            fi
            ;;
        "windows")
            if [ -f "/c/Program Files/Google/Chrome/Application/chrome.exe" ]; then
                CHROME_EXEC="/c/Program Files/Google/Chrome/Application/chrome.exe"
            elif [ -f "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" ]; then
                CHROME_EXEC="/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
            fi
            ;;
    esac

    # Firefox detection
    FIREFOX_EXEC=""
    case $OS in
        "mac")
            if [ -f "/Applications/Firefox.app/Contents/MacOS/firefox" ]; then
                FIREFOX_EXEC="/Applications/Firefox.app/Contents/MacOS/firefox"
            fi
            ;;
        "linux")
            if command -v firefox >/dev/null 2>&1; then
                FIREFOX_EXEC="firefox"
            fi
            ;;
        "windows")
            if [ -f "/c/Program Files/Mozilla Firefox/firefox.exe" ]; then
                FIREFOX_EXEC="/c/Program Files/Mozilla Firefox/firefox.exe"
            fi
            ;;
    esac

    [ -n "$CHROME_EXEC" ] && print_status "Found Chrome: $CHROME_EXEC" || print_warning "Chrome not found"
    [ -n "$FIREFOX_EXEC" ] && print_status "Found Firefox: $FIREFOX_EXEC" || print_warning "Firefox not found"
}

# Create Chrome development profile
setup_chrome_dev_profile() {
    if [ -z "$CHROME_EXEC" ]; then
        print_warning "Chrome not found, skipping Chrome configuration"
        return
    fi

    print_info "Setting up Chrome development profile..."

    # Create profile directory
    mkdir -p "$CHROME_DEV_PROFILE_DIR"

    # Create Chrome preferences
    cat > "$CHROME_DEV_PROFILE_DIR/Preferences" << 'EOF'
{
   "profile": {
      "content_settings": {
         "exceptions": {
            "cookies": {
               "http://localhost:*,*": {
                  "setting": 1
               },
               "http://127.0.0.1:*,*": {
                  "setting": 1
               }
            },
            "javascript": {
               "http://localhost:*,*": {
                  "setting": 1
               },
               "http://127.0.0.1:*,*": {
                  "setting": 1
               }
            },
            "popups": {
               "http://localhost:*,*": {
                  "setting": 1
               },
               "http://127.0.0.1:*,*": {
                  "setting": 1
               }
            }
         }
      },
      "default_content_setting_values": {
         "cookies": 1,
         "javascript": 1,
         "popups": 1
      }
   },
   "security": {
      "disable_security_warnings": true
   }
}
EOF

    print_status "Chrome development profile created at: $CHROME_DEV_PROFILE_DIR"
}

# Create Firefox development profile
setup_firefox_dev_profile() {
    if [ -z "$FIREFOX_EXEC" ]; then
        print_warning "Firefox not found, skipping Firefox configuration"
        return
    fi

    print_info "Setting up Firefox development profile..."

    # Create Firefox profile using the browser
    "$FIREFOX_EXEC" -CreateProfile "6fb-development $FIREFOX_DEV_PROFILE_DIR" 2>/dev/null || true
    sleep 2

    # Create Firefox preferences
    if [ -d "$FIREFOX_DEV_PROFILE_DIR" ]; then
        cat > "$FIREFOX_DEV_PROFILE_DIR/user.js" << 'EOF'
// 6FB Booking Development Profile Configuration
// Security and HTTPS
user_pref("dom.security.https_only_mode", false);
user_pref("security.tls.insecure_fallback_hosts", "localhost,127.0.0.1");
user_pref("network.stricttransportsecurity.preloadlist", false);

// CORS and Security
user_pref("security.csp.enable", true);
user_pref("security.fileuri.strict_origin_policy", false);

// Privacy and Tracking
user_pref("privacy.trackingprotection.enabled", false);
user_pref("privacy.trackingprotection.pbmode.enabled", true);
user_pref("network.cookie.cookieBehavior", 0);

// Development-specific
user_pref("devtools.netmonitor.persistlog", true);
user_pref("devtools.console.persistlog", true);
user_pref("browser.cache.disk.enable", false);
user_pref("browser.cache.memory.enable", true);
user_pref("devtools.chrome.enabled", true);
user_pref("devtools.debugger.remote-enabled", true);

// Disable updates and data collection for development
user_pref("app.update.enabled", false);
user_pref("datareporting.healthreport.uploadEnabled", false);
user_pref("toolkit.telemetry.enabled", false);
EOF
        print_status "Firefox development profile configured at: $FIREFOX_DEV_PROFILE_DIR"
    else
        print_error "Failed to create Firefox development profile"
    fi
}

# Generate browser launch scripts
generate_launch_scripts() {
    print_info "Generating browser launch scripts..."

    # Chrome launch script
    if [ -n "$CHROME_EXEC" ]; then
        cat > "launch-chrome-dev.sh" << EOF
#!/bin/bash
# Launch Chrome with 6FB development configuration
exec "$CHROME_EXEC" \\
    --user-data-dir="$CHROME_DEV_PROFILE_DIR" \\
    --disable-web-security \\
    --disable-features=VizDisplayCompositor \\
    --allow-running-insecure-content \\
    --disable-backgrounding-occluded-windows \\
    --disable-renderer-backgrounding \\
    --enable-logging \\
    --log-level=0 \\
    --new-window \\
    "http://localhost:3000" \\
    "\$@"
EOF
        chmod +x "launch-chrome-dev.sh"
        print_status "Created launch-chrome-dev.sh"
    fi

    # Firefox launch script
    if [ -n "$FIREFOX_EXEC" ]; then
        cat > "launch-firefox-dev.sh" << EOF
#!/bin/bash
# Launch Firefox with 6FB development configuration
exec "$FIREFOX_EXEC" \\
    -profile "$FIREFOX_DEV_PROFILE_DIR" \\
    -new-window \\
    "http://localhost:3000" \\
    "\$@"
EOF
        chmod +x "launch-firefox-dev.sh"
        print_status "Created launch-firefox-dev.sh"
    fi
}

# Generate extension configuration
generate_extension_configs() {
    print_info "Generating extension configuration guides..."

    # uBlock Origin configuration
    cat > "ublock-origin-config.txt" << 'EOF'
uBlock Origin Configuration for 6FB Development
==============================================

1. Click the uBlock Origin icon
2. Click the gear icon (Dashboard)
3. Go to "Whitelist" tab
4. Add these entries:

localhost
127.0.0.1
localhost:3000
localhost:8000
127.0.0.1:3000
127.0.0.1:8000

5. Go to "My filters" tab
6. Add these custom filters:

@@||localhost^$document
@@||127.0.0.1^$document

7. Click "Apply changes"
EOF

    # Privacy Badger configuration
    cat > "privacy-badger-config.txt" << 'EOF'
Privacy Badger Configuration for 6FB Development
===============================================

1. Click the Privacy Badger icon
2. Click the gear icon (Settings)
3. Click "Manage Data"
4. Add to "Allow on these domains":

localhost:3000
localhost:8000
127.0.0.1:3000
127.0.0.1:8000

5. Save settings
EOF

    print_status "Generated extension configuration files"
}

# Test browser configurations
test_configurations() {
    print_info "Testing browser configurations..."

    # Test if servers are running
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend server (localhost:3000) is accessible"
    else
        print_warning "Frontend server (localhost:3000) is not running"
        print_info "Start it with: npm run dev"
    fi

    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        print_status "Backend server (localhost:8000) is accessible"
    else
        print_warning "Backend server (localhost:8000) is not running"
        print_info "Start it with: cd ../backend && uvicorn main:app --reload"
    fi

    # Run enhanced extension detector if available
    if [ -f "scripts/enhanced-extension-detector.js" ]; then
        print_info "Running enhanced extension detector..."
        node scripts/enhanced-extension-detector.js || print_warning "Extension detector failed"
    fi
}

# Display usage instructions
show_usage() {
    echo ""
    echo "🚀 Configuration Complete!"
    echo "========================="
    echo ""
    echo "Generated Files:"
    echo "  • launch-chrome-dev.sh    - Launch Chrome with development settings"
    echo "  • launch-firefox-dev.sh   - Launch Firefox with development settings"
    echo "  • ublock-origin-config.txt - uBlock Origin configuration guide"
    echo "  • privacy-badger-config.txt - Privacy Badger configuration guide"
    echo ""
    echo "Usage:"
    echo "  ./launch-chrome-dev.sh     - Start Chrome for development"
    echo "  ./launch-firefox-dev.sh    - Start Firefox for development"
    echo ""
    echo "Next Steps:"
    echo "  1. Start your development servers:"
    echo "     Frontend: npm run dev"
    echo "     Backend: cd ../backend && uvicorn main:app --reload"
    echo ""
    echo "  2. Launch a configured browser:"
    echo "     ./launch-chrome-dev.sh"
    echo ""
    echo "  3. Configure extensions using the generated config files"
    echo ""
    echo "  4. Run compatibility tests:"
    echo "     node scripts/enhanced-extension-detector.js"
    echo ""
    echo "For detailed browser configuration, see: BROWSER_CONFIGURATION_GUIDE.md"
}

# Main execution
main() {
    echo ""
    detect_os
    find_browsers
    echo ""

    # Ask user what to configure
    echo "What would you like to configure?"
    echo "1) Chrome development profile"
    echo "2) Firefox development profile"
    echo "3) Both browsers"
    echo "4) Generate launch scripts only"
    echo "5) Full setup (recommended)"
    echo ""
    read -p "Choose option (1-5): " choice

    case $choice in
        1)
            setup_chrome_dev_profile
            generate_launch_scripts
            ;;
        2)
            setup_firefox_dev_profile
            generate_launch_scripts
            ;;
        3)
            setup_chrome_dev_profile
            setup_firefox_dev_profile
            generate_launch_scripts
            ;;
        4)
            generate_launch_scripts
            ;;
        5)
            setup_chrome_dev_profile
            setup_firefox_dev_profile
            generate_launch_scripts
            generate_extension_configs
            test_configurations
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac

    show_usage
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --test         Run configuration tests only"
        echo "  --chrome       Configure Chrome only"
        echo "  --firefox      Configure Firefox only"
        echo ""
        echo "Interactive mode will run if no options are provided."
        exit 0
        ;;
    --test)
        detect_os
        find_browsers
        test_configurations
        exit 0
        ;;
    --chrome)
        detect_os
        find_browsers
        setup_chrome_dev_profile
        generate_launch_scripts
        show_usage
        exit 0
        ;;
    --firefox)
        detect_os
        find_browsers
        setup_firefox_dev_profile
        generate_launch_scripts
        show_usage
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
