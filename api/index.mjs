import {api} from '../worker/api.mjs';
export default {
  async fetch(request){
    try{return await api(request,process.env)}
    catch{console.error('Taktelio API request failed');return Response.json({error:'Dienst momentan nicht erreichbar.'},{status:503,headers:{'Cache-Control':'no-store'}})}
  }
};
