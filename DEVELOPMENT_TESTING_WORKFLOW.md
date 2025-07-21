# 🔄 Development Testing Workflow

**Testing methodology for active development - Test-Driven Development (TDD) approach**

This document provides the specific testing workflow to follow during feature implementation, ensuring continuous quality and rapid feedback loops.

---

## 🎯 **TEST-DRIVEN DEVELOPMENT WORKFLOW**

### **RED → GREEN → REFACTOR**

The core TDD cycle that must be followed for all feature development:

1. **🔴 RED**: Write a failing test first
2. **🟢 GREEN**: Write minimal code to pass the test
3. **🔵 REFACTOR**: Improve code without changing behavior
4. **🔁 REPEAT**: Continue until feature is complete

---

## 📋 **STEP-BY-STEP DEVELOPMENT WORKFLOW**

### **Phase 1: Setup & Planning (5-10 minutes)**

1. **Complete Pre-Work Checklist**
   ```bash
   # Run pre-work verification
   ./scripts/pre-work-checklist.sh
   ```

2. **Start Browser Logs MCP**
   ```bash
   # Start Chrome debugging
   google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb
   
   # Connect in Claude
   connect_to_browser
   watch_logs_live duration_seconds=300
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/feature-name-$(date +%Y%m%d)
   ```

4. **Document Feature Requirements**
   - Write brief feature description
   - Identify API endpoints needed
   - Plan database schema changes
   - List test scenarios

### **Phase 2: Write Tests First (RED) - 10-20 minutes**

#### **Backend Tests First:**
```bash
cd backend-v2

# Create test file
touch tests/unit/test_new_feature.py

# Write failing tests
cat > tests/unit/test_new_feature.py << 'EOF'
import pytest
from services.new_feature_service import NewFeatureService

def test_create_new_feature():
    service = NewFeatureService()
    result = service.create_feature("test data")
    assert result.id is not None
    assert result.name == "test data"
EOF

# Run tests (should fail)
pytest tests/unit/test_new_feature.py -v
```

#### **Frontend Tests First:**
```bash
cd backend-v2/frontend-v2

# Create test file
touch __tests__/components/NewFeature.test.tsx

# Write failing tests
cat > __tests__/components/NewFeature.test.tsx << 'EOF'
import { render, screen } from '@testing-library/react'
import NewFeature from '@/components/NewFeature'

test('renders new feature component', () => {
  render(<NewFeature />)
  expect(screen.getByText('New Feature')).toBeInTheDocument()
})
EOF

# Run tests (should fail)
npm test -- NewFeature.test.tsx
```

### **Phase 3: Implementation (GREEN) - 20-40 minutes**

#### **Backend Implementation:**
```bash
# Create service file
touch services/new_feature_service.py

# Implement minimal code to pass tests
cat > services/new_feature_service.py << 'EOF'
class NewFeatureService:
    def create_feature(self, name):
        # Minimal implementation
        return type('Feature', (), {'id': 1, 'name': name})()
EOF

# Run tests (should pass now)
pytest tests/unit/test_new_feature.py -v
```

#### **Frontend Implementation:**
```bash
# Create component file
touch components/NewFeature.tsx

# Implement minimal code
cat > components/NewFeature.tsx << 'EOF'
export default function NewFeature() {
  return <div>New Feature</div>
}
EOF

# Run tests (should pass now)
npm test -- NewFeature.test.tsx
```

#### **Continuous Browser Monitoring:**
```bash
# Monitor for errors during development
get_console_logs level="error" since_minutes=5
get_network_requests status_code=404,500 since_minutes=5
```

### **Phase 4: Integration (GREEN) - 15-30 minutes**

#### **API Integration:**
```bash
# Create API endpoint
touch routers/new_feature.py

# Add to main FastAPI app
# Test API endpoint
curl -X POST http://localhost:8000/api/v1/new-feature \
  -H "Content-Type: application/json" \
  -d '{"name": "test"}'
```

#### **Frontend-Backend Integration:**
```bash
# Update component to call API
# Test in browser with live monitoring
watch_logs_live duration_seconds=60 include_network=true
```

