const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname,'data.json');
(async ()=>{
  try{
    console.log('Creating Ethereal test account...');
    const account = await nodemailer.createTestAccount();
    console.log('Account:', account.user, account.pass, account.smtp);
    const raw = fs.readFileSync(dataFile,'utf8');
    const state = JSON.parse(raw || '{}');
    state.smtp = { host: account.smtp.host, port: account.smtp.port, user: account.user, pass: account.pass, from: 'no-reply@skillbridge.test', retries: 3, retryDelayMs: 1000 };
    fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
    console.log('Wrote SMTP config to', dataFile);
  } catch (e){ console.error('err', e); process.exit(1); }
})();
