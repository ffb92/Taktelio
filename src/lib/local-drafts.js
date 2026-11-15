export const LOCAL_DRAFTS_KEY='taktelio-ai-plans';
export function loadLocalDrafts(){
  try{
    const records=JSON.parse(localStorage.getItem(LOCAL_DRAFTS_KEY)||'[]');
    return Array.isArray(records)?records:[];
  }catch{return []}
}
