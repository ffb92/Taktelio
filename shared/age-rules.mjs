// Age rules for German youth football, based on the DFB competition formats
// introduced nationwide in 2024/25 and the DFB heading recommendations.
// One table drives catalogue selection, the model prompt and plan validation.
// Regional associations may differ in detail; these are the planning guardrails.
export const AGE_GROUPS=['U9','U11','U13','U15','U17 / U19','Senioren'];

export const AGE_RULES={
 'U9':{age:9,level:'F-Jugend',gameFormat:'3 gegen 3, 4 gegen 4 oder 5 gegen 5',maxPlayersPerTeam:5,ballSize:3,heading:'',maxFieldLength:42},
 'U11':{age:11,level:'E-Jugend',gameFormat:'5 gegen 5 oder 7 gegen 7',maxPlayersPerTeam:7,ballSize:4,heading:'',maxFieldLength:58},
 'U13':{age:13,level:'D-Jugend',gameFormat:'7 gegen 7 oder 9 gegen 9',maxPlayersPerTeam:9,ballSize:4,heading:'frühestens ab D-Jugend, nur leichte Bälle, wenige Wiederholungen',maxFieldLength:72},
 'U15':{age:15,level:'C-Jugend',gameFormat:'9 gegen 9 oder 11 gegen 11',maxPlayersPerTeam:11,ballSize:5,heading:'nur mit leichten Bällen, wenige Wiederholungen',maxFieldLength:105},
 'U17 / U19':{age:17,level:'B-/A-Jugend',gameFormat:'11 gegen 11',maxPlayersPerTeam:11,ballSize:5,heading:'kontrolliert und mit leichten Bällen',maxFieldLength:105},
 'Senioren':{age:18,level:'Erwachsene',gameFormat:'11 gegen 11',maxPlayersPerTeam:11,ballSize:5,heading:'erlaubt, Technik sauber vermitteln',maxFieldLength:105},
};

export function ageRule(age){return typeof age==='string'&&Object.hasOwn(AGE_RULES,age)?AGE_RULES[age]:null}

const number=text=>Number(String(text).replace(',','.'));
const headingPattern=/kopfball|kopfst(?:o|ö)(?:ß|ss)|k(?:o|ö)pfen/i;

// Ball sizes are only read from sentences that talk about balls, so cone or goal sizes are ignored.
export function mentionedBallSizes(text){
 const sizes=[];
 for(const sentence of String(text||'').split(/[.;,\n•]/)){
  if(!/b(?:all|äll)/i.test(sentence))continue;
  for(const match of sentence.matchAll(/gr(?:ö|oe)(?:ß|ss)e\s*(\d+)|gr\.?\s*(\d+)\b/gi))sizes.push(Number(match[1]||match[2]));
 }
 return sizes.filter(Number.isFinite);
}

// Reads metre values from field descriptions such as "24 × 18 m" or "Dreieck mit 10 m Seitenlänge".
export function fieldLengths(text){
 const source=String(text||''),values=[],spans=[];
 for(const match of source.matchAll(/(\d+(?:[.,]\d+)?)\s*[×xX*]\s*(\d+(?:[.,]\d+)?)\s*(?:m|meter)\b/gi)){
  values.push(number(match[1]),number(match[2]));spans.push([match.index,match.index+match[0].length]);
 }
 for(const match of source.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:m|meter)\b/gi)){
  if(spans.some(([start,end])=>match.index>=start&&match.index<end))continue;
  values.push(number(match[1]));
 }
 return values.filter(Number.isFinite);
}

// Team sizes are read from "4 gegen 4" and similar wording.
export function mentionedFormats(text){
 const formats=[];
 for(const match of String(text||'').matchAll(/(\d+)\s*(?:gegen|gg\.?|vs\.?)\s*(\d+)/gi))formats.push([Number(match[1]),Number(match[2])]);
 return formats;
}

// Checks one generated block against the age rules and returns machine-readable issue codes.
export function blockRuleIssues(block,rule){
 if(!rule||!block||typeof block!=='object')return [];
 const issues=[];
 const text=[block.title,block.organization,block.fieldSize,block.materials,...(block.steps||[]),...(block.coaching||[])].join(' ');
 if(!rule.heading&&headingPattern.test(text))issues.push('heading');
 if(Math.max(0,...mentionedBallSizes(text))>rule.ballSize)issues.push('ball');
 if(Math.max(0,...fieldLengths(block.fieldSize))>rule.maxFieldLength)issues.push('field');
 if(block.phase==='Spielform'&&mentionedFormats(text).some(teams=>teams.some(n=>n>rule.maxPlayersPerTeam)))issues.push('game_format');
 return issues;
}

export function ruleSummary(rule){
 if(!rule)return '';
 return `Spielform ${rule.gameFormat}. Ballgröße ${rule.ballSize}. ${rule.heading?`Kopfball ${rule.heading}.`:'Kein Kopfballtraining.'} Feld höchstens ${rule.maxFieldLength} m lang. Gruppen pro Feld entsprechend kleiner als im Wettbewerb.`;
}
