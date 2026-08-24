const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const dataFile = path.join(__dirname,'data.json');
function load(){ try{ return JSON.parse(fs.readFileSync(dataFile,'utf8')||'{}'); }catch(e){ return {}; } }
function save(state){ fs.writeFileSync(dataFile, JSON.stringify(state, null, 2)); }

(async ()=>{
  const state = load();
  state.companyInvites = state.companyInvites || [];
  state.passwordResets = state.passwordResets || [];
  state.emailVerifications = state.emailVerifications || [];
  if (!state.tokenSecret) { state.tokenSecret = crypto.randomBytes(32).toString('hex'); console.log('Generated tokenSecret'); }
  function hashToken(t){ return crypto.createHmac('sha256', state.tokenSecret || '').update(String(t)).digest('hex'); }

  const smtp = state.smtp;
  if (!smtp || !smtp.host) { console.error('No SMTP configured in data.json (state.smtp)'); process.exit(1); }
  const transporter = nodemailer.createTransport({ host: smtp.host, port: Number(smtp.port), secure: smtp.port === 465, auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined });

  const results = [];

  // find a company owned by testco+owner@example.local or pick first
  let company = (state.companies || []).find(c => c.owner === 'testco+owner@example.local') || (state.companies && state.companies[0]) || null;
  if (!company) {
    company = { id: Date.now(), name: 'TestCo', owner: 'testco+owner@example.local', createdAt: new Date().toISOString() };
    state.companies = state.companies || [];
    state.companies.push(company);
  }

  // create invite
  const invitee = 'invitee1@example.local';
  const newInviteToken = crypto.randomBytes(12).toString('hex');
  const invite = { id: 'invite_' + Date.now(), companyId: company.id, companyName: company.name, inviterEmail: 'testco+owner@example.local', inviteeEmail: invitee, role: 'industry', tokenHash: hashToken(newInviteToken), createdAt: Date.now(), accepted: false, emailSent: false, emailAttempts: [] };
  state.companyInvites.push(invite);
  const inviteMail = { from: smtp.from || 'no-reply@skillbridge.test', to: invitee, subject: `You're invited to join ${company.name} on SkillBridge`, text: `You have been invited by ${invite.inviterEmail} to join ${company.name} on SkillBridge. Use token: ${newInviteToken} to accept at /register or via the Accept Invite flow.` };
  try {
    const info = await transporter.sendMail(inviteMail);
    const preview = nodemailer.getTestMessageUrl(info) || null;
    invite.emailSent = true; invite.emailInfo = info.messageId || null; invite.emailAttempts.unshift({ time: new Date().toISOString(), success: true, info: invite.emailInfo });
    results.push({ type: 'invite', to: invitee, preview, info: invite.emailInfo, token: newInviteToken });
  } catch (e) {
    invite.emailAttempts.unshift({ time: new Date().toISOString(), success: false, error: String(e && e.message ? e.message : e) });
    invite.emailError = String(e && e.message ? e.message : e);
    results.push({ type: 'invite', to: invitee, error: invite.emailError });
  }

  // create password reset for student1@example.local
  const student = 'student1@example.local';
  const newResetToken = crypto.randomBytes(12).toString('hex');
  const reset = { id: 'reset_' + Date.now(), email: student, tokenHash: hashToken(newResetToken), createdAt: Date.now(), expiresAt: Date.now() + 1000 * 60 * 60, emailSent: false, emailAttempts: [] };
  state.passwordResets.push(reset);
  const resetMail = { from: smtp.from || 'no-reply@skillbridge.test', to: student, subject: 'Password reset for SkillBridge', text: `Use this token to reset your password: ${newResetToken} or visit /reset?token=${newResetToken}` };
  try {
    const info2 = await transporter.sendMail(resetMail);
    const preview2 = nodemailer.getTestMessageUrl(info2) || null;
    reset.emailSent = true; reset.emailInfo = info2.messageId || null; reset.emailAttempts.unshift({ time: new Date().toISOString(), success: true, info: reset.emailInfo });
    results.push({ type: 'reset', to: student, preview: preview2, info: reset.emailInfo, token: newResetToken });
  } catch (e) {
    reset.emailAttempts.unshift({ time: new Date().toISOString(), success: false, error: String(e && e.message ? e.message : e) });
    reset.emailError = String(e && e.message ? e.message : e);
    results.push({ type: 'reset', to: student, error: reset.emailError });
  }

  save(state);
  console.log('Sent test messages:');
  for (const r of results) console.log(JSON.stringify(r, null, 2));
  console.log('\nOpen preview URLs in your browser to view the emails.');
})();