### **Phase 5: Testing Validation (GREEN) - 10-20 minutes**

#### **Run All Test Categories:**
```bash
# Backend tests
cd backend-v2
pytest tests/unit/ -v
pytest tests/integration/ -v

# Frontend tests  
cd frontend-v2
npm test -- --watchAll=false

# E2E tests
node test_new_feature_puppeteer.js
```

#### **Manual Testing:**
- [ ] Test happy path in browser
- [ ] Test error scenarios
- [ ] Test edge cases
- [ ] Verify responsive design
- [ ] Check accessibility

### **Phase 6: Refactor (REFACTOR) - 10-20 minutes**

#### **Code Quality Improvements:**
```bash
# Run linting
npm run lint
ruff check . --fix

# Check TypeScript
npx tsc --noEmit

# Optimize performance
# Improve error handling
# Add documentation
```

#### **Test Refactoring:**
```bash
# Add more test cases
# Improve test coverage
# Clean up test code
# Add performance tests if needed
```

### **Phase 7: Final Verification (GREEN) - 5-15 minutes**

#### **Comprehensive Testing:**
```bash
# All tests pass
./scripts/parallel-tests.sh

# Browser logs clean
get_console_logs level="error" since_minutes=30
get_javascript_errors since_minutes=30

# Performance acceptable
# No accessibility violations
# All linting passes
```

#### **Commit Changes:**
```bash
git add .
git commit -m "feat: implement new feature with comprehensive testing

- Add NewFeatureService with create functionality
- Add NewFeature React component with proper testing
- Add API endpoint /api/v1/new-feature
- Include unit, integration, and E2E tests
- All tests passing, linting clean, browser logs clear

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## ⏱️ **TIME-BASED WORKFLOW MANAGEMENT**

### **Short Development Sessions (30-60 minutes):**
1. Focus on single small feature or bug fix
2. Complete one full RED → GREEN → REFACTOR cycle
3. Ensure all tests pass before ending session
4. Commit progress even if feature incomplete

### **Medium Development Sessions (1-2 hours):**
1. Complete feature with comprehensive testing
2. Multiple RED → GREEN → REFACTOR cycles
3. Include integration testing
4. Manual browser testing
5. Commit completed feature

### **Long Development Sessions (2-4 hours):**
1. Complex feature with multiple components
2. Database schema changes included
3. Multiple test categories covered
4. Cross-browser testing
5. Performance optimization
6. Documentation updates

---

## 🔄 **CONTINUOUS MONITORING**

### **Every 15 Minutes:**
- [ ] Run relevant tests for changes made
- [ ] Check browser logs for new errors
- [ ] Verify servers still running and responsive
- [ ] Quick manual test of feature being developed

### **Every 30 Minutes:**
- [ ] Run full test suite for modified components
- [ ] Check linting status
- [ ] Review browser network requests for API issues
- [ ] Commit progress if tests passing

### **Every Hour:**
- [ ] Run comprehensive test suite
- [ ] Manual testing in different browsers
- [ ] Review code quality and refactor if needed
- [ ] Update documentation if required

---

## 🛠️ **DEVELOPMENT TOOLS INTEGRATION**

### **VS Code Configuration:**
```json
{
  "settings": {
    "python.testing.pytestEnabled": true,
    "python.testing.autoTestDiscoverOnSaveEnabled": true,
    "typescript.preferences.includePackageJsonAutoImports": "auto",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true,
      "source.organizeImports": true
    }
  }
}
```

### **Watch Mode Development:**
```bash
# Backend auto-reload
cd backend-v2 && uvicorn main:app --reload

# Frontend auto-reload
cd backend-v2/frontend-v2 && npm run dev

