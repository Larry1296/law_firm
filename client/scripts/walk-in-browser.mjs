// Real-browser integration checks against isolated fixtures. No API mocking.
// PLAYWRIGHT_MODULE=/tmp/lawfirm-step1-browser/node_modules/playwright-core/index.mjs node client/scripts/walk-in-browser.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CHROMIUM_PATH || '/home/larry/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
});
const base = process.env.STEP1_BROWSER_URL || 'http://127.0.0.1:5174';
const artifacts = process.env.STEP1_ARTIFACTS || '/tmp/lawfirm-step1-browser-artifacts';
await mkdir(artifacts, { recursive: true });
const contexts = [];
const checks = [];
const pass = (label) => { checks.push(label); console.log(`PASS ${label}`); };
async function login(number, workspace) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${base}/login`);
  await page.locator('input[type=email]').fill(`enquiry-${number}@example.com`);
  await page.locator('input[type=password]').fill('test-pass');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(new RegExp(`/${workspace}/`));
  await page.goto(`${base}/${workspace}/clients/walk-in-enquiries`);
  await page.getByRole('heading', { name: 'Walk-in Enquiries', exact: true }).waitFor();
  return page;
}
async function noHorizontalOverflow(page, label) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll('main input, main textarea, main select, main table')].filter((el) => {
      const box = el.getBoundingClientRect(); return box.width > 0 && (box.right > innerWidth + 1 || box.left < -1);
    }).map((el) => el.tagName),
  }));
  assert(sizes.content <= sizes.width + 1, `${label}: page overflows ${JSON.stringify(sizes)}`);
  assert.deepEqual(sizes.overflowing, [], `${label}: fields overflow`);
  pass(`${label}: no horizontal overflow`);
}
async function start(page, method) {
  await page.getByRole('button', { name: 'New walk-in enquiry', exact: true }).click();
  await page.getByRole('region', { name: 'Intake privacy notice' }).waitFor();
  assert.equal(await page.getByLabel(/Visitor’s full name/).count(), 0);
  await page.getByLabel('How was the notice provided?').selectOption(method);
  await page.getByRole('checkbox').check();
  const response = page.waitForResponse((r) => r.url().endsWith('/notice-deliveries/') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm notice delivery and continue' }).click();
  const result = await response; assert.equal(result.status(), 201);
  await page.getByLabel(/Visitor’s full name/).waitFor();
  pass(`${method}: notice precedes input and delivery receipt recorded`);
}
async function fill(page, name) {
  await page.getByLabel(/Visitor’s full name/).fill(name);
  await page.getByLabel(/Safe telephone number or contact method/).fill('test.visitor@example.com — email only');
  await page.getByLabel(/Broad legal-service category/).fill('Employment');
  await page.getByLabel('Very short non-confidential description', { exact: true }).fill('Fictional employment enquiry for Step 1 browser verification.');
}
async function save(page) {
  const response = page.waitForResponse((r) => r.url().endsWith('/walk-in-enquiries/') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Record enquiry', exact: true }).click();
  const result = await response; assert.equal(result.status(), 201, await result.text());
  const record = await result.json();
  await page.getByRole('status').filter({ hasText: record.reference }).waitFor();
  await page.reload();
  await page.getByText(record.reference, { exact: true }).first().waitFor();
  pass(`${record.reference}: saved and remains after refresh`);
  return record;
}
try {
  const secretary = await login(8002, 'secretary');
  await secretary.getByRole('alert').filter({ hasText: 'firm administrator' }).waitFor();
  assert(await secretary.getByRole('button', { name: 'New walk-in enquiry' }).isDisabled());
  assert.equal(await secretary.getByRole('button', { name: 'Configure intake privacy notice' }).count(), 0);
  pass('Secretary blocked by incomplete configuration, with administrator explanation');
  const admin = await login(8001, 'admin');
  assert(await admin.getByRole('button', { name: 'New walk-in enquiry' }).isDisabled());
  await admin.getByRole('button', { name: 'Configure intake privacy notice' }).click();
  await admin.getByLabel(/Policy version/).fill('browser-test-v1');
  const values = {
    'Lawful basis rationale, including representatives and third-party names': 'Fictional test policy: legitimate interests in minimum enquiries, subject to rights assessment.',
    'Any law requiring collection, or state that none applies': 'No mandatory statutory collection asserted for this fictional test.',
    'Recipient identities/categories, processors and sharing safeguards': 'Authorised test intake staff; local test hosting, no third-party disclosures.',
    'Retention period, trigger and lawful exceptions': 'Fictional test policy: remove isolated test database after review.',
    'Privacy contact name or role and contact details': 'Test privacy lead: privacy@example.com',
    'Overseas transfers, destinations and safeguards, or explicit no-transfer statement': 'Local isolated test only; no overseas transfers.',
    'Actual technical and organisational security safeguards': 'Local test database, authenticated access and firm-isolated records.',
  };
  for (const [label, value] of Object.entries(values)) await admin.getByLabel(label, { exact: true }).fill(value);
  await noHorizontalOverflow(admin, 'Admin privacy configuration');
  await admin.getByRole('button', { name: 'Save approved notice configuration' }).click();
  await admin.getByRole('button', { name: 'New walk-in enquiry' }).waitFor({ state: 'visible' });
  await start(admin, 'SCREEN');
  await fill(admin, 'Browser Self Visitor');
  assert.equal(await admin.getByLabel('Received time (Africa/Nairobi)').count(), 0);
  for (const width of [320, 375, 768, 1024, 1280, 1440]) {
    await admin.setViewportSize({ width, height: 900 }); await noHorizontalOverflow(admin, `Capture ${width}px`);
  }
  await admin.screenshot({ path: `${artifacts}/admin-notice-and-form.png`, fullPage: true });
  const record = await save(admin);
  assert.equal(record.enquiry_for, 'SELF'); assert.equal(record.authority_status, 'NOT_REQUIRED');
  assert(record.notice_version && record.notice_delivered_at); assert.equal(record.received_at_reason, '');
  pass('Admin self enquiry uses server time and persisted notice evidence');
  for (const width of [320, 375, 768, 1024, 1280, 1440]) {
    await admin.setViewportSize({ width, height: 900 }); await noHorizontalOverflow(admin, `Register ${width}px`);
    await admin.screenshot({ path: `${artifacts}/register-${width}.png`, fullPage: true });
  }
  await admin.getByRole('button', { name: 'View details', exact: true }).filter({ visible: true }).first().click();
  await admin.getByRole('button', { name: 'Correct this enquiry' }).click();
  await admin.getByLabel(/Visitor’s full name/).fill('Browser Self Corrected');
  await admin.getByRole('button', { name: 'Record correction' }).click();
  await admin.getByText('A correction reason is required.', { exact: true }).waitFor();
  await admin.getByLabel('Correction reason', { exact: true }).fill('Fictional spelling correction');
  const correctionResponse = admin.waitForResponse((r) => r.url().endsWith('/corrections/') && r.request().method() === 'POST');
  await admin.getByRole('button', { name: 'Record correction' }).click();
  assert.equal((await correctionResponse).status(), 200);
  await admin.getByText('visitor name — previous:', { exact: true }).waitFor();
  await admin.screenshot({ path: `${artifacts}/admin-correction-history.png`, fullPage: true });
  await admin.reload(); await admin.getByText('Browser Self Corrected', { exact: true }).first().waitFor();
  pass('Admin correction requires reason, records history and persists after refresh');
  await secretary.reload();
  await start(secretary, 'READ_ALOUD'); await fill(secretary, 'Browser Representative');
  await secretary.getByLabel('Who is the enquiry for?').selectOption('OTHER');
  await secretary.getByRole('button', { name: 'Record enquiry', exact: true }).click();
  await secretary.getByText('Prospective person name is required.', { exact: true }).waitFor();
  await secretary.getByLabel(/Prospective person name/).fill('Browser Beneficiary');
  await secretary.getByLabel(/Visitor relationship or capacity/).fill('Sibling');
  await secretary.getByLabel('Authority status', { exact: true }).selectOption('PENDING');
  await secretary.setViewportSize({ width: 375, height: 812 }); await noHorizontalOverflow(secretary, 'Secretary representative form');
  const represented = await save(secretary); assert.equal(represented.enquiry_for, 'OTHER');
  await secretary.getByRole('button', { name: 'View details', exact: true }).filter({ visible: true }).first().click();
  await secretary.getByRole('heading', { name: /Enquiry details and correction history/ }).waitFor();
  assert.equal(await secretary.getByRole('button', { name: 'Correct this enquiry' }).count(), 0);
  pass('Secretary can view details and cannot see correction controls');
  await start(secretary, 'PAPER'); await fill(secretary, 'Browser Organisation Visitor');
  await secretary.getByLabel('Who is the enquiry for?').selectOption('ORGANISATION');
  await secretary.getByLabel(/Organisation name/).fill('Browser Example Organisation');
  await secretary.getByLabel(/Visitor relationship or capacity/).fill('Director');
  await secretary.getByLabel('Authority status', { exact: true }).selectOption('CLAIMED');
  await secretary.getByLabel('Enter a different received time').check();
  await secretary.getByLabel('Received time (Africa/Nairobi)', { exact: true }).fill('2026-01-01T09:00');
  await secretary.getByRole('button', { name: 'Record enquiry', exact: true }).click();
  await secretary.getByText('A reason is required for an entered received time.', { exact: true }).waitFor();
  await secretary.getByLabel(/Reason for entered received time/).fill('Fictional delayed entry');
  const organisation = await save(secretary);
  assert.equal(organisation.enquiry_for, 'ORGANISATION'); assert.equal(organisation.notice_delivery_method, 'PAPER');
  assert.equal(Date.parse(organisation.received_at), Date.parse('2026-01-01T06:00:00Z'));
  pass('Secretary organisation enquiry and explained Nairobi time override persist');
  await secretary.screenshot({ path: `${artifacts}/secretary-register.png`, fullPage: true });
  console.log(`REAL BROWSER CHECKS PASSED: ${checks.length}. Screenshots: ${artifacts}`);
} catch (error) {
  for (let i = 0; i < contexts.length; i++) {
    const pages = contexts[i].pages();
    if (pages[0]) await pages[0].screenshot({ path: `${artifacts}/failure-${i}.png`, fullPage: true }).catch(() => {});
  }
  throw error;
} finally { await browser.close(); }
