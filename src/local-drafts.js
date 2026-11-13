const LOCAL_DRAFTS_KEY='taktelio-ai-plans';
function loadLocalDrafts(){
  try{
    const current=localStorage.getItem(LOCAL_DRAFTS_KEY);
    // Compatibility only: preserve drafts created before the Taktelio rename.
    const legacyKey='sc27-ai-plans';
    const raw=current===null?localStorage.getItem(legacyKey):current;
    const records=JSON.parse(raw||'[]');
    if(!Array.isArray(records))return [];
    if(current===null&&raw!==null){
      try{
        localStorage.setItem(LOCAL_DRAFTS_KEY,raw);
        localStorage.removeItem(legacyKey);
      }catch{} // Quota/privacy errors must never destroy the old drafts.
    }
    return records;
  }catch{return []}
}
