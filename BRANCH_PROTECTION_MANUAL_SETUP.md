# Manual GitHub Branch Protection Setup

Since the automated branch protection setup encountered API issues, please manually configure branch protection for the `main` branch:

## Steps to Configure Branch Protection

1. **Go to GitHub Repository Settings**
   - Navigate to: https://github.com/c50bossio/6fb-booking/settings/branches
   
2. **Add Protection Rule for `main` Branch**
   - Click "Add protection rule"
   - Branch name pattern: `main`
   
3. **Recommended Protection Settings**
   ```
   ✅ Require a pull request before merging
     ✅ Require approvals: 1
     ✅ Dismiss stale PR approvals when new commits are pushed
   
   ✅ Require status checks to pass before merging
     ✅ Require branches to be up to date before merging
     Required status checks:
       - build
       - test
   
   ✅ Require conversation resolution before merging
   ✅ Restrict pushes that create files larger than 100MB
   ❌ Do not allow bypassing the above settings (optional)
   ```

4. **Additional Protection for Production Stability**
   ```
   ❌ Allow force pushes (keep disabled)
   ❌ Allow deletions (keep disabled)
   ```

## Why These Settings?

- **Pull Request Reviews**: Ensures code quality through peer review
- **Status Checks**: Prevents broken code from entering main branch  
- **No Force Push/Delete**: Protects against accidental history loss
- **Conversation Resolution**: Ensures all PR discussions are resolved

## Verification

After setup, verify protection is active:
```bash
gh api repos/:owner/:repo/branches/main/protection
```

This should return the protection configuration instead of a 404 error.

---
*This file can be deleted after manual setup is complete*