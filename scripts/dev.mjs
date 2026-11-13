import http from 'node:http';
import {spawnSync} from 'node:child_process';
spawnSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
const {default:worker}=await import('../dist/server/index.js');
http.createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const url='https://'+(req.headers['x-forwarded-host']||req.headers.host)+req.url;const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const response=await worker.fetch(request,{});res.statusCode=response.status;for(const [k,v]of response.headers)if(k!=='set-cookie')res.setHeader(k,v);const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);res.end(Buffer.from(await response.arrayBuffer()))}catch{res.writeHead(500);res.end('Preview error')}}).listen(Number(process.argv[process.argv.indexOf('--port')+1]||process.env.PORT||3000),'0.0.0.0');
