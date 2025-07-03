# Legal Documentation Implementation Steps

## Quick Start Guide

This guide outlines the steps needed to implement the Terms of Service and Privacy Policy for BookedBarber.

## 1. Immediate Actions Required

### 1.1 Fill in Placeholders
Replace all placeholders in the documents:
- `[Your Company Name]` → Your legal entity name
- `[Your Company Address]` → Physical business address
- `[Your Phone Number]` → Customer service number
- `[Date]` → Today's date
- `[Your State/Country]` → Jurisdiction for legal matters

### 1.2 Legal Review
**IMPORTANT**: Have these documents reviewed by a lawyer specializing in:
- SaaS/Technology law
- Data privacy (GDPR/CCPA)
- Payment processing regulations
- Your local jurisdiction

## 2. Technical Implementation

### 2.1 Create Legal Pages (Frontend)
```bash
# Create legal pages in the frontend
touch backend-v2/frontend-v2/app/(public)/terms/page.tsx
touch backend-v2/frontend-v2/app/(public)/privacy/page.tsx
touch backend-v2/frontend-v2/app/(public)/cookies/page.tsx
```

### 2.2 Add Legal Links
Add links to footer and registration flow:
- Terms of Service
- Privacy Policy
- Cookie Policy
- Contact/Legal

### 2.3 Implement Consent Tracking
```sql
-- Run migration to add consent tracking
CREATE TABLE legal_consents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    document_type VARCHAR(50), -- 'terms', 'privacy'
    version VARCHAR(20),
    consented_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);
```

### 2.4 Add Consent to Registration
Update registration flow to require acceptance:
```typescript
// Registration form must include:
<Checkbox required>
  I agree to the <Link href="/terms">Terms of Service</Link> and 
  <Link href="/privacy">Privacy Policy</Link>
</Checkbox>
```

## 3. Cookie Implementation Priority

### Phase 1 (Do First)
1. Add cookie consent banner component
2. Block analytics/marketing scripts until consent
3. Store consent preferences

### Phase 2 (Within 30 days)
1. Implement preference center
2. Add cookie audit logging
3. Set up consent API endpoints

## 4. GDPR Compliance Priority

### Must Have (Launch Requirements)
- [x] Privacy Policy published
- [x] Terms of Service published
- [ ] Cookie consent banner
- [ ] Consent tracking in database
- [ ] Data export capability (manual is OK initially)

### Should Have (30 days)
- [ ] Automated data export
- [ ] Account deletion flow
- [ ] Cookie preference center
- [ ] DPA agreements with vendors

### Nice to Have (60 days)
- [ ] Full GDPR automation
- [ ] Privacy dashboard
- [ ] Consent analytics
- [ ] Automated retention

## 5. Deployment Checklist

### Before Going Live
- [ ] Replace all placeholders in documents
- [ ] Legal review completed
- [ ] Terms/Privacy pages accessible
- [ ] Consent required at registration
- [ ] Cookie banner implemented
- [ ] Support email (legal@, privacy@) configured
- [ ] Data Protection Officer designated (if required)

### First Week After Launch
- [ ] Monitor consent rates
- [ ] Handle any privacy requests
- [ ] Document any issues
- [ ] Set up privacy request tracking

## 6. Quick Implementation Code

### 6.1 Basic Legal Pages Component
```typescript
// app/(public)/terms/page.tsx
import { LegalDocument } from '@/components/LegalDocument';
import termsContent from '@/content/terms-of-service.md';

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      content={termsContent}
      lastUpdated="2025-01-02"
    />
  );
}
```

### 6.2 Simple Cookie Banner
```typescript
// components/SimpleCookieBanner.tsx
export function SimpleCookieBanner() {
  const [show, setShow] = useState(!localStorage.getItem('cookies-accepted'));

  if (!show) return null;

  const handleAccept = () => {
    localStorage.setItem('cookies-accepted', 'true');
    setShow(false);
    // Enable analytics
    window.gtag?.('consent', 'update', {
      analytics_storage: 'granted'
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <p>We use cookies to improve your experience.</p>
        <div className="space-x-4">
          <Link href="/privacy" className="underline">Learn more</Link>
          <Button onClick={handleAccept}>Accept</Button>
        </div>
      </div>
    </div>
  );
}
```

### 6.3 Consent Tracking API
```python
# Add to auth router
@router.post("/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # ... existing registration code ...
    
    # Track legal consent
    consent = LegalConsent(
        user_id=new_user.id,
        document_type="terms",
        version="1.0",
        consented_at=datetime.utcnow(),
        ip_address=request.client.host
    )
    db.add(consent)
    db.commit()
    
    return new_user
```

## 7. Ongoing Maintenance

### Monthly Tasks
- Review privacy requests
- Update vendor list
- Check for legal updates
- Monitor consent rates

### Quarterly Tasks
- Review and update policies
- Audit third-party processors
- Security assessment
- Staff training update

### Annual Tasks
- Full legal review
- Renew vendor agreements
- Update consent versions
- Compliance audit

## 8. Emergency Contacts

Set up these email addresses:
- `legal@bookedbarber.com` - General legal inquiries
- `privacy@bookedbarber.com` - Privacy requests
- `dpo@bookedbarber.com` - Data Protection Officer
- `security@bookedbarber.com` - Security issues

## 9. Resources

- [GDPR Compliance Checklist](./GDPR_COMPLIANCE_CHECKLIST.md)
- [Cookie Implementation Guide](./COOKIE_IMPLEMENTATION_GUIDE.md)
- [Terms of Service Template](./TERMS_OF_SERVICE.md)
- [Privacy Policy Template](./PRIVACY_POLICY.md)

## 10. Next Steps

1. **Today**: Review and customize legal documents
2. **This Week**: Implement basic cookie banner
3. **Next Week**: Add consent tracking
4. **This Month**: Complete Phase 1 GDPR compliance
5. **Next Month**: Automate privacy rights

---

Remember: These are templates and guides. Always consult with a qualified attorney before deploying legal documents in production.