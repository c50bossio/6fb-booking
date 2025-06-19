-- Direct SQL to reset admin password
-- Run this in Render PostgreSQL console

-- First, check if user exists
SELECT id, email, first_name, last_name, is_active 
FROM users 
WHERE email = 'c50bossio@gmail.com';

-- Reset password to 'admin123'
-- This hash is for password 'admin123'
UPDATE users 
SET hashed_password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQaXUIpaPE4q',
    is_active = true,
    updated_at = NOW()
WHERE email = 'c50bossio@gmail.com';

-- If user doesn't exist, create it
INSERT INTO users (
    email, 
    hashed_password, 
    first_name, 
    last_name,
    role, 
    is_active, 
    created_at, 
    updated_at
) 
SELECT 
    'c50bossio@gmail.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQaXUIpaPE4q',
    'Admin',
    'User',
    'admin',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'c50bossio@gmail.com'
);

-- Verify the update
SELECT id, email, first_name, last_name, role, is_active 
FROM users 
WHERE email = 'c50bossio@gmail.com';