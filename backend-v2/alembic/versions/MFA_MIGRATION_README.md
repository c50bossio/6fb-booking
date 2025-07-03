# MFA Tables Migration

## Migration Details
- **File**: `769e76ff65d7_add_mfa_tables_for_two_factor_.py`
- **Created**: 2025-07-03
- **Purpose**: Create database tables for Multi-Factor Authentication (MFA) support

## Tables Created

### 1. `user_mfa_secrets`
Stores MFA secrets for users using TOTP (Time-based One-Time Password)
- Primary key: `id`
- Foreign key: `user_id` (references `users.id`)
- Unique constraint on `user_id` (one MFA secret per user)
- Indexes on user_id and (user_id, is_enabled) for performance

### 2. `mfa_backup_codes`
Stores one-time use backup codes for MFA recovery
- Primary key: `id`
- Foreign key: `user_id` (references `users.id`)
- Indexes on user_id, code_hash, and (user_id, is_used)

### 3. `mfa_device_trusts`
Stores trusted devices to reduce MFA prompts on recognized devices
- Primary key: `id`
- Foreign key: `user_id` (references `users.id`)
- Unique constraint on `trust_token`
- Indexes on user_id, trust_token, and device fingerprint

### 4. `mfa_events`
Audit log for all MFA-related events
- Primary key: `id`
- Foreign key: `user_id` (references `users.id`)
- Indexes on user_id and event_type for efficient querying

## Important Notes

1. **Tables Already Existed**: The MFA tables were created outside of Alembic migrations (likely through SQLAlchemy's create_all()). This migration documents their structure for future reference and ensures consistency.

2. **Migration Stamped**: Since the tables already existed, we used `alembic stamp 769e76ff65d7` to mark the migration as applied without actually running it.

3. **Cascade Deletes**: All foreign keys have `ondelete='CASCADE'` to ensure MFA data is cleaned up when users are deleted.

4. **Security Considerations**:
   - MFA secrets should be encrypted before storage
   - Backup codes should be hashed (not stored in plain text)
   - Device trust tokens should be cryptographically secure
   - All sensitive operations should be logged in mfa_events

## Usage
To apply this migration on a fresh database:
```bash
alembic upgrade head
```

To rollback (remove MFA tables):
```bash
alembic downgrade -1
```