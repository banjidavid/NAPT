'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {validate} = require('./validator');
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 2048;
const rate = new Map();
const windowMs = 60_000;
const maxRequests = 160;
const htmlPath = path.join(__dirname,'index.html');
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
const server = http.createServer(async(req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if(req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try {const body = await fs.readFile(htmlPath);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(body);} catch {res.writeHead(500);res.end('Unable to load game.');}
    return;
  }
  if(req.method === 'GET' && ['/cloud.js','/firebase-config.js'].includes(url.pathname)) {
    try {const content=await fs.readFile(path.join(__dirname,url.pathname.slice(1)));
      res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);
    } catch {json(res,404,{error:'Not found'});}return;
  }
  if(req.method === 'GET' && url.pathname === '/api/health') return json(res,200,{ok:true,mode:'single-player',verification:'online'});
  if(req.method === 'POST' && url.pathname === '/api/validate') {
    const ip = req.socket.remoteAddress || 'unknown', now = Date.now();
    if(rate.size > 10000) rate.clear();
    const bucket = rate.get(ip) || {started:now,count:0};
    if(now-bucket.started > windowMs){bucket.started=now;bucket.count=0;}
    bucket.count++;rate.set(ip,bucket);
    if(bucket.count > maxRequests) return json(res,429,{status:'review',reason:'Too many checks. Try again in one minute.'});
    let body = '';let exceeded = false;
    for await(const chunk of req) {body += chunk;if(Buffer.byteLength(body) > MAX_BODY){exceeded=true;break;}}
    if(exceeded) return json(res,413,{status:'invalid',reason:'Request too large.'});
    let data;try{data=JSON.parse(body);}catch{return json(res,400,{status:'invalid',reason:'Invalid JSON.'});}
    const result = await validate(data);
    return json(res,200,result);
  }
  json(res,404,{error:'Not found'});
});
if(require.main === module) server.listen(PORT,()=>console.log(`NAPT running at http://localhost:${PORT}`));
module.exports=server;
