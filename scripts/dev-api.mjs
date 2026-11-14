import {api} from '../worker/api.mjs';

// Share the exact server implementation with Vercel. This adapter only bridges
// Vite's Node request/response to Fetch; it is never included in the client bundle.
export function devApi(env){
 return async function middleware(req,res,next){
  if(!req.url?.startsWith('/api/'))return next();
  try{
   const parts=[];let size=0;
   for await(const chunk of req){
    size+=chunk.length;
    if(size>110000){res.writeHead(413,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Anfrage zu groß.'}));return}
    parts.push(chunk);
   }
   const request=new Request(new URL(req.url,'http://'+req.headers.host),{
    method:req.method,headers:req.headers,
    ...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(parts)}:{}),
   });
   const response=await api(request,env);
   res.statusCode=response.status;
   response.headers.forEach((value,key)=>{if(key!=='set-cookie')res.setHeader(key,value)});
   const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);
   res.end(Buffer.from(await response.arrayBuffer()));
  }catch{
   console.error('Taktelio local API request failed');
   res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});
   res.end(JSON.stringify({error:'Dienst momentan nicht erreichbar.'}));
  }
 };
}
