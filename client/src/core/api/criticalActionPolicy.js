const friendly = (value = '') => String(value).replaceAll('_', ' ').replaceAll('-', ' ').toLowerCase();
const sentence = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export function requestBody(config) {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) return Object.fromEntries(config.data.entries());
  if (typeof config.data === 'string') {
    try { const value = JSON.parse(config.data); return value && typeof value === 'object' ? value : {}; } catch { return {}; }
  }
  return config.data && typeof config.data === 'object' ? config.data : {};
}

export function requestPath(config) {
  return new URL(config.url || '/', 'http://sheria.local').pathname.replace(/^\/api\//, '/').replace(/\/$/, '') || '/';
}

// All writes require confirmation by default. Only these passive/read-only
// operations are exempt; an unfamiliar endpoint fails closed into a prompt.
export function criticalAction(config) {
  const method = (config.method || 'get').toLowerCase();
  if (!['post', 'put', 'patch', 'delete'].includes(method)) return null;
  const path = requestPath(config);
  const data = requestBody(config);
  if (method === 'post' && (
    /^\/auth\/(login|token\/refresh)$/.test(path)
    || /^\/knowledge-base\/ask$/.test(path)
    || /^\/assistant\/(client|advocate|firm|platform)$/.test(path)
    || /^\/notifications\/([^/]+\/read|mark-all-read)$/.test(path)
    || /^\/communications\/announcements\/[^/]+\/read$/.test(path)
    || /^\/tutorials\/[^/]+\/progress$/.test(path)
    || /^\/courtroom\/launch\/[^/]+\/open$/.test(path)
    || (/\/documents$/.test(path) && data.action === 'propose_reference')
  )) return null;

  const prompt = (title, text, confirmText = 'Confirm', tone = 'warning') => ({ title, text, confirmText, tone });
  const last = path.split('/').at(-1);
  const action = friendly(data.action || last);
  const status = friendly(data.to_state || data.status || data.decision || '');
  const amount = String(data.amount_received ?? data.amount ?? data.total ?? '');
  const money = /^\d+(\.\d+)?$/.test(amount) ? ` ${data.currency === 'USD' ? 'USD' : 'KES'} ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : '';

  if (method === 'delete') return prompt('Permanently remove this record?', 'This deletion may be irreversible. Confirm that you selected the correct record.', 'Delete record', 'danger');
  if (/\/auth\/logout$/.test(path)) return prompt('Sign out of Sheria Master?', 'You will need to sign in again to continue.', 'Sign out');
  if (/password|sign-in-link|owner-invitation|portal-invitation/.test(path)) return prompt('Confirm this account security action?', 'Check the account and recipient before changing credentials or sending an access link.', 'Continue');
  if (/\/platform\/firms$|\/auth\/register-firm$|\/onboarding-requests\/submit$/.test(path)) return prompt('Submit this firm registration?', 'Check the firm, owner, office and subscription details before submitting.', 'Submit registration');
  if (/\/platform\/firms\/[^/]+\/subscription$/.test(path)) return prompt('Change this firm’s subscription?', 'These billing and access terms will apply to the firm. Check the plan, price and dates.', 'Update subscription');
  if (/\/onboarding-requests\/[^/]+$/.test(path)) return prompt(`Update this firm registration request${status ? `: ${status}` : ''}?`, 'This decision updates the platform onboarding record. Check the firm and requested status.', 'Update request');
  if (/\/subscription\/invoices.*\/payment$/.test(path)) return prompt('Submit this subscription payment?', 'Check the invoice, payer and payment reference. Platform finance will verify the payment.', 'Submit payment');
  if (/\/platform\/invoices\/[^/]+\/(confirm|void)$/.test(path)) return prompt(last === 'confirm' ? 'Confirm this subscription payment?' : 'Void this subscription invoice?', 'Check the invoice and payment evidence before recording this billing decision.', last === 'confirm' ? 'Confirm payment' : 'Void invoice');
  if (/\/subscription\/invoices$/.test(path)) return prompt('Request this subscription invoice?', 'Check the selected plan, billing cycle and price before creating the invoice.', 'Request invoice');
  if (/\/finance\//.test(path) || /\/approve-finance$/.test(path)) {
    if (/reverse/.test(path)) return prompt('Reverse this financial transaction?', 'A linked reversal will change the ledger. The original entry remains in the audit history.', 'Record reversal', 'danger');
    if (/client-money.*(payments|transfers|receipts|retainers)/.test(path)) return prompt(`Confirm this client-money ${/approve$/.test(path) ? 'approval' : 'entry'}${money}?`, 'Check the matter, account, beneficiary and supporting authority. Posted entries require a linked reversal to correct.', /approve$/.test(path) ? 'Approve payment' : 'Record client money');
    if (/tax-configurations/.test(path)) return prompt('Apply this tax configuration?', 'New invoices will use this configuration from its effective date. Check the firm’s approved tax treatment.', 'Save tax configuration');
    return prompt(`Confirm this financial ${/approve/.test(path) ? 'approval' : /issue/.test(path) ? 'issue' : 'action'}${money}?`, 'Check the account, invoice or matter and supporting records before posting this decision.', 'Confirm financial action');
  }
  if (/\/destruction$/.test(path)) return prompt('Permanently destroy these archived records?', 'Only the selected approved records will be destroyed. Confirm the retention decision, exclusions, originals and legal holds.', 'Destroy approved records', 'danger');
  if (/\/legal-hold$/.test(path)) return prompt(`${data.action === 'RELEASE' ? 'Release' : 'Place'} this legal hold?`, 'This changes whether archived records may be destroyed. Check the recorded authority and reason.', data.action === 'RELEASE' ? 'Release hold' : 'Place hold');
  if (/\/closure(?:\/|$)/.test(path)) return prompt(/finalise$/.test(path) ? 'Formally close this matter?' : /reopen$/.test(path) ? 'Reopen this closed matter?' : 'Record this closing-review action?', 'Check the legal outcome, client instructions, financial clearance and outstanding obligations.', /finalise$/.test(path) ? 'Close matter' : 'Record closing action');
  if (/\/archive$|\/retention-reviews$/.test(path)) return prompt('Record this archive or retention decision?', 'Check the file inventory, storage location, preservation duties and review dates.', 'Record decision');
  if (/\/cases(?:\/open)?$|\/staff\/(lawyer|secretary)\/cases$/.test(path)) return prompt('Open this legal matter?', 'Check the client, accepted instructions, engagement, jurisdiction and assigned team before creating the file.', 'Open matter');
  if (/\/transitions$|\/cases\/[^/]+\/status$/.test(path)) return prompt(`Record this matter stage${status ? `: ${status}` : ''}?`, 'This changes the matter’s recorded progress and may create deadlines. Check the supporting event and effective date.', 'Record stage');
  if (/\/filings$/.test(path)) return prompt('Record this filing or service?', 'Confirm the paper, actual filing/service date and external reference. This may create court deadlines.', 'Record filing');
  if (/\/deadlines(?:\/|$)/.test(path)) return prompt('Record this deadline decision?', 'Check the date, time, governing rule or order and recorded reason. Date changes remain in the history.', 'Record deadline');
  if (/reassign-(lawyer|secretary)/.test(path)) return prompt('Reassign this matter team member?', 'Check the matter and selected advocate or secretary. This changes responsibility and access to the file.', 'Reassign team member');
  if (/intake-privacy.*\/(activate|retire)$/.test(path)) return prompt(last === 'retire' ? 'Retire this privacy notice?' : 'Activate this privacy notice?', 'New-client intake depends on an approved active notice. Check the version and effective date.', last === 'retire' ? 'Retire notice' : 'Activate notice', last === 'retire' ? 'danger' : 'warning');
  if (/conflict-checks|\/conflict-check\/|\/engagements|\/jurisdiction|compliance-review/.test(path)) return prompt(`Record this ${/engagement/.test(path) ? 'engagement' : /jurisdiction/.test(path) ? 'jurisdiction' : /compliance/.test(path) ? 'due-diligence' : 'conflict or acceptance'} decision${status ? `: ${status}` : ''}?`, 'Confirm the instructions, evidence and authority for the decision. This affects whether the firm may act.', 'Record decision');
  if (/\/release-requests|\/release$/.test(path)) return prompt('Record this original-document release?', 'Check the original, recipient identity, authority and acknowledgement before recording release.', 'Record release');
  if (/\/physical-file$|\/records-room/.test(path)) return prompt('Record this file-custody change?', 'Check the file reference, receiving person and physical location. This movement will be recorded.', 'Record custody action');
  if (/\/documents(?:\/|$)/.test(path)) return prompt(`Record this document action${data.action ? `: ${friendly(data.action)}` : ''}?`, 'Check the client, matter, document, copy type and any recipient before saving or sending.', 'Record document action');
  if (/\/arrivals(?:\/|$)/.test(path)) return prompt(`Confirm ${data.action ? sentence(friendly(data.action)) : 'this client arrival'}?`, 'This updates the reception and consultation record. Check the visitor and assigned advocate.', 'Update reception record');
  if (/\/permissions|delegate|\/platform\/users\/|\/staff\/.*(status|activate|deactivate)/.test(path) || 'is_active' in data) return prompt('Change this account or record’s access?', 'Confirm the person or record and the permissions or access being granted or removed.', 'Update access');
  if (/\/announcements|\/bulk$|forward-to-client/.test(path)) return prompt('Send this communication?', 'Check the recipients, message and attachments. Recipients may receive a notification or access to the shared information.', 'Send communication');
  if (/\/messages$|\/forward-to-lawyer$|\/staff-threads/.test(path)) return prompt('Send this message?', 'Check the recipient and content before adding this message to the communication record.', 'Send message');
  if (/\/public-knowledge|\/tutorials/.test(path)) return prompt(`${/publish|activate/.test(action) ? 'Publish' : /withdraw|retire/.test(action) ? 'Withdraw' : 'Save'} this knowledge or tutorial record?`, 'Check accuracy, intended audience and publication status before saving this content.', 'Save content');
  if (/\/ai\/|\/research/.test(path)) return prompt('Run this legal analysis or research action?', 'This may create a new assessment or use the configured external provider. An advocate must review the result.', 'Run analysis');
  if (/\/events|\/courtroom/.test(path)) return prompt('Record this court or calendar action?', 'Check the matter, date, participants and instructions. Other users may be notified.', 'Record court action');
  if (/\/staff\//.test(path)) return prompt('Save this staff action?', 'Check the staff account, role, assignments and any access changes before saving.', 'Save staff action');
  if (/\/clients(?:\/|$)|\/prospective$|\/proposed-matters$/.test(path)) return prompt('Save this client or proposed-matter record?', 'Check the client identity, contact details and proposed instructions before saving.', 'Save client record');
  const resource = /plans/.test(path) ? 'subscription plan' : /tasks/.test(path) ? 'task' : /profile/.test(path) ? 'profile' : /firm/.test(path) ? 'firm configuration' : /workstream/.test(path) ? 'matter workstream' : 'record';
  return prompt(`Save this ${resource} action?`, 'Confirm that the details and selected record are correct before saving these changes.', 'Save changes');
}
