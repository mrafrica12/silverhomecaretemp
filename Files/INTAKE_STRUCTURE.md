# SilverNest Home Care — Intake Form Structure

## Overview
This document describes the Google Sheets structure for the SilverNest intake form submissions. The Apps Script backend receives form data and populates a Google Sheet for CRM and follow-up tracking.

---

## Google Sheet Column Structure

### Submissions Sheet (Primary)
This sheet captures all intake form submissions for lead tracking and follow-up.

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | Timestamp | Date | Auto-populated when form submitted |
| B | Status | Dropdown | NEW / CONTACTED / SCHEDULED / COMPLETED / CLOSED |
| C | Priority | Dropdown | LOW / MEDIUM / HIGH / URGENT |
| D | first_name | Text | Contact person's first name |
| E | last_name | Text | Contact person's last name |
| F | email | Email | Contact person's email |
| G | phone | Phone | Contact person's phone (formatted) |
| H | recipient_name | Text | Care recipient's full name |
| I | relationship | Dropdown | spouse / child / sibling / friend / self / other |
| J | care_needs | Dropdown | personal-care / companion-care / skilled-nursing / dementia-care / respite-care / meal-prep / transportation / overnight / multiple / unsure |
| K | care_frequency | Dropdown | few-hours-week / part-time / full-time / live-in / unsure |
| L | start_timeline | Dropdown | immediately / 1-2-weeks / 1-month / planning-ahead |
| M | contact_time | Dropdown | morning / afternoon / evening / anytime |
| N | referral | Dropdown | google / social-media / friend-family / doctor / hospital / other |
| O | form_loaded | Timestamp (hidden) | Timestamp when form page loaded (spam detection) |
| P | Notes | Text | Internal notes for care coordinators |
| Q | Assigned To | Dropdown | [Care Coordinator Names] |
| R | Follow-up Date | Date | Scheduled follow-up date |
| S | Conversion Status | Dropdown | INQUIRY / CONSULTATION_SCHEDULED / CONTRACTED / NOT_INTERESTED |

---

## Data Validation Rules

### Status Column (B)
```
NEW (default) → CONTACTED → SCHEDULED → COMPLETED → CLOSED
```
- **NEW**: Form just submitted
- **CONTACTED**: Care coordinator reached out
- **SCHEDULED**: Consultation call scheduled
- **COMPLETED**: Initial assessment done
- **CLOSED**: Converted or marked as not interested

### Priority Column (C)
```
LOW: Planning ahead (1+ months out)
MEDIUM: Within 1 month
HIGH: Immediate (within 1-2 weeks)
URGENT: Need care within days
```

### Conversion Status Column (S)
```
INQUIRY: Initial inquiry only
CONSULTATION_SCHEDULED: Booked consultation
CONTRACTED: Became paying customer
NOT_INTERESTED: Chose not to proceed
```

---

## Google Apps Script Setup

### Required Endpoints
The form submits to a Google Apps Script web app with the following structure:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = e.parameter;

  // Validate honeypot (spam detection)
  if (data.website) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Spam detected'}));

  // Validate form_loaded timestamp (prevent rapid submission bots)
  const formLoaded = parseInt(data.form_loaded);
  const submittedNow = Date.now();
  if (submittedNow - formLoaded < 2000) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Form submitted too quickly'}));

  // Append row
  sheet.appendRow([
    new Date(),              // Timestamp
    'NEW',                   // Status
    'MEDIUM',                // Priority (set based on timeline)
    data.first_name,         // First Name
    data.last_name,          // Last Name
    data.email,              // Email
    data.phone,              // Phone
    data.recipient_name,     // Recipient Name
    data.relationship,       // Relationship
    data.care_needs,         // Care Needs
    data.care_frequency,     // Care Frequency
    data.start_timeline,     // Timeline
    data.contact_time,       // Best Time to Contact
    data.referral,           // How They Heard About Us
    '',                      // Notes (empty for now)
    '',                      // Assigned To (coordinator assigns)
    '',                      // Follow-up Date
    ''                       // Conversion Status
  ]);

  // Send confirmation email
  sendConfirmationEmail(data.email, data.first_name, data.recipient_name);

  return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Your request has been received'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendConfirmationEmail(email, firstName, recipientName) {
  MailApp.sendEmail(
    email,
    'Your SilverNest Care Request Has Been Received',
    `Hi ${firstName},\n\nThank you for submitting your intake form for ${recipientName}. A SilverNest care coordinator will contact you within 24 hours at your preferred time.\n\nIn the meantime, feel free to call us at (000) 000-0000 or visit our website for more information.\n\nWarm regards,\nSilverNest Home Care`
  );
}
```

---

## Intake Form Fields Mapping

### Contact Information Section
- `first_name` → Column D
- `last_name` → Column E
- `email` → Column F
- `phone` → Column G

### About Your Loved One Section
- `recipient_name` → Column H
- `relationship` → Column I
- `care_needs` → Column J
- `care_frequency` → Column K
- `start_timeline` → Column L
- `contact_time` → Column M
- `referral` → Column N

### Anti-Spam Fields
- `website` (honeypot) → Not stored
- `form_loaded` → Column O (hidden)

---

## Care Coordinator Workflow

1. **Daily Review**: Check for NEW submissions
2. **Set Priority**: Based on `start_timeline`:
   - "immediately" → URGENT
   - "1-2-weeks" → HIGH
   - "1-month" → MEDIUM
   - "planning-ahead" → LOW
3. **Assign**: Select care coordinator in "Assigned To"
4. **Contact**: Call/email within 24 hours
5. **Update Status**: Move from CONTACTED → SCHEDULED → COMPLETED
6. **Track Conversion**: Mark as contracted, not interested, or follow-up later

---

## Dashboard Metrics (Optional)

Create a summary sheet to track:
- Total submissions (week/month)
- Conversion rate (Submitted → Contracted)
- Average time to first contact
- Average time to conversion
- Top referral sources
- Care need distribution

---

## Security Notes

✅ **Implemented**
- Honeypot field (catches spam bots)
- Timestamp validation (prevents rapid submissions)
- HIPAA-compliant notice on form
- Email confirmation sent to submitter

⚠️ **To Implement**
- Rate limiting (max 5 submissions per IP per hour)
- Email domain validation
- Phone number format validation
- Automatic encryption of PII at rest
- Regular backups of submissions sheet

---

## Testing the Integration

1. Fill out the intake form at `/pages/intake.html`
2. Verify form submits without errors
3. Check Google Sheet for new row
4. Verify confirmation email received
5. Test validation: try submitting with missing required fields
6. Test anti-spam: fill form, submit immediately twice (should fail second)

---

## Updated: 2026-06-10
For questions about this structure, contact the development team.
