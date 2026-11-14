export const profileFields={firstName:80,lastName:80,displayName:80,team:100,qualification:100};
export function readProfile(metadata){
 const source=metadata?.taktelio_profile;
 return Object.fromEntries(Object.entries(profileFields).map(([key,max])=>[key,typeof source?.[key]==='string'?source[key].trim().slice(0,max):'']));
}
export function validateProfile(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Bitte gültige Profildaten eingeben.');
 const profile={};
 for(const [key,max] of Object.entries(profileFields)){
  const value=input[key]??'';
  if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f]/.test(value))throw Error('Bitte gültige Profildaten innerhalb der angegebenen Länge eingeben.');
  profile[key]=value.trim();
 }
 if(!profile.firstName||!profile.lastName)throw Error('Bitte Vorname und Nachname eingeben.');
 return profile;
}
export function publicUser(user){return {id:user.id,email:user.email,profile:readProfile(user.user_metadata)}}
export function profileName(user){const p=readProfile(user.user_metadata);return p.displayName||[p.firstName,p.lastName].filter(Boolean).join(' ')}
