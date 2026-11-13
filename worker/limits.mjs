import {cloudContext,cloudQuery} from './storage.mjs';
export const LIMIT_MESSAGES={quota:'Das monatliche KI-Kontingent deines Vereins ist aufgebraucht.',budget:'Das KI-Budget der Pilotphase ist ausgeschöpft. Gespeicherte Inhalte bleiben verfügbar.',rate:'Bitte kurz warten. Maximal drei KI-Starts pro Minute sind möglich.',running:'Für dich läuft bereits eine Generierung. Bitte warte kurz.',disabled:'KI ist für diesen Verein derzeit deaktiviert.',unavailable:'Die KI-Budgetprüfung ist gerade nicht verfügbar. Es wurde keine neue KI-Anfrage gestartet.',conflict:'Diese Anfragekennung gehört zu einer anderen Anfrage.',already_finished:'Diese Anfrage wurde bereits beendet. Bei einem unklaren Ausgang wird sie nicht erneut ausgeführt.',forbidden:'Kein Zugriff auf diesen Verein.',invalid:'Ungültige KI-Anfrage.'};
export async function limitGate(request,env,action,id=null,fingerprint=null,details={}){
 if(!env.AI_LIMIT_SECRET)throw Error(LIMIT_MESSAGES.unavailable);
 const ctx=await cloudContext(request);
 return cloudQuery(ctx,'rpc/ai_gate','POST',{action,wid:ctx.workspaceId,rid:id,fingerprint,gate_secret:env.AI_LIMIT_SECRET,details});
}
export function usageCost(usage){
 if(!Number.isSafeInteger(usage?.input_tokens)||!Number.isSafeInteger(usage?.output_tokens)||usage.input_tokens<0||usage.output_tokens<0)return null;
 // USD per million tokens = micro-USD per token. Cached input is conservatively billed at full input price.
 return {cost_microusd:Math.ceil(usage.input_tokens*0.4+usage.output_tokens*1.6),input_tokens:usage.input_tokens,output_tokens:usage.output_tokens};
}
export async function requestFingerprint(body){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body))))).map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function aiStatus(request,env){
 if(!env.OPENAI_API_KEY||!env.AI_MODEL)return {ready:false,message:'KI-Zugang noch nicht eingerichtet.'};
 if(env.AI_MODEL!=='gpt-4.1-mini')return {ready:false,message:'Für dieses Modell ist noch keine Kostenregel freigegeben.'};
 try{const quota=await limitGate(request,env,'status');if(quota.code!=='ok')return {ready:false,message:LIMIT_MESSAGES[quota.code]||LIMIT_MESSAGES.unavailable};
 const reset=new Date(quota.reset_at).toLocaleDateString('de-DE',{timeZone:'UTC'});
 return {ready:quota.available,quota,message:`${quota.used} von ${quota.limit} KI-Generierungen verwendet${quota.reserved?' · '+quota.reserved+' in Bearbeitung':''}. Neues Kontingent ab ${reset}.`+(quota.reason?' '+LIMIT_MESSAGES[quota.reason]:'')};
 }catch{return {ready:false,message:LIMIT_MESSAGES.unavailable};}
}
