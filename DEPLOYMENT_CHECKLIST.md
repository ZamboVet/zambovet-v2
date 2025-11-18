# Pending Veterinarian Restrictions - Deployment Checklist

## Pre-Deployment

### Code Review
- [ ] All imports are correct
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Code follows project style
- [ ] Comments are clear
- [ ] No debug code left

### Database
- [ ] `notifications` table exists
- [ ] Table has all required columns:
  - [ ] `id` (BIGSERIAL PRIMARY KEY)
  - [ ] `user_id` (UUID FK)
  - [ ] `type` (VARCHAR)
  - [ ] `title` (VARCHAR)
  - [ ] `message` (TEXT)
  - [ ] `is_read` (BOOLEAN)
  - [ ] `recipient_role` (VARCHAR)
  - [ ] `created_at` (TIMESTAMP)
- [ ] Indexes created for performance
- [ ] RLS policies configured (if needed)

### Environment
- [ ] All env variables set
- [ ] Supabase URL correct
- [ ] Supabase key correct
- [ ] No hardcoded URLs

---

## Testing

### Unit Tests
- [ ] `getVetAccessControl()` works
- [ ] `sendApprovalRequest()` works
- [ ] Components render correctly
- [ ] Props validation works

### Integration Tests
- [ ] Pending vet sees banner
- [ ] Restricted sections disabled
- [ ] "Request Approval" sends notification
- [ ] Approved vet sees full dashboard
- [ ] Notification appears in database

### Manual Testing - Desktop
- [ ] Chrome 1920x1080
  - [ ] Banner displays
  - [ ] Overlay works
  - [ ] Button clickable
  - [ ] Notification sent
- [ ] Firefox 1920x1080
  - [ ] Same as Chrome
- [ ] Safari 1920x1080
  - [ ] Same as Chrome

### Manual Testing - Mobile
- [ ] iPhone 12 (390x844)
  - [ ] Banner responsive
  - [ ] Overlay readable
  - [ ] Button tappable
  - [ ] No horizontal scroll
- [ ] Android (375x667)
  - [ ] Same as iPhone
- [ ] iPad (768x1024)
  - [ ] Tablet layout works
  - [ ] All elements visible

### Manual Testing - Scenarios
- [ ] Pending vet login → sees banner
- [ ] Click "Request Approval" → notification sent
- [ ] Admin checks notifications → sees request
- [ ] Admin approves vet → verification_status = 'approved'
- [ ] Vet refreshes page → banner gone, full access
- [ ] Vet can edit clinic location while pending
- [ ] Vet cannot view appointments while pending

---

## Staging Deployment

### Pre-Staging
- [ ] All tests passing
- [ ] Code review approved
- [ ] No merge conflicts

### Staging Deployment
- [ ] Push to staging branch
- [ ] Deploy to staging environment
- [ ] Verify deployment successful
- [ ] Check logs for errors

### Staging Testing
- [ ] Create test pending vet account
- [ ] Verify banner displays
- [ ] Test all restricted sections
- [ ] Test approval request
- [ ] Check notification in database
- [ ] Test on staging mobile devices

### Staging Sign-Off
- [ ] Product team approved
- [ ] QA team approved
- [ ] No critical issues

---

## Production Deployment

### Pre-Production
- [ ] Staging tests passed
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

### Production Deployment
- [ ] Schedule deployment window
- [ ] Notify stakeholders
- [ ] Deploy to production
- [ ] Verify deployment successful
- [ ] Check production logs

### Post-Production
- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Check notification system
- [ ] Verify pending vets see banner
- [ ] Test with real pending vet account

### Production Sign-Off
- [ ] All systems operational
- [ ] No critical issues
- [ ] Performance acceptable
- [ ] Users reporting no issues

---

## Rollback Plan

### If Issues Occur
1. [ ] Identify issue
2. [ ] Notify team
3. [ ] Revert deployment
4. [ ] Verify rollback successful
5. [ ] Investigate root cause
6. [ ] Fix and re-test
7. [ ] Re-deploy

### Rollback Commands
```bash
# Revert to previous version
git revert <commit-hash>
git push origin main

# Or rollback deployment
vercel rollback
```

---

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Check error logs every hour
- [ ] Monitor notification creation
- [ ] Check database performance
- [ ] Verify no user complaints

### First Week
- [ ] Daily log review
- [ ] Weekly performance report
- [ ] User feedback collection
- [ ] Bug tracking

### Ongoing
- [ ] Weekly monitoring
- [ ] Monthly performance review
- [ ] Quarterly security audit
- [ ] Annual code review

---

## Documentation

### User Documentation
- [ ] Update user guide
- [ ] Add FAQ section
- [ ] Create help article
- [ ] Update support docs

### Developer Documentation
- [ ] Update API docs
- [ ] Add code comments
- [ ] Document database schema
- [ ] Create troubleshooting guide

### Admin Documentation
- [ ] How to view notifications
- [ ] How to approve vets
- [ ] How to reject vets
- [ ] Troubleshooting guide

---

## Team Communication

### Before Deployment
- [ ] Notify development team
- [ ] Notify QA team
- [ ] Notify product team
- [ ] Notify support team

### During Deployment
- [ ] Update status channel
- [ ] Report progress
- [ ] Alert on issues
- [ ] Confirm completion

### After Deployment
- [ ] Send deployment summary
- [ ] Share monitoring dashboard
- [ ] Schedule retrospective
- [ ] Document lessons learned

---

## Success Criteria

### Functional
- [x] Pending vets see warning banner
- [x] Restricted sections are disabled
- [x] "Request Approval" button works
- [x] Admin receives notifications
- [x] Approved vets have full access

### Performance
- [ ] Page load < 2 seconds
- [ ] No console errors
- [ ] No memory leaks
- [ ] Smooth animations

### User Experience
- [ ] Clear messaging
- [ ] Intuitive UI
- [ ] Mobile friendly
- [ ] Accessible (WCAG 2.1)

### Business
- [ ] Meets requirements
- [ ] On schedule
- [ ] Within budget
- [ ] Stakeholder approved

---

## Sign-Off

### Development Team
- [ ] Code review: _________________ Date: _______
- [ ] Testing: _________________ Date: _______

### QA Team
- [ ] Testing approved: _________________ Date: _______

### Product Team
- [ ] Requirements met: _________________ Date: _______

### Operations Team
- [ ] Deployment approved: _________________ Date: _______

---

## Notes

```
[Add any additional notes or considerations here]
```

---

## Contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Project Lead | | | |
| Tech Lead | | | |
| QA Lead | | | |
| DevOps | | | |

---

**Last Updated:** [Date]
**Version:** 1.0
**Status:** Ready for Deployment ✅
