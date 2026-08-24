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

  const results = { invites: [], resets: [], verifs: [] };

  // process invites
  for (const inv of state.companyInvites) {
    try {
      const newToken = crypto.randomBytes(12).toString('hex');
      inv.tokenHash = hashToken(newToken);
      inv.emailSent = false; inv.emailError = null;
      inv.emailAttempts = inv.emailAttempts || [];
      const mailOpts = { from: smtp.from || 'no-reply@skillbridge.test', to: inv.inviteeEmail, subject: `You're invited to join ${inv.companyName} on SkillBridge`, text: `You have been invited by ${inv.inviterEmail} to join ${inv.companyName} on SkillBridge. Use token: ${newToken} to accept at /register or via the Accept Invite flow.` };
      const info = await transporter.sendMail(mailOpts);
      const preview = nodemailer.getTestMessageUrl(info) || null;
      inv.emailSent = true; inv.emailInfo = info.messageId || null; inv.emailAttempts.unshift({ time: new Date().toISOString(), success: true, info: inv.emailInfo });
      results.invites.push({ inviteId: inv.id, to: inv.inviteeEmail, preview, info: inv.emailInfo });
    } catch (e) {
      inv.emailAttempts = inv.emailAttempts || [];
      inv.emailAttempts.unshift({ time: new Date().toISOString(), success: false, error: String(e && e.message ? e.message : e) });
      inv.emailError = String(e && e.message ? e.message : e);
      results.invites.push({ inviteId: inv.id, to: inv.inviteeEmail, error: inv.emailError });
    }
  }

  // process resets
  for (const r of state.passwordResets) {
    try {
      const newToken = crypto.randomBytes(12).toString('hex');
      r.tokenHash = hashToken(newToken);
      r.emailSent = false; r.emailError = null; r.emailAttempts = r.emailAttempts || [];
      const mailOpts = { from: smtp.from || 'no-reply@skillbridge.test', to: r.email, subject: 'Password reset for SkillBridge', text: `Use this token to reset your password: ${newToken} or visit /reset?token=${newToken}` };
      const info = await transporter.sendMail(mailOpts);
      const preview = nodemailer.getTestMessageUrl(info) || null;
      r.emailSent = true; r.emailInfo = info.messageId || null; r.emailAttempts.unshift({ time: new Date().toISOString(), success: true, info: r.emailInfo });
      results.resets.push({ resetId: r.id, to: r.email, preview, info: r.emailInfo });
    } catch (e) {
      r.emailAttempts = r.emailAttempts || [];
      r.emailAttempts.unshift({ time: new Date().toISOString(), success: false, error: String(e && e.message ? e.message : e) });
      r.emailError = String(e && e.message ? e.message : e);
      results.resets.push({ resetId: r.id, to: r.email, error: r.emailError });
    }
  }

  // process verifications
  for (const v of state.emailVerifications) {
    try {
      const newToken = crypto.randomBytes(12).toString('hex');
      v.tokenHash = hashToken(newToken);
      v.emailSent = false; v.emailError = null; v.emailAttempts = v.emailAttempts || [];
      const mailOpts = { from: smtp.from || 'no-reply@skillbridge.test', to: v.email, subject: `Verify your SkillBridge account`, text: `Welcome, please verify your email using token: ${newToken} or visit /verify?token=${newToken}` };
      const info = await transporter.sendMail(mailOpts);
      const preview = nodemailer.getTestMessageUrl(info) || null;
      v.emailSent = true; v.emailInfo = info.messageId || null; v.emailAttempts.unshift({ time: new Date().toISOString(), success: true, info: v.emailInfo });
      results.verifs.push({ verifyId: v.id, to: v.email, preview, info: v.emailInfo });
    } catch (e) {
      v.emailAttempts = v.emailAttempts || [];
      v.emailAttempts.unshift({ time: new Date().toISOString(), success: false, error: String(e && e.message ? e.message : e) });
      v.emailError = String(e && e.message ? e.message : e);
      results.verifs.push({ verifyId: v.id, to: v.email, error: v.emailError });
    }
  }

  save(state);
  console.log('Results:', JSON.stringify(results, null, 2));
  console.log('\nNote: open the preview URLs in your browser to view the sent emails (Ethereal preview).');
})();
