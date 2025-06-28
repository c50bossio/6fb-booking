# Quick Password Reset

## The Fastest Way (30 seconds):

1. **Click this link**: https://dashboard.render.com/dashboard
2. **Click on your PostgreSQL database** (it should be named something like "postgresql-...")
3. **Click the "Shell" button** on the left sidebar
4. **Copy and paste this exactly**:

```sql
UPDATE users SET hashed_password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQaXUIpaPE4q' WHERE email = 'c50bossio@gmail.com';
```

5. **Press Enter**

That's it! Your password is now: **admin123**

## Then Login:
- Go to: https://sixfb-frontend-paby.onrender.com/login
- Email: **c50bossio@gmail.com**
- Password: **admin123**

---

## Why Can't Claude Do This Directly?

Claude Code doesn't have direct access to:
- Your Render account
- Your database
- Terminal/SSH access

To enable this in the future, we would need:
1. MCP (Model Context Protocol) server for Render (not available yet)
2. Or SSH/terminal MCP server configured with your credentials
3. Or Render API token

For now, the manual SQL command above is the quickest solution!
