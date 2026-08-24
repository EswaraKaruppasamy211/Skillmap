const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const p = path.join(__dirname,'data.json');
let state = JSON.parse(fs.readFileSync(p,'utf8'));
const email = 'invitee1@example.local';
const inv = (state.companyInvites || []).find(i => i.inviteeEmail === email && !i.accepted);
if (!inv) { console.error('Invite not found or already accepted'); process.exit(1); }
inv.accepted = true; inv.acceptedAt = Date.now();
// ensure user exists
state.users = state.users || [];
let user = state.users.find(u => (u.email||'').toLowerCase() === email);
if (!user) {
  const salt = crypto.randomBytes(8).toString('hex');
  const pwd = crypto.randomBytes(6).toString('hex');
  const hash = crypto.scryptSync(pwd, salt, 64).toString('hex');
  user = { email, name: email.split('@')[0], salt, passwordHash: hash, role: inv.role || 'industry', companyId: inv.companyId };
  state.users.push(user);
  console.log('Created lightweight user with random password (not printed for security)');
} else {
  user.companyId = inv.companyId;
  user.role = inv.role || user.role || 'industry';
}
state.usersData = state.usersData || {};
state.usersData[email] = state.usersData[email] || { profile: { name: user.name, email }, goal: null };
state.usersData[email].company = { id: inv.companyId, name: inv.companyName };
fs.writeFileSync(p, JSON.stringify(state, null, 2));
console.log('Marked invite accepted and updated data.json');
