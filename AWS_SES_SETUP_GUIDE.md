# AWS SES Setup for PopMap - Step by Step Guide

## Overview
We'll set up AWS SES to send form notification emails from `noreply@popmap.co`

## What We'll Do
1. ✅ Verify the popmap.co domain in SES
2. ✅ Create SMTP credentials
3. ✅ Update environment variables
4. ✅ Test email sending

---

## Step 1: Navigate to AWS SES Console

1. Open AWS Console: https://console.aws.amazon.com/
2. Search for "SES" or "Simple Email Service"
3. **IMPORTANT**: Make sure you're in **us-east-1** region (top right corner)
   - SES is available in limited regions
   - us-east-1 is where your ECS cluster is

---

## Step 2: Verify Your Domain

### 2.1 Start Domain Verification
1. In SES console, click **"Verified identities"** (left sidebar)
2. Click **"Create identity"** button
3. Select **"Domain"**
4. Enter domain: **`popmap.co`** (without www or https)
5. Under "Advanced DKIM settings":
   - ✅ Check "Easy DKIM"
   - Select "RSA_2048_BIT"
6. Click **"Create identity"**

### 2.2 You'll See DNS Records to Add
AWS will show you DNS records that look like this:

**DKIM Records (3 records):**
```
Name: abc123._domainkey.popmap.co
Type: CNAME
Value: abc123.dkim.amazonses.com
```

**Plus 1 optional record for MAIL FROM domain**

### 2.3 Add DNS Records to Your Domain

**Where is popmap.co's DNS hosted?**
- Cloudflare? ✅ Most likely
- Route 53?
- GoDaddy?
- Namecheap?

**I'll wait for you to tell me where your DNS is hosted, then I'll show you exactly where to add these records.**

---

## Step 3: Create SMTP Credentials

While DNS is propagating:

1. In SES console, click **"SMTP settings"** (left sidebar)
2. Note the SMTP endpoint: `email-smtp.us-east-1.amazonaws.com`
3. Click **"Create SMTP credentials"**
4. IAM User Name: **`popmap-ses-smtp-user`**
5. Click **"Create user"**
6. **🚨 CRITICAL**: On the next screen, you'll see:
   - SMTP Username (starts with AKIA...)
   - SMTP Password (long random string)
   - **Download CSV** or **copy these NOW** - you can't see the password again!

---

## Step 4: Update Environment Variables

### For Local Development (.env file)

Create or update `backend/.env`:
```bash
# Development - print to console
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=noreply@popmap.co
```

### For Production (We'll do this after DNS verification)

You'll add these to AWS ECS task definition or Secrets Manager:
```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<your-smtp-username>
EMAIL_HOST_PASSWORD=<your-smtp-password>
DEFAULT_FROM_EMAIL=noreply@popmap.co
```

---

## Step 5: Wait for DNS Verification

- DNS propagation typically takes 5-30 minutes
- SES will automatically check and verify
- You'll see status change from "Pending" to "Verified"

While waiting, we can test locally with console backend.

---

## Step 6: Request Production Access (Important!)

By default, SES is in **Sandbox Mode** - you can only send to verified emails.

To send to ANY email address:

1. In SES console, click **"Account dashboard"**
2. Click **"Request production access"** button
3. Fill out the form:

**Email type:** Transactional

**Website URL:** `https://popmap.co`

**Use case description:**
```
PopMap is an event discovery platform that sends automated transactional email 
notifications when users submit forms. Emails include:

1. Form submission confirmations to users who fill out event registration forms
2. Form submission notifications to business owners when their forms are submitted

All emails are opt-in, triggered by user actions, and include unsubscribe options. 
We handle bounces and complaints per AWS best practices.

Expected volume: ~100-500 emails/month initially.
```

**Process for bounces/complaints:**
```
We monitor SES bounce and complaint notifications via SNS.
Bounced addresses are automatically removed from future sends.
Users can unsubscribe from confirmation emails.
```

4. Submit - usually approved within 24 hours

---

## Step 7: Test Email Sending

Once domain is verified and you have SMTP credentials:

### Test from Django Shell:
```bash
cd backend
source venv/bin/activate
python manage.py shell
```

```python
from django.core.mail import send_mail

send_mail(
    subject='Test Email from PopMap',
    message='This is a test email. SES is working!',
    from_email='noreply@popmap.co',
    recipient_list=['your-email@example.com'],  # Use your real email
    fail_silently=False,
)
```

**In Sandbox Mode:** You can only send to verified email addresses.
**After Production Access:** You can send to any email.

---

## Current Status Checklist

Track your progress:

- [ ] AWS SES console opened in us-east-1
- [ ] Domain verification started for popmap.co
- [ ] DNS records added to domain
- [ ] SMTP credentials created and saved
- [ ] Environment variables updated
- [ ] Domain shows as "Verified" in SES
- [ ] Production access requested
- [ ] Test email sent successfully

---

## Next Steps After Setup

1. Update ECS task definition with SMTP credentials
2. Deploy new backend version
3. Create a test form in Django admin
4. Submit the form and verify email is received

---

## Troubleshooting

**Domain not verifying?**
- Check DNS records are exact matches (including the dots at the end)
- Wait 30 minutes for DNS propagation
- Use `dig` or online DNS checker to verify records are live

**Can't send emails?**
- Check you're out of sandbox mode OR sending to verified email
- Verify SMTP credentials are correct
- Check ECS security group allows outbound port 587

**Emails going to spam?**
- Add SPF record to DNS: `v=spf1 include:amazonses.com ~all`
- DKIM will be automatic once domain is verified
- Consider DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@popmap.co`
