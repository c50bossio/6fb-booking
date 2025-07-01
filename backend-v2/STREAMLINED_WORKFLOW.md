# 🚀 Streamlined Development Workflow

## Core Protection (Always Use)
```bash
# Before adding ANY feature
cd backend-v2
python utils/duplication_detector.py
python utils/registry_manager.py check [feature_name]
```

## Phase Checklist (Simple)

### ✅ Phase 1: Foundation
- [x] Duplication detector working
- [x] Feature registry created
- [x] Basic auth, booking, payments registered
- [ ] Fix routing issues
- [ ] Ensure test suite runs clean

### ⏳ Phase 2: Core Features
- [ ] Check for duplicates first
- [ ] Write tests for new feature
- [ ] Migrate one feature at a time
- [ ] Run tests to verify feature works
- [ ] Update registry

### 🔒 Phase 3: Calendar Integration
- [ ] Find best calendar implementation
- [ ] Check no duplicates exist
- [ ] Write tests first (TDD approach)
- [ ] Migrate with drag-drop
- [ ] Single implementation only
- [ ] Full test suite passes

## Quick Commands
```bash
# Check what exists
python utils/registry_manager.py list

# Search for similar
python utils/registry_manager.py search calendar

# Add to registry after migration
python utils/registry_manager.py add Calendar components "backend-v2/frontend-v2/src/components/Calendar.tsx" "Unified calendar with drag-drop"

# Run tests before completing features
pytest tests/                    # Run all tests
pytest tests/unit/              # Unit tests only
pytest tests/integration/       # Integration tests
pytest -k "test_auth"          # Run specific test pattern

# Final check before phase completion
python utils/duplication_detector.py
pytest --tb=short              # Quick test run

# Mark phase complete
git tag phase-2-complete -m "Core features migrated"
```

## Rules (Simple)
1. ❌ NO "Enhanced", "Simple", "Demo" variants
2. ✅ ONE implementation per feature
3. 🔍 ALWAYS check before adding
4. 🧪 TEST before marking complete
5. 📝 Register after migrating

## When to Run Full Checks
- Before completing a phase
- Before merging to main
- When adding major features
- If you see ANY duplication

That's it! Keep it simple, prevent duplicates.