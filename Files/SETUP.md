# SilverNest Home Care — Setup Guide

Complete these steps in order before going live.

---

## Step 1 — Google Sheet Setup

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it: **SilverNest Home Care — Leads**
3. Create two sheets (tabs):

**Sheet 1: "Leads"** — Add these headers in Row 1:
```
Timestamp | First Name | Last Name | Phone | Email | Care Recipient |
Relationship | Care Needs | Care Frequency | Start Timeline |
Contact Time | Referral | Form Type | Status | Notes
```

**Sheet 2: "Settings"** — Add these rows:
```
Key                  | Value
notification_email   | hello@silvernesthomecare.net
business_name        | SilverNest Home Care
whatsapp_number      | +10000000000
```

---

## Step 2 — Apps Script Deployment

1. In your Google Sheet: **Extensions → Apps Script**
2. Delete any existing code in `Code.gs`
3. Copy the entire contents of `/apps-script/Code.gs` and paste it in
4. Click **Save** (disk icon)
5. Click **Deploy → New Deployment**
6. Settings:
   - **Type:** Web App
   - **Description:** SilverNest Production
   - **Execute as:** Me
   - **Who has access:** Anyone
7. Click **Deploy** → Authorize when prompted
8. Copy the **Web App URL** — it looks like:
   
https://script.google.com/macros/s/AKfycbznGl2KJSB4LkRQQV4yYGPOvzOQ5ie4s-7fK0MO6TKOX7992QDRZYacMMaCXXIFZI0/exec
---

## Step 3 — Connect Forms to Apps Script

1. Confirm `pages/intake.html` uses your Apps Script URL in `data-script-url` and `initForm(...)`
2. Confirm `pages/contact.html` uses your Apps Script URL in `data-script-url` and `initForm(...)`
3. Also update `intake.html` script tag at the bottom: `initForm('intake-form', 'YOUR_URL')`

---

## Step 4 — Admin Portal Setup

1. Open `admin/index.html` in your browser
2. Default PIN: `123456`
3. Go to **Settings tab → Apps Script URL** → paste your URL → **Save URL → Test Connection**
4. Confirm green success message appears
5. Change your PIN in Settings → **Change Access PIN**

> ⚠️ The admin portal uses a client-side PIN gate — a deterrent layer only.
> For HIPAA production environments, use server-side auth or a compliant portal platform.

---

## Step 5 — Set Up Automation Triggers

In Apps Script (Extensions → Apps Script → Triggers icon ⏰):

### Daily Digest Email (8am every morning)
- Function: `sendDailyDigest`
- Event source: Time-driven
- Type: Day timer
- Time: 8am–9am

### Lead Aging Alert (every 6 hours)
- Function: `checkLeadAging`
- Event source: Time-driven
- Type: Hour timer
- Every: 6 hours

---

## Step 6 — Before Launch Checklist

### Content
- [ ] Replace `(000) 000-0000` with real phone number on all pages
- [ ] Replace `[City, State]` with real location on all pages
- [ ] Replace `[Street Address], [City, State, ZIP]` in Privacy Policy and Terms
- [ ] Replace `+10000000000` in WhatsApp links with real number (format: country code + number, no spaces)
- [x] Apps Script URL configured in intake.html, contact.html, and admin
- [ ] Update team names/bios in `about.html` with real staff information

### Images
- [ ] Add real hero background image (`.webp`) and update `hero__bg` in CSS or use inline `style` on `.hero__bg-img`
- [ ] Add `/assets/images/favicon.ico`
- [ ] Add `/assets/images/og-image.jpg` (1200×630px) for social sharing
- [ ] All images should use `loading="lazy"` and `decoding="async"` with descriptive `alt` text

### Spam & Security
- [ ] Honeypot field present on all forms ✓ (already implemented)
- [ ] Time-check field present on all forms ✓ (already implemented)
- [ ] Apps Script spam checks active ✓ (already implemented in Code.gs)

### SEO
- [ ] Update `<title>` tags with real city/state
- [ ] Update `<meta name="description">` with real location
- [ ] Update all `og:url` and `og:image` with real domain
- [ ] Update `sitemap.xml` dates to match actual launch date
- [ ] Submit `sitemap.xml` to Google Search Console after DNS propagates

### Go-Live
- [ ] SSL certificate active (HTTPS — no mixed content warnings)
- [ ] DNS pointed to hosting and propagated
- [ ] Test all form submissions — check Sheet receives data, email notification arrives
- [ ] Test admin portal — leads display, test connection passes
- [ ] Test on mobile (375px), tablet (768px), desktop (1280px)
- [ ] Test in Chrome, Safari, Firefox
- [ ] 404 page loads for invalid URLs
- [ ] Thank-you page fires after form submission

---

## File Structure

```
silvernesthomecare/
├── index.html              ← Home page
├── services.html           ← Services detail
├── about.html              ← About & team
├── intake.html             ← Client intake form (HIPAA-conscious)
├── contact.html            ← Contact form
├── privacy-policy.html     ← HIPAA-aligned privacy policy
├── terms.html              ← Terms & conditions
├── thank-you.html          ← Post-form confirmation
├── 404.html                ← Not found page
├── robots.txt              ← Disallows /admin/ from indexing
├── sitemap.xml             ← All public pages
├── SETUP.md                ← This file
├── serve.py                ← Local dev server
├── assets/
│   ├── css/styles.css      ← Full design system
│   ├── js/main.js          ← Nav, animations, form handling
│   └── images/             ← Add favicon.ico, og-image.jpg, hero images
├── admin/
│   ├── index.html          ← Password-gated admin portal
│   └── js/admin.js         ← Lead display, CSV export, settings
└── apps-script/
    └── Code.gs             ← Google Apps Script (copy into Apps Script editor)
```

---

## Local Development

Run a local server from the project root:

```bash
python3 serve.py
# Then open http://localhost:5050
```

---

*Built to UmojaServ luxury standard — SilverNest Home Care · June 2026*
