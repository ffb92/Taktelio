export const string={type:'string',minLength:1,maxLength:2000};
const array=(items,min=1,max=20)=>({type:'array',items,minItems:min,maxItems:max});
export const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const integer=(min,max)=>({type:'integer',minimum:min,maximum:max});
const point=object({x:integer(0,100),y:integer(0,100),label:{type:'string',maxLength:20},kind:{type:'string',enum:['player','cone','goal','ball']},team:integer(0,2)});
// Fields of a block that older saved plans do not contain. They stay optional so
// a stored unit remains readable; the model is still required to supply them.
const block=object({sourceExerciseId:{type:'string',maxLength:40},title:string,phase:{type:'string',enum:['Einstieg','Hauptteil','Spielform','Pause','Abschluss']},minutes:integer(1,120),groups:array(integer(1,24),1,24),organization:string,materials:string,fieldSize:string,steps:array(string,1,8),coaching:array(string,1,5),easier:string,harder:string,diagram:object({caption:string,objects:array(point,0,60),arrows:array(object({x1:integer(0,100),y1:integer(0,100),x2:integer(0,100),y2:integer(0,100),kind:{type:'string',enum:['pass','run']}}),0,20)})});
const optionalBlock={intensity:{type:'string',enum:['niedrig','mittel','hoch']},workRest:{type:'string',minLength:3,maxLength:300},netPlayingMinutes:integer(0,120)};
block.properties={...block.properties,...optionalBlock};
export const schema=object({title:string,summary:string,blocks:array(block,2,12)});
export function matches(v,s){if(s.type==='object')return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>Object.hasOwn(s.properties,k)&&matches(v[k],s.properties[k]))&&s.required.every(k=>Object.hasOwn(v,k));if(s.type==='array')return Array.isArray(v)&&v.length>=s.minItems&&v.length<=s.maxItems&&v.every(x=>matches(x,s.items));if(s.type==='integer')return Number.isInteger(v)&&v>=s.minimum&&v<=s.maximum;if(s.type==='string')return typeof v==='string'&&v.length>=(s.minLength||0)&&v.length<=(s.maxLength||Infinity)&&(!s.enum||s.enum.includes(v));return false}
export function validatePlan(p,c){return matches(p,schema)&&p.blocks.reduce((n,b)=>n+b.minutes,0)===c.minutes&&p.blocks.every(b=>b.groups.reduce((a,n)=>a+n,0)===c.players)}

export function validCriteria(c){
 return !!c && typeof c==='object' && !Array.isArray(c)
  && Number.isInteger(c.players) && c.players>=6 && c.players<=24
  && Number.isInteger(c.minutes) && c.minutes>=30 && c.minutes<=120
  && ['U9','U11','U13','U15','U17 / U19','Senioren'].includes(c.age)
  && ['goal','material','space','notes'].every(k=>typeof c[k]==='string' && c[k].length<=1000);
}
// Only fill fields absent from legacy records; never repair invalid training content.
export function normalizeRecord(record){
 if(!record || typeof record!=='object' || Array.isArray(record))return null;
 const plan=record.plan;
 if(!plan || !Array.isArray(plan.blocks))return null;
 const normalized={...record,mode:record.mode===undefined?'hybrid':record.mode,plan:{...plan,blocks:plan.blocks.map(b=>b && typeof b==='object' && !Array.isArray(b)?{...b,sourceExerciseId:b.sourceExerciseId===undefined?'':b.sourceExerciseId}:b)}};
 return validCriteria(normalized.criteria) && ['hybrid','library','new'].includes(normalized.mode) && validatePlan(normalized.plan,normalized.criteria)?normalized:null;
}
