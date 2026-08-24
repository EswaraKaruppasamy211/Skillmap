const http = require('http');
function req(method,path,body,token){return new Promise((res,rej)=>{const headers={'Content-Type':'application/json'}; if(token) headers['Authorization']='Bearer '+token; const opts={hostname:'localhost',port:3000,path,method,headers}; const r=http.request(opts,(resp)=>{let d=''; resp.on('data',c=>d+=c); resp.on('end',()=>{try{res({status:resp.statusCode,body:JSON.parse(d||'{}')});}catch(e){res({status:resp.statusCode,body:d});}});}); r.on('error',err=>rej(err)); if(body) r.write(JSON.stringify(body)); r.end();});}
(async ()=>{
 try{
   const login = await req('POST','/api/login',{email:'arjun@skillbridge.ai',password:'skillbridge'});
   const token = login.body && login.body.token; console.log('login',login.status);
   const invites = await req('GET','/api/company/invites',null,token);
   console.log('/api/company/invites', invites.status, invites.body);
 }catch(e){console.error(e)}
})();
