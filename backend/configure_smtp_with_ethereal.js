const nodemailer = require('nodemailer');
const http = require('http');

function req(method, path, body, headers={}){
  return new Promise((resolve,reject)=>{
    const opts = { hostname: 'localhost', port: 3000, path, method, headers: Object.assign({'Content-Type':'application/json'}, headers) };
    const r = http.request(opts, (res)=>{
      let d=''; res.on('data',c=>d+=c); res.on('end', ()=>{ try{ resolve({status: res.statusCode, body: JSON.parse(d||'{}')}); }catch(e){ resolve({status: res.statusCode, body: d}); } });
    });
    r.on('error', err=> reject(err));
    if (body) r.write(JSON.stringify(body)); r.end();
  });
}

(async ()=>{
  try{
    console.log('Creating Ethereal test account...');
    const account = await nodemailer.createTestAccount();
    console.log('Ethereal account:', account.user, account.pass, account.smtp);
    // login as admin
    const login = await req('POST','/api/login', { email: 'testuser@example.com', password: 'Pass123!' });
    console.log('admin login:', login.status);
    if (login.status !== 200) { console.log('Admin login failed, output:', login.body); process.exit(1); }
    const token = login.body && login.body.token;
    // configure smtp
    const smtpConfig = { host: account.smtp.host, port: account.smtp.port, user: account.user, pass: account.pass, from: 'no-reply@skillbridge.test', retries: 3, retryDelayMs: 1000 };
    const res = await req('POST','/api/admin/smtp', smtpConfig, { Authorization: 'Bearer '+token });
    console.log('smtp set:', res.status, res.body);
    console.log('You can view sent messages at Ethereal using the account credentials.');
  } catch (e){ console.error('error', e); process.exit(1); }
})();
