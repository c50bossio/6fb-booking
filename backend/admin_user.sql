-- First, check if user exists
SELECT id, email, role FROM users WHERE email = 'c50bossio@gmail.com';

-- If no user exists, run this INSERT:
INSERT INTO users (
    email, 
    first_name, 
    last_name, 
    hashed_password,
    role, 
    is_active, 
    is_verified,
    permissions,
    created_at, 
    updated_at
) VALUES (
    'c50bossio@gmail.com',
    'Chris',
    'Bossio',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGSVq08fMpi',  -- Welcome123!
    'super_admin',
    true,
    true,
    '["*"]',
    NOW(),
    NOW()
);

-- If user exists but is not admin, run this UPDATE:
UPDATE users 
SET 
    role = 'super_admin',
    hashed_password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGSVq08fMpi',  -- Welcome123!
    is_active = true,
    is_verified = true,
    permissions = '["*"]',
    updated_at = NOW()
WHERE email = 'c50bossio@gmail.com';

-- Verify the user was created/updated
SELECT id, email, role, is_active, is_verified FROM users WHERE email = 'c50bossio@gmail.com';