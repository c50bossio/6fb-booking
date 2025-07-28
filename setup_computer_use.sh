#!/bin/bash

echo "🚀 Setting up Anthropic Computer Use"
echo "======================================"

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ANTHROPIC_API_KEY not found!"
    echo ""
    echo "To get started:"
    echo "1. Get your API key from: https://console.anthropic.com/"
    echo "2. Run: export ANTHROPIC_API_KEY='your-api-key-here'"
    echo "3. Add it to your ~/.bashrc or ~/.zshrc to make it permanent:"
    echo "   echo 'export ANTHROPIC_API_KEY=\"your-api-key-here\"' >> ~/.bashrc"
    echo ""
    exit 1
fi

echo "✅ API key found"

# Check Python version
python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
echo "🐍 Python version: $python_version"

# Install/verify packages
echo "📦 Installing required packages..."
pip3 install anthropic pillow pyautogui

# Check permissions on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "🍎 macOS Detected - Checking permissions..."
    echo ""
    echo "⚠️  IMPORTANT: For Computer Use to work on macOS, you need to:"
    echo "1. Enable 'Screen Recording' permission for Terminal/IDE"
    echo "2. Enable 'Accessibility' permission for Python"
    echo ""
    echo "Go to: System Preferences → Security & Privacy → Privacy"
    echo "- Add Terminal to 'Screen Recording'"
    echo "- Add Python to 'Accessibility'"
    echo ""
fi

# Test the setup
echo "🧪 Testing setup..."
python3 computer_use_setup.py

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Usage examples:"
echo "1. Basic screenshot analysis:"
echo "   python3 computer_use_setup.py"
echo ""
echo "2. In your own code:"
echo "   from computer_use_setup import ComputerUseAgent"
echo "   agent = ComputerUseAgent()"
echo "   result = agent.execute_computer_action('Open a web browser')"
echo ""
echo "🔗 Documentation: https://docs.anthropic.com/en/docs/computer-use"