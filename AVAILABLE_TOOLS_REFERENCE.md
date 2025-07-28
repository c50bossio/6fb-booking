# Available Tools Reference for Claude Code and Agents

## 🤖 Computer Use (AI Visual Analysis)

### Quick Setup
```bash
export ANTHROPIC_API_KEY="your-anthropic-api-key-from-env"
python3 computer_use_basic.py
```

### Core Function
```python
from computer_use_basic import analyze_screen_with_claude

result = analyze_screen_with_claude("What do you see on this screen?")
print(result['response'])
```

### Common Use Cases
- **Debug Visual Issues**: "What errors are visible on this booking form?"
- **Validate UX**: "How is the user experience of this calendar?"
- **Check Loading States**: "Is the page fully loaded or still loading?"
- **Identify Layout Problems**: "Are there any layout issues with this dashboard?"
- **Accessibility Analysis**: "How accessible is this interface for users?"

## 🎭 Puppeteer MCP Integration

### Available Functions
```python
# Navigation
mcp__puppeteer__puppeteer_navigate(url="http://localhost:3000")

# Interactions
mcp__puppeteer__puppeteer_click(selector="#submit-button")
mcp__puppeteer__puppeteer_fill(selector="#email", value="test@example.com")
mcp__puppeteer__puppeteer_select(selector="#service", value="haircut")
mcp__puppeteer__puppeteer_hover(selector=".tooltip")

# Information Gathering
mcp__puppeteer__puppeteer_screenshot(name="current-state")
mcp__puppeteer__puppeteer_evaluate(script="document.title")
```

### Common Use Cases
- **Automated Testing**: Navigate through user flows
- **Form Testing**: Fill and submit forms automatically
- **Data Extraction**: Get values from page elements
- **Screenshots**: Capture visual states for documentation
- **Performance Testing**: Measure page load times

## 🔄 Combined Workflows

### AI-Guided Automation
```python
# 1. Automate action
mcp__puppeteer__puppeteer_navigate(url="http://localhost:3000/booking")
mcp__puppeteer__puppeteer_click(selector="#book-now")

# 2. AI validates result
analysis = analyze_screen_with_claude("Did the booking form appear correctly?")

# 3. Respond based on AI
if "error" in analysis['response'].lower():
    mcp__puppeteer__puppeteer_screenshot(name="error-state")
    # Handle error
```

### Visual Regression Testing
```python
# Before changes
mcp__puppeteer__puppeteer_screenshot(name="before")
before_desc = analyze_screen_with_claude("Describe this page")

# Make changes...

# After changes
mcp__puppeteer__puppeteer_screenshot(name="after")
after_desc = analyze_screen_with_claude("Describe this page")

# Compare
comparison = analyze_screen_with_claude(
    f"Compare: Before: {before_desc['response']} After: {after_desc['response']}"
)
```

## 🎯 Agent-Specific Usage

### Debugger Agent
- **Computer Use**: Identify visual bugs, layout issues, error states
- **Puppeteer**: Reproduce bugs, test fixes, automate issue recreation
- **Combined**: Complete debugging workflow with visual validation

### QA Engineer Agent  
- **Computer Use**: Visual validation, UX testing, accessibility checks
- **Puppeteer**: Automated test execution, form testing, user flow validation
- **Combined**: Comprehensive testing with both functional and visual validation

### Frontend Specialist Agent
- **Computer Use**: Responsive design validation, cross-browser visual testing
- **Puppeteer**: Browser compatibility testing, performance measurement
- **Combined**: Complete frontend quality assurance

### Performance Engineer Agent
- **Computer Use**: Visual performance analysis (loading states, animations)
- **Puppeteer**: Performance metrics collection, load time measurement
- **Combined**: Holistic performance optimization

## 🚀 Project-Specific Endpoints

### BookedBarber V2 Test URLs
```python
# Development environment
mcp__puppeteer__puppeteer_navigate(url="http://localhost:3000")          # Homepage
mcp__puppeteer__puppeteer_navigate(url="http://localhost:3000/dashboard") # Dashboard
mcp__puppeteer__puppeteer_navigate(url="http://localhost:3000/calendar")  # Calendar
mcp__puppeteer__puppeteer_navigate(url="http://localhost:3000/booking")   # Booking
mcp__puppeteer__puppeteer_navigate(url="http://localhost:8000/docs")      # API docs

# Staging environment
mcp__puppeteer__puppeteer_navigate(url="http://localhost:3001")          # Staging frontend
mcp__puppeteer__puppeteer_navigate(url="http://localhost:8001/docs")     # Staging API
```

## 🛠️ Troubleshooting

### Computer Use Issues
```bash
# Permission issues (macOS)
# System Preferences → Security & Privacy → Privacy
# - Add Terminal to 'Screen Recording'
# - Add Python to 'Accessibility'

# API key issues
echo $ANTHROPIC_API_KEY  # Should show the key
export ANTHROPIC_API_KEY="your-key-from-env"  # Set if missing
```

### Puppeteer Issues
```bash
# Test if MCP tools are available
mcp__puppeteer__puppeteer_navigate(url="http://google.com")

# Check if browser is running
ps aux | grep chrome
```

## 📋 Quick Decision Matrix

| Task | Use Computer Use | Use Puppeteer | Use Both |
|------|------------------|---------------|----------|
| **Find visual bugs** | ✅ Primary | ❌ | ✅ Find + Fix |
| **Automate user flows** | ❌ | ✅ Primary | ✅ Automate + Validate |
| **Test form submission** | ❌ | ✅ Primary | ✅ Submit + Validate |
| **Debug layout issues** | ✅ Primary | ❌ | ✅ Identify + Test |
| **Performance testing** | ❌ | ✅ Primary | ✅ Metrics + Visual |
| **Accessibility audit** | ✅ Primary | ❌ | ✅ Audit + Automate |
| **Cross-browser testing** | ✅ Visual diff | ✅ Automation | ✅ Complete testing |

## 🎉 Result

**All Claude Code agents and Claude Code itself now have access to:**
- **AI Eyes**: Computer Use for human-like visual analysis
- **Robot Hands**: Puppeteer for precise browser automation  
- **Combined Power**: AI-guided automation that sees problems and fixes them

**This enables comprehensive testing and debugging workflows that combine human-like perception with programmatic control.**