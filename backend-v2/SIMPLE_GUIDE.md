# 🎯 Simple Development Guide - No BS, Just Protection

## The Only Rules That Matter

### 1. Before Adding ANYTHING
```bash
python utils/registry_manager.py check [FeatureName]
```
If it exists → DON'T recreate it

### 2. No Variants Ever
❌ EnhancedCalendar, SimpleCalendar, CalendarV2  
✅ Calendar (one and only)

### 3. When Done, Register It
```bash
python utils/registry_manager.py add [Name] [Type] [Location] "[Description]"
```

## Quick Checks When You Want
```bash
# See what exists
python utils/registry_manager.py list

# Find duplicates
python utils/duplication_detector.py

# Search for something
python utils/registry_manager.py search calendar
```

## Phase Checklist (No Scripts Needed)
- [ ] Check first
- [ ] Build it
- [ ] Test it works
- [ ] Register it
- [ ] Move on

## That's It!
- No pre-commit hooks required
- No verification scripts
- No detailed logs
- Just don't create duplicates

**Pro tip**: Run `duplication_detector.py` once in a while to stay clean.