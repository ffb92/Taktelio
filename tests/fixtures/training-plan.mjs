export const criteria={age:'U11',players:12,minutes:60,goal:'Passen',material:'Bälle',space:'Platz',notes:''};
const block={sourceExerciseId:'',title:'Passspiel',phase:'Hauptteil',minutes:30,groups:[6,6],organization:'Zwei Felder',materials:'Bälle',fieldSize:'20 x 20 m',steps:['Passen und freilaufen'],coaching:['Anbieten'],easier:'Mehr Raum',harder:'Weniger Kontakte',diagram:{caption:'Sechs Personen pro Feld',objects:[],arrows:[]}};
export function trainingRecord(){return structuredClone({criteria,mode:'hybrid',plan:{title:'Training',summary:'Gemeinsam passen',blocks:[block,block]}})}
