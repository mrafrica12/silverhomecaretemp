# SilverNest Home Care — Form System Guide

## Overview
This document describes the unified form system used across all SilverNest pages (Intake, Contact, Career applications, etc.). All forms use the same JavaScript validation, error handling, and backend integration.

---

## Form Architecture

### Client-Side (JavaScript)
Located in `assets/js/main.js`, the `initForm()` function handles:
- Real-time validation clearing (on input/change)
- Required field validation
- Email format validation
- Phone number format validation
- Error display with user-friendly messages
- Form submission with loading state
- Success/error toast notifications
- Anti-spam protection (honeypot + timestamp)

### Server-Side (Google Apps Script)
The backend receives form data and:
- Validates honeypot (catches spam bots)
- Validates form submission timing
- Stores data in Google Sheets
- Sends confirmation emails
- Returns JSON response for client handling

---

## Form Types & Configuration

### 1. Intake Form (`pages/intake.html`)
**Purpose**: Capture detailed care requirements and create leads

**Form ID**: `intake-form`
**Redirect**: `thank-you.html`
**Apps Script URL**: [Your Apps Script endpoint]

**Fields**:
- Contact info (name, email, phone)
- Care recipient details
- Care needs assessment
- Timeline and frequency
- Contact preferences
- Referral source

**Special Features**:
- Multi-section layout with visual dividers
- Comprehensive care needs dropdown
- Anti-spam honeypot
- Sidebar with process steps
- HIPAA compliance notice

---

### 2. Contact Form (`pages/contact.html`)
**Purpose**: General inquiries and support requests

**Form ID**: `contact-form`
**Redirect**: None (inline success message)
**Form Type**: `contact`

**Fields**:
- Name (first + last)
- Email
- Subject
- Message
- Type of inquiry (dropdown)

**Special Features**:
- Simpler form for general questions
- No redirect (stays on page with success toast)
- Responsive to small screens
- Sidebar with direct contact info

---

### 3. Career Form (`pages/career.html`)
**Purpose**: Job applications and career inquiries

**Form ID**: `career-form`
**Form Type**: `career`
**Redirect**: `thank-you.html`

**Fields**:
- Full name
- Email
- Phone
- Position applying for
- Experience level
- Resume/cover letter

---

## JavaScript Implementation

### Basic Form Initialization
```html
<form 
  id="intake-form"
  class="form"
  novalidate
  data-redirect="thank-you.html"
  data-script-url="YOUR_APPS_SCRIPT_URL"
>
  <!-- Form fields -->
</form>

<script src="assets/js/main.js"></script>
<script>
  initForm('intake-form', 'YOUR_APPS_SCRIPT_URL');
</script>
```

### Form Field Structure
```html
<div class="form-group">
  <label class="form-label" for="field-id">Field Label <span class="required">*</span></label>
  <input 
    class="form-input" 
    type="email" 
    id="field-id" 
    name="field_name" 
    required 
    placeholder="Placeholder text"
  >
  <span class="form-error"></span>
</div>
```

### Validation Rules

#### Built-in Validations
- **Required**: All `[required]` attributes are validated
- **Email**: Format must be `user@domain.extension`
- **Phone**: Minimum 10 digits after removing non-numeric characters

#### Custom Validation
Add custom validation in the form submission handler:
```javascript
const customField = form.querySelector('[name="custom_field"]');
if (customField?.value.length < 5) {
  markErr(customField, 'Field must be at least 5 characters.');
}
```

---

## Anti-Spam Protection

### Layer 1: Honeypot Field
```html
<div class="hp-field" aria-hidden="true">
  <input type="text" name="website" id="website" value="" 
    autocomplete="off" tabindex="-1"
    style="position:absolute;left:-9999px;opacity:0;height:0;width:0;">
</div>
```
- Hidden from visible view
- Bots will fill it, humans won't
- Server rejects if `website` field has value

### Layer 2: Timestamp Validation
```html
<input type="hidden" name="form_loaded" id="form_loaded" value="">
```
- Captures when form page loaded (in JS: `Date.now()`)
- Server rejects if submission happens < 2 seconds after load
- Prevents rapid-fire bot submissions

### Layer 3: Rate Limiting (Server-side)
- Implement max 5 submissions per IP per hour
- Block IPs with suspicious patterns
- Log all rejected submissions

---

## Error Handling

### User-Facing Error Messages
```javascript
markErr(field, 'Error message here');
```

