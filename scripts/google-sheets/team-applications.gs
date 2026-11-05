/**
 * Traqi — Join the Traqi Team → Google Sheet.
 *
 * Paste this into the Apps Script editor of a Google Sheet owned by
 * traqi.info@gmail.com (Extensions → Apps Script), then deploy it as a web
 * app. The /team form POSTs every application here as JSON; each one becomes
 * a row on the "Applications" tab, and a short notification email goes to
 * NOTIFY_EMAIL. The same application is also saved in Firestore, where the
 * admin console's "Join the Traqi Team" module triages it.
 */

const SHEET_NAME = 'Applications';
const NOTIFY_EMAIL = 'traqi.info@gmail.com';   // set to '' to turn emails off

const ROLES = [
  'Operations & Customer Support',
  'Technical Assistant',
  'Social Media Manager',
  'Content Creator',
  'Marketing & Communications Associate'
];

/* Column order on the sheet. `key` is the field in the posted JSON. */
const COLUMNS = [
  ['Submitted at', 'submittedAt'],
  ['First name', 'firstName'],
  ['Surname', 'surname'],
  ['Role', 'role'],
  ['Email', 'email'],
  ['WhatsApp', 'whatsapp'],
  ['Location', 'location'],
  ['Occupation', 'occupation'],
  ['Availability (weekly)', 'availability'],
  ['Portfolio / link', 'portfolio'],
  ['Skills & experience', 'experience'],
  ['Why they want to join', 'motivation'],
  ['Firestore ID', 'id']
];

/** Runs once, by hand, from the editor: creates the tab and header row. */
function setup() {
  const sheet = getSheet_();
  sheet.getRange(1, 1, 1, COLUMNS.length)
    .setValues([COLUMNS.map(c => c[0])])
    .setFontWeight('bold')
    .setBackground('#312E81')
    .setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, COLUMNS.length, 170);
  sheet.setColumnWidth(11, 360);
  sheet.setColumnWidth(12, 360);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);   // two applications at once must not share a row
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    /* The endpoint is public, so only well-formed applications get a row. */
    const ok = d.firstName && d.surname && d.email && d.whatsapp && ROLES.indexOf(d.role) !== -1;
    if (!ok) return json_({ ok: false, error: 'invalid' });

    const sheet = getSheet_();
    if (sheet.getLastRow() === 0) setup();

    /* Firestore id doubles as a de-duplication key: a resent request is ignored. */
    if (d.id && sheet.getLastRow() > 1) {
      const ids = sheet.getRange(2, COLUMNS.length, sheet.getLastRow() - 1, 1).getValues().flat();
      if (ids.indexOf(d.id) !== -1) return json_({ ok: true, duplicate: true });
    }

    const row = COLUMNS.map(([, key]) => {
      if (key === 'submittedAt') return d.submittedAt ? new Date(d.submittedAt) : new Date();
      /* A leading "+" or "=" would be read as a formula; keep it text. */
      const v = String(d[key] == null ? '' : d[key]).slice(0, 2000);
      return /^[=+\-@]/.test(v) ? "'" + v : v;
    });
    sheet.appendRow(row);

    if (NOTIFY_EMAIL) notify_(d, sheet);
    return json_({ ok: true });
  } catch (err) {
    console.error('doPost failed: ' + (err && err.stack || err));   // shows under Executions
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Run from the editor to check the sheet and the email without the website:
    it posts a sample application through doPost, exactly as /team does. A
    row should appear and an email should arrive. Delete the row afterwards. */
function testApplication() {
  const res = doPost({ postData: { contents: JSON.stringify({
    id: 'test-' + Date.now(),
    firstName: 'Test', surname: 'Applicant', email: 'test@example.com',
    whatsapp: '08030000000', location: 'Abeokuta, Ogun State',
    role: 'Content Creator', occupation: 'Student', availability: '5 – 10 hours',
    portfolio: 'linkedin.com/in/test', experience: 'Sample experience.',
    motivation: 'Sample motivation.', submittedAt: new Date().toISOString()
  }) } });
  const out = JSON.parse(res.getContent());
  Logger.log('Result: ' + res.getContent());
  Logger.log('Spreadsheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '  (tab "' + SHEET_NAME + '")');
  if (!out.ok) throw new Error('Test failed: ' + out.error);
}

/** Lets you open the /exec URL in a browser to check the deployment is live. */
function doGet() {
  return json_({ ok: true, service: 'Join the Traqi Team' });
}

function notify_(d, sheet) {
  const url = sheet.getParent().getUrl();
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: `Join the Traqi Team: ${d.firstName} ${d.surname} — ${d.role}`,
    htmlBody:
      `<p><b>${esc_(d.firstName)} ${esc_(d.surname)}</b> applied for <b>${esc_(d.role)}</b>.</p>`
      + `<p>Email: ${esc_(d.email)}<br>WhatsApp: ${esc_(d.whatsapp)}<br>Location: ${esc_(d.location)}<br>`
      + `Currently: ${esc_(d.occupation)}<br>Time weekly: ${esc_(d.availability)}<br>`
      + `Link: ${esc_(d.portfolio) || '—'}</p>`
      + `<p><b>Skills & experience</b><br>${esc_(d.experience)}</p>`
      + `<p><b>Why they want to join</b><br>${esc_(d.motivation)}</p>`
      + `<p><a href="${url}">Open the sheet</a></p>`
  });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function esc_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}
