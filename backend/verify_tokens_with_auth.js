const http = require('http');

function req(method, path, body, token){
  return new Promise((resolve,reject)=>{
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { hostname: 'localhost', port: 3000, path, method, headers };
    const r = http.request(opts, (res)=>{
      let d=''; res.on('data', c=>d+=c); res.on('end', ()=>{
        try { resolve({ status: res.statusCode, body: JSON.parse(d || '{}') }); } catch(e){ resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', err=> reject(err));
    if (body) r.write(JSON.stringify(body)); r.end();
  });
}

(async ()=>{
  try{
    // login as built-in admin (authUser)
    const login = await req('POST','/api/login',{ email: 'arjun@skillbridge.ai', password: 'skillbridge' });
    console.log('admin login:', login.status, login.body && login.body.token ? 'token received' : login.body);
    const adminToken = login.body && login.body.token;
    if (!adminToken) { console.error('Failed to get admin token'); process.exit(1); }

    const inviteToken = 'bad04bb053f3afd8f48ab98e';
    const inviteEmail = 'invitee1@example.local';
    console.log('Calling invite accept as admin...');
    const inv = await req('POST','/api/company/invite/accept',{ token: inviteToken, email: inviteEmail }, adminToken);
    console.log('Invite accept response:', inv.status, inv.body);

    const resetToken = '27a63084eb4f90cddf5e71f7';
    const newPassword = 'VerifiedPass!234';
    console.log('Calling password reset as admin...');
    const rst = await req('POST','/api/auth/reset',{ token: resetToken, password: newPassword }, adminToken);
    console.log('Password reset response:', rst.status, rst.body);

    if (rst.status === 200) {
      console.log('Attempting login with new password...');
      const lg = await req('POST','/api/login',{ email: 'student1@example.local', password: newPassword });
      console.log('Login after reset:', lg.status, lg.body);
    }

    console.log('Auth verification complete');
  } catch (e) { console.error('Error during auth verification:', e); process.exit(1); }
})();
