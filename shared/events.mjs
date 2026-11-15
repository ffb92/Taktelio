// Gemeinsamer Datenvertrag für Termine und Rückmeldungen.
// Der Server prüft jede Eingabe erneut; der Client nutzt dieselben Grenzen für
// sofortige Rückmeldung im Formular.

export const EVENT_KINDS=['training','match','other'];
export const RESPONSE_STATUSES=['accepted','declined','maybe'];
export const TEAM_ROLES=['coach','player'];
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const CONTROL=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function isUuid(value){return typeof value==='string'&&UUID.test(value)}

export function cleanText(value,max){
 if(typeof value!=='string'||value.length>max||CONTROL.test(value))return null;
 return value.trim();
}

// Akzeptiert ISO-Zeitstempel und gibt sie normalisiert zurück. Die Grenzen
// verhindern Tippfehler wie "20266" und extrem große Werte.
export function isoInstant(value){
 if(typeof value!=='string'||value.length>40)return null;
 const time=Date.parse(value);
 if(!Number.isFinite(time))return null;
 if(time<Date.parse('2000-01-01T00:00:00Z')||time>Date.parse('2100-01-01T00:00:00Z'))return null;
 return new Date(time).toISOString();
}

export function validTeamName(value){
 const name=cleanText(value,80);
 return name&&name.length>=2?name:null;
}

// Liefert die normalisierten Termindaten oder null. Optionale Felder werden
// bewusst auf null gesetzt, damit der Aufrufer keine gemischten Typen speichert.
export function validEventInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 if(!isUuid(input.teamId))return null;
 const kind=input.kind===undefined?'training':input.kind;
 if(!EVENT_KINDS.includes(kind))return null;
 const title=cleanText(input.title,120);
 if(!title)return null;
 const startsAt=isoInstant(input.startsAt);
 if(!startsAt)return null;
 const endsAt=input.endsAt?isoInstant(input.endsAt):null;
 if(input.endsAt&&!endsAt)return null;
 if(endsAt&&Date.parse(endsAt)<=Date.parse(startsAt))return null;
 const meetAt=input.meetAt?isoInstant(input.meetAt):null;
 if(input.meetAt&&!meetAt)return null;
 if(meetAt&&Date.parse(meetAt)>Date.parse(startsAt))return null;
 const responseDeadline=input.responseDeadline?isoInstant(input.responseDeadline):null;
 if(input.responseDeadline&&!responseDeadline)return null;
 if(responseDeadline&&Date.parse(responseDeadline)>Date.parse(startsAt))return null;
 const location=cleanText(input.location??'',200);
 if(location===null)return null;
 const notes=cleanText(input.notes??'',2000);
 if(notes===null)return null;
 return {teamId:input.teamId,kind,title,startsAt,endsAt,meetAt,responseDeadline,location,notes};
}

export function validResponse(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 if(!isUuid(input.eventId))return null;
 if(!RESPONSE_STATUSES.includes(input.status))return null;
 const note=cleanText(input.note??'',500);
 if(note===null)return null;
 return {eventId:input.eventId,status:input.status,note};
}

export const EVENT_KIND_LABELS={training:'Training',match:'Spiel',other:'Termin'};
export const RESPONSE_LABELS={accepted:'Zugesagt',declined:'Abgesagt',maybe:'Vielleicht'};