**Good practices**:
- Be specific: "Phone number must have 10 digits" not "Invalid"
- Be actionable: "Enter a valid email" not "Error"
- Be friendly: "Oops! Please check..." not "VALIDATION FAILED"

**Toast notifications**:
```javascript
showToast('Message here', 'success'); // green
showToast('Message here', 'error');   // red
```

---

## Backend Integration (Google Apps Script)

### Deployment
1. Create a new Google Apps Script
2. Copy the deployment code below
3. Deploy as web app (execute as authenticated user)
4. Get the deployment URL
5. Add URL to form's `data-script-url` attribute

### Deployment Code Template
```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = e.parameter;

  // Spam check: honeypot
  if (data.website) {
    return ContentService.createTextOutput(
      JSON.stringify({status: 'error', message: 'Spam detected'})
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // Spam check: submission timing
  const formLoaded = parseInt(data.form_loaded);
  if (Date.now() - formLoaded < 2000) {
    return ContentService.createTextOutput(
      JSON.stringify({status: 'error', message: 'Form submitted too quickly'})
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // Route to appropriate handler
  if (data.form_type === 'intake') {
    return handleIntakeForm(data, sheet);
  } else if (data.form_type === 'contact') {
    return handleContactForm(data, sheet);
  } else if (data.form_type === 'career') {
    return handleCareerForm(data, sheet);
  }
}

function handleIntakeForm(data, sheet) {
  // Append to intake sheet
  sheet.appendRow([
    new Date(),
    'NEW',
    data.first_name,
    data.last_name,
    data.email,
    data.phone,
    // ... more fields
  ]);

  // Send confirmation email
  MailApp.sendEmail(
    data.email,
    'Your Care Request Has Been Received',
    `Hi ${data.first_name}, your intake form has been received...`
  );

  return ContentService.createTextOutput(
    JSON.stringify({status: 'success', message: 'Your request has been received'})
  ).setMimeType(ContentService.MimeType.JSON);
}

// Similar functions for contact and career forms
```

---

## Form Styling & UX

### Input Heights
- Desktop: 52px (min-height)
- Tablet (768px): 48px
- Mobile (480px): 44px
- All inputs: font-size 16px (prevents iOS zoom)

### Focus States
- Border color: `var(--sage)` (#7A9E7E)
- Shadow: inset glow + outer glow
- Background: slight cream tint

### Error States
- Border color: `#D94F4F` (red)
- Text color: Same red
- Shows inline error message
- Scrolls into view on submit

---

## Testing Checklist

- [ ] Submit form with all fields filled (should succeed)
- [ ] Submit with missing required field (should show error)
- [ ] Submit with invalid email (should show error)
- [ ] Submit with invalid phone (should show error)
- [ ] Clear error by editing field (should remove error state)
- [ ] Check Google Sheet for new row with data
- [ ] Verify confirmation email received
- [ ] Test honeypot (should reject if filled)
- [ ] Test timestamp (should reject if submitted < 2 seconds after load)
- [ ] Check mobile responsiveness
- [ ] Test on slow network (should handle gracefully)
- [ ] Test with JavaScript disabled (should show form submit button)

---

## Common Issues & Solutions

### Issue: Form won't submit
**Solutions**:
1. Check `data-script-url` is correct and public
2. Verify honeypot field hasn't been filled
3. Check browser console for JavaScript errors
4. Verify all required fields have values

### Issue: Emails not being sent
**Solutions**:
1. Check Apps Script has mail permissions
2. Verify email addresses are valid
3. Check Gmail isn't blocking as spam
4. Look at Apps Script execution logs

### Issue: Data not appearing in Sheet
**Solutions**:
1. Check Apps Script has Sheet permissions
2. Verify sheet name in Apps Script matches
3. Check column structure matches code
4. Look for Apps Script execution errors

---

## Best Practices

✅ **DO**
- Always use `novalidate` on forms (we handle validation)
- Always include honeypot + timestamp for security
- Always send confirmation emails
- Always validate on both client AND server
- Always show user-friendly error messages

❌ **DON'T**
- Don't store PII in plain text
- Don't skip server-side validation
- Don't submit forms without anti-spam
- Don't show generic error messages
- Don't forget to test forms after deploy

---

## Maintenance

**Monthly**:
- Review spam logs
- Check form submission rates
- Update Apps Script if needed

**Quarterly**:
- Audit data quality
- Review error patterns
- Test all form flows

---

## Updated: 2026-06-10
For technical support, contact the development team.
