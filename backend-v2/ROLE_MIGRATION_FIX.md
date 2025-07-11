# Role Migration Issue - Root Cause Analysis and Fix

## Issue Summary
Admin users were not seeing admin features in the sidebar. They were being treated as "client" users despite having `role = "admin"` in the database.

## Root Cause
A database migration on July 4th, 2025 added a new `unified_role` system to replace the dual `role`/`user_type` system. However, there were two conflicting migrations:

1. **Migration 9e94ca70cc82** (July 4, 12:30 PM) - Properly mapped existing roles to unified roles
2. **Migration 5be230588964** (July 4, 2:53 PM) - Added the unified_role column with a default value of 'client'

The second migration appears to have overwritten the proper role mappings, setting all users' `unified_role` to 'client'.

## Authentication Impact
The authentication system (routers/auth.py, line 155) uses `unified_role` if available:
```python
user_role = user.unified_role if hasattr(user, 'unified_role') and user.unified_role else user.role
```

This caused JWT tokens to be created with `"role": "client"` instead of the proper role.

## Fix Applied
1. Updated admin users in the database:
   ```sql
   UPDATE users SET unified_role = 'super_admin' WHERE role = 'admin';
   ```

2. Updated barber users:
   ```sql
   UPDATE users SET unified_role = 'barber' WHERE role = 'barber' AND user_type = 'client';
   ```

3. Created a fix script at `scripts/fix_unified_roles.py` to properly handle role migration

## Current Database State
- Admin users: `role='admin'`, `unified_role='super_admin'` ✓
- Barber users: `role='barber'`, `unified_role='barber'` ✓
- Client users: `role='user'`, `unified_role='client'` ✓

## Prevention
To prevent this from happening again:
1. The fix script can be run to ensure proper role mapping
2. Future migrations should check existing values before applying defaults
3. Consider adding a database constraint or trigger to ensure role consistency

## Verification
Admin users should now:
- See all admin features in the sidebar
- Have JWT tokens with `"role": "super_admin"`
- Access admin-only pages like Analytics, Marketing Suite, etc.