# Test auto-run
cd backend-v2 && pytest --watch
cd backend-v2/frontend-v2 && npm test -- --watch
```

### **Browser DevTools Integration:**
- Keep DevTools open during development
- Monitor Console, Network, and Performance tabs
- Use React DevTools for component debugging
- Leverage browser logs MCP for automated monitoring

---

## 🔍 **DEBUGGING WORKFLOW**

### **When Tests Fail:**
1. **Read error message carefully**
2. **Use browser logs MCP for frontend issues:**
   ```bash
   get_javascript_errors since_minutes=5
   get_console_logs level="error" since_minutes=5
   ```
3. **Use debugger in tests:**
   ```python
   import pdb; pdb.set_trace()  # Python
   ```
   ```javascript
   debugger;  // JavaScript
   ```
4. **Isolate the problem with minimal test case**
5. **Fix issue and re-run tests**

### **When Integration Fails:**
1. **Check API responses:**
   ```bash
   get_network_requests since_minutes=2
   ```
2. **Verify database state:**
   ```bash
   python -c "from models import Model; print(Model.query.all())"
   ```
3. **Test API endpoints directly:**
   ```bash
   curl -v http://localhost:8000/api/v1/endpoint
   ```
4. **Check for CORS issues in browser logs**

---

## 📊 **PROGRESS TRACKING**

### **Development Session Log:**
```markdown
## Development Session: [Date]
**Feature**: New User Dashboard
**Time**: 2 hours

### Progress:
- [x] Backend service tests written (RED)
- [x] Backend service implemented (GREEN)
- [x] API endpoint tests written (RED)  
- [x] API endpoint implemented (GREEN)
- [x] Frontend component tests written (RED)
- [x] Frontend component implemented (GREEN)
- [x] Integration tests passing
- [x] Manual testing completed
- [x] Browser logs clean
- [x] All linting passing
- [x] Code committed

### Issues Encountered:
- CORS error resolved by updating allowed origins
- Test flakiness fixed by adding proper async/await

### Next Session:
- Add error handling for edge cases
- Implement loading states
- Add accessibility improvements
```

---

## 🎯 **SUCCESS METRICS**

### **Quality Metrics:**
- **Test Coverage**: >80% for new code
- **Linting**: Zero errors or warnings
- **Browser Logs**: No console errors during testing
- **Performance**: No regressions in load times
- **Accessibility**: No new WCAG violations

### **Velocity Metrics:**
- **TDD Cycles**: Complete RED → GREEN → REFACTOR cycles
- **Test-to-Code Ratio**: Tests written first for all features
- **Bug Rate**: <5% of commits introduce bugs
- **Refactor Rate**: Code improvements in 20% of commits

### **Process Metrics:**
- **Commit Frequency**: At least every 30 minutes of active development
- **Test Execution**: Tests run before every commit
- **Browser Monitoring**: Browser logs MCP active during frontend work
- **Manual Testing**: User flows tested before completing features

---

## 📝 **WORKFLOW TEMPLATES**

### **New Feature Checklist:**
```markdown
## Feature: [Feature Name]

### Pre-Development:
- [ ] Pre-work checklist completed
- [ ] Browser logs MCP active
- [ ] Feature requirements documented
- [ ] Test scenarios identified

### Backend Development (TDD):
- [ ] Service unit tests written (RED)
- [ ] Service implementation (GREEN)
- [ ] Service refactored (REFACTOR)
- [ ] API endpoint tests written (RED)
- [ ] API endpoint implemented (GREEN)
- [ ] API endpoint refactored (REFACTOR)
- [ ] Integration tests passing

### Frontend Development (TDD):
- [ ] Component tests written (RED)
- [ ] Component implemented (GREEN)
- [ ] Component refactored (REFACTOR)
- [ ] API integration tests written (RED)
- [ ] API integration implemented (GREEN)
- [ ] API integration refactored (REFACTOR)
- [ ] E2E tests passing

### Quality Assurance:
- [ ] All tests passing
- [ ] Linting clean
- [ ] Browser logs clean
- [ ] Manual testing completed
- [ ] Cross-browser testing
- [ ] Accessibility verified
- [ ] Performance acceptable

### Completion:
- [ ] Code committed with descriptive message
- [ ] Documentation updated
- [ ] Feature marked complete in tracking system
```

---

**Remember: Development without testing is just debugging in production. Follow the TDD workflow religiously for reliable, maintainable code.**