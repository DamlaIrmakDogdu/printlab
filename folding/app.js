'use strict';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,xy=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t)],fmt=v=>+v.toFixed(1),pt=p=>p.map(fmt).join(','),ease=t=>t*t*(3-2*t);
function el(tag,attrs={},root){const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(root)root.appendChild(n);return n;}
function text(s,x,y,root,attrs={}){const n=el('text',{x,y,fill:'#6c8499','font-size':12,'font-family':'system-ui',...attrs},root);n.textContent=s;return n;}
const presets={
 half:{name:'Half fold',plates:[0],fractions:[.5],description:'One active plate folds the sheet in half. Follow the other three plates as they bypass.'},
 z:{name:'Z-fold',plates:[0,1],fractions:[1/3,1/3],description:'Two consecutive plates fold in opposite directions, producing three accordion panels.'},
 letter:{name:'Letter / roll fold',plates:[0,2],fractions:[1/3,1/3],description:'Use the two upper plates, bypassing plate 2. Two folds in the same direction wrap one panel inside.'},
 double:{name:'Double parallel fold',plates:[0,2],fractions:[.5,.25],description:'Fold the sheet in half, then halve that packet. The second operation creases two layers.'},
 accordion4:{name:'Four-panel accordion',plates:[0,1,2],fractions:[.25,.25,.25],description:'Three alternating plates create four equal panels and three alternating folds.'},
 accordion5:{name:'Five-panel accordion',plates:[0,1,2,3],fractions:[.2,.2,.2,.2],description:'All four plates work in sequence, creating five equal accordion panels.'},
 custom:{name:'Custom fold',description:'Experiment with the stops and bypasses. A stop beyond the entering packet cannot create a fold.'}
};
const stations=[
 {mouth:[595,217],tip:[419,41],entry:[650,205],nip:[580,275],label:[427,78]},
 {mouth:[565,322],tip:[742,499],entry:[580,275],nip:[510,345],label:[717,433]},
 {mouth:[455,352],tip:[279,176],entry:[510,345],nip:[440,415],label:[286,215]},
 {mouth:[428,460],tip:[605,637],entry:[440,415],nip:[370,485],label:[568,590]}
];
const rollers=[[790,135],[790,275],[650,135],[650,275],[510,275],[510,415],[370,415],[370,555],[230,415],[230,555]];
const ROLLER_RADIUS=66,CONTACT_RADIUS=70;
const wrapCenters=[rollers[3],rollers[4],rollers[5],rollers[6]];
let length=420,choice='z',units=[],result,segments=[],duration=0,t=0,playing=false,last=null,speed=1,follow=false,raf=0,currentPhase=-1;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let rotations=[],plateGroups=[],stopPoints=[],paperPath,paperInner,pulse;
const PAPER_SCALE=.95; // One scale for every material point, at every station.
let motionStations=[],backbone,materialSamples=[];
// Bottom-to-top ordered strips; material coordinates s preserve the original sheet.
function calculate(L,settings){
 let layers=[{s0:0,s1:L,x0:0,x1:L,face:'A'}],creases=[],records=[];
 settings.forEach((u,i)=>{
 const span=Math.max(...layers.flatMap(l=>[l.x0,l.x1]));
 const valid=u.on&&u.mm>.5&&u.mm<span-.5;records.push({span,valid,before:layers.map(l=>({...l}))});
 if(!valid)return;
 const near=[],far=[];
 for(const l of layers){
  const points=[{s:l.s0,x:l.x0}];
  if((l.x0-u.mm)*(l.x1-u.mm)<-1e-8){const s=mix(l.s0,l.s1,(u.mm-l.x0)/(l.x1-l.x0));points.push({s,x:u.mm});creases.push(s);}
  points.push({s:l.s1,x:l.x1});
  for(let j=0;j<points.length-1;j++){
   const a=points[j],b=points[j+1],isNear=(a.x+b.x)/2<u.mm;
   const piece={s0:a.s,s1:b.s,x0:Math.abs(a.x-u.mm),x1:Math.abs(b.x-u.mm),face:isNear?(l.face==='A'?'B':'A'):l.face};
   (isNear?near:far).push(piece);
  }
 }
 near.reverse();layers=i%2===0?[...far,...near]:[...near,...far];
 });
 creases=[...new Set(creases.map(x=>+x.toFixed(6)))].sort((a,b)=>a-b);
 return {layers,creases,records,span:Math.max(...layers.flatMap(l=>[l.x0,l.x1])),count:records.filter(r=>r.valid).length};
}
function stopAt(i){
 const s=stations[i],route=makeRoute([s.nip,s.mouth,s.tip],wrapCenters[i]);
 return route.at(units[i].mm*PAPER_SCALE);
}
function drawMachine(){
 $('hardware').replaceChildren();$('annotations').replaceChildren();$('paper').replaceChildren();rotations=[];plateGroups=[];stopPoints=[];
 const root=$('hardware'),labels=$('annotations');
 stations.forEach((s,i)=>{
  const active=result.records[i].valid,g=el('g',{opacity:active?1:.38},root);plateGroups.push(g);
  const d=[s.tip[0]-s.mouth[0],s.tip[1]-s.mouth[1]],n=[-d[1]/Math.hypot(...d),d[0]/Math.hypot(...d)];
  for(const sign of [-1,1]){const a=[s.mouth[0]+n[0]*10*sign,s.mouth[1]+n[1]*10*sign],b=[s.tip[0]+n[0]*10*sign,s.tip[1]+n[1]*10*sign];el('path',{d:`M${pt(a)}L${pt(b)}`,stroke:'#a99ab8','stroke-width':9,'stroke-linecap':'round'},g);el('path',{d:`M${pt(a)}L${pt(b)}`,stroke:'#e6dfed','stroke-width':4},g);}
  const p=stopAt(i);stopPoints.push(p);el('path',{d:`M${pt([p[0]+n[0]*21,p[1]+n[1]*21])}L${pt([p[0]-n[0]*21,p[1]-n[1]*21])}`,stroke:'#d49a44','stroke-width':12,'stroke-linecap':'square'},g);el('path',{d:`M${pt([p[0]+n[0]*18,p[1]+n[1]*18])}L${pt([p[0]-n[0]*18,p[1]-n[1]*18])}`,stroke:'#f9d399','stroke-width':5},g);
  if(!active)el('path',{d:`M${pt(xy(s.entry,s.mouth,.7))}Q${pt(s.mouth)} ${pt(xy(s.mouth,s.nip,.7))}`,fill:'none',stroke:'#8497a9','stroke-width':7,'stroke-linecap':'round'},root);
  el('circle',{cx:s.label[0],cy:s.label[1],r:15,fill:active?'#e7f1fa':'#edf0f3',stroke:active?'#a4c3dc':'#c9d3dc'},labels);text(i+1,s.label[0],s.label[1]+4,labels,{'text-anchor':'middle',fill:'#487b9f','font-weight':700});text(active?`${fmt(units[i].mm)} mm`:'BYPASS',s.label[0],s.label[1]+32,labels,{'text-anchor':'middle','font-size':10});
 });
 rollers.forEach(([x,y],i)=>{
  el('circle',{cx:x,cy:y,r:ROLLER_RADIUS,fill:'#f4f7fa',stroke:'#9dacba','stroke-width':2},root);
  el('circle',{cx:x,cy:y,r:54,fill:'none',stroke:'#d5dee7','stroke-width':1},root);
  const dir=i%2===0?1:-1;
  const g=el('g',{},root);rotations.push({g,x,y,dir});
  el('path',{d:`M${x-45},${y}H${x+45}M${x},${y-45}V${y+45}`,stroke:'#abb9c6','stroke-width':1,'stroke-dasharray':'8 5'},g);
  // SVG positive rotation is clockwise. Use the animation's own direction
  // for both the arc sweep and its tangent-aligned arrowhead.
  const start=dir>0?.35:Math.PI-.35,end=dir>0?Math.PI-.35:.35;
  const a=[x+42*Math.cos(start),y+42*Math.sin(start)],b=[x+42*Math.cos(end),y+42*Math.sin(end)];
  const tangent=[-Math.sin(end)*dir,Math.cos(end)*dir],normal=[-tangent[1],tangent[0]];
  const wing=side=>[b[0]-9*tangent[0]+side*4*normal[0],b[1]-9*tangent[1]+side*4*normal[1]];
  el('path',{d:`M${pt(a)}A42,42 0 0 ${dir>0?1:0} ${pt(b)}M${pt(wing(-1))}L${pt(b)}L${pt(wing(1))}`,fill:'none',stroke:'#7891a7','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'},g);
  el('circle',{cx:x,cy:y,r:i<2||i>7?28:6,fill:i<2||i>7?'#d0e5f5':'#e1e9f0',stroke:'#96aebf','stroke-width':1.5},root);
 });
 text('SHEET IN',890,174,labels,{'font-size':11,'letter-spacing':1});el('path',{d:'M948 193H865l12-6m-12 6 12 6',stroke:'#7e9bb2',fill:'none','stroke-width':2},labels);
 text('DELIVERY',83,510,labels,{'font-size':11,'letter-spacing':1});text('Cutting shafts',831,326,labels,{'font-size':11});text('Folding rollers',81,301,labels,{'font-size':13});el('path',{d:'M183 306L314 380',stroke:'#a9bac8',fill:'none'},labels);
 paperPath=el('path',{fill:'none',stroke:'#246fa5','stroke-width':7,'stroke-linecap':'round','stroke-linejoin':'round'},$('paper'));
 paperInner=el('path',{fill:'none',stroke:'#83d1ec','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'},$('paper'));
 pulse=el('circle',{r:10,fill:'#efb458',opacity:0},$('paper'));$('annotations').style.display=$('labels').checked?'':'none';
}
// Geometry is parameterised by physical travel distance, never by arbitrary
// point-to-point morphing. Folded strips retain their original material lengths.
function linePart(a,b){
 const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
 return {kind:'line',length,at:d=>xy(a,b,d/length),angle:()=>Math.atan2(b[1]-a[1],b[0]-a[0])};
}
function arcPart(center,radius,start,sweep){
 const length=radius*Math.abs(sweep),dir=Math.sign(sweep);
 return {kind:'arc',center,radius,start,sweep,length,
  at:d=>{const a=start+dir*d/radius;return [center[0]+radius*Math.cos(a),center[1]+radius*Math.sin(a)];},
  angle:d=>start+dir*d/radius+dir*Math.PI/2};
}
function compoundRoute(parts){
 parts=parts.filter(p=>p.length>1e-8);
 const distances=[0];parts.forEach(p=>distances.push(distances.at(-1)+p.length));
 function index(d){let lo=0,hi=parts.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(distances[mid+1]<d)lo=mid+1;else hi=mid;}return lo;}
 return {parts,distances,length:distances.at(-1),
  at(d){const i=index(d);return parts[i].at(d-distances[i]);},
  angle(d){const i=index(d);return parts[i].angle(d-distances[i]);}};
}
function surfaceLink(a,b,center){
 const direct=linePart(a,b);if(!center||direct.length<1e-8)return [direct];
 const v=[b[0]-a[0],b[1]-a[1]],f=clamp(((center[0]-a[0])*v[0]+(center[1]-a[1])*v[1])/(direct.length**2));
 const closest=xy(a,b,f);
 if(Math.hypot(closest[0]-center[0],closest[1]-center[1])>=CONTACT_RADIUS-1e-7)return [direct];
 const da=Math.hypot(a[0]-center[0],a[1]-center[1]),db=Math.hypot(b[0]-center[0],b[1]-center[1]);
 const aa=Math.atan2(a[1]-center[1],a[0]-center[0]),ab=Math.atan2(b[1]-center[1],b[0]-center[0]);
 const alpha=Math.acos(clamp(CONTACT_RADIUS/da,-1,1)),beta=Math.acos(clamp(CONTACT_RADIUS/db,-1,1));
 // Two tangent–arc–tangent routes exist. Use the shorter exterior route.
 const candidates=[-1,1].map(dir=>{
  const start=aa+dir*alpha,end=ab-dir*beta;
  const sweep=dir*((dir*(end-start)%(2*Math.PI)+2*Math.PI)%(2*Math.PI));
  const arc=arcPart(center,CONTACT_RADIUS,start,sweep);
  const ta=arc.at(0),tb=arc.at(arc.length);
  return [linePart(a,ta),arc,linePart(tb,b)].filter(p=>p.length>1e-7);
 });
 return candidates.reduce((a,b)=>a.reduce((n,p)=>n+p.length,0)<=b.reduce((n,p)=>n+p.length,0)?a:b);
}
function makeRoute(points,center=null){
 const parts=[];for(let i=1;i<points.length;i++)parts.push(...surfaceLink(points[i-1],points[i],center));
 return compoundRoute(parts);
}
function backwardRoute(index){return makeRoute([stations[index].nip,stations[index].entry],wrapCenters[index]);}
function buildTimeline(){
 segments=[];duration=0;
 backbone=compoundRoute([
  linePart([1250,205],stations[0].entry),
  arcPart(wrapCenters[0],CONTACT_RADIUS,-Math.PI/2,-Math.PI/2),
  arcPart(wrapCenters[1],CONTACT_RADIUS,0,Math.PI/2),
  arcPart(wrapCenters[2],CONTACT_RADIUS,-Math.PI/2,-Math.PI/2),
  arcPart(wrapCenters[3],CONTACT_RADIUS,0,Math.PI/2),
  linePart(stations[3].nip,[-450,485])
 ]);
 motionStations=stations.map((s,i)=>{
  const center=wrapCenters[i],d=units[i].mm*PAPER_SCALE,stop=stopAt(i),mouthDistance=makeRoute([s.nip,s.mouth],center).length;
  const mouth=d<mouthDistance?stop:s.mouth;
  const incoming=makeRoute([s.entry,mouth,stop],center);
  const plate=makeRoute([s.nip,mouth,stop],center);
  const approach=makeRoute([s.nip,mouth],center);
  const upstream=backwardRoute(i);
  const entryDistance=backbone.distances[i+1],nipDistance=backbone.distances[i+2];
  return {center,stop,mouth,incoming,plate,approach,upstream,d,entryDistance,nipDistance};
 });
 // Include every existing and future crease exactly so no segment bridges a fold.
 const cuts=[0,...result.creases,length];materialSamples=[];
 for(let j=0;j<cuts.length-1;j++){
  const n=Math.ceil((cuts[j+1]-cuts[j])*PAPER_SCALE/.45);
  for(let k=0;k<n;k++)materialSamples.push(mix(cuts[j],cuts[j+1],k/n));
 }materialSamples.push(length);
 // A shared transport clock lets the next plate receive a new folded edge
 // while the previous nip is still withdrawing its two legs.
 let arrival=240;
 motionStations.forEach((m,i)=>{
  m.arrival=arrival;m.contact=arrival+m.incoming.length;
  m.catch=arrival+m.d+m.upstream.length;
  m.exit=result.records[i].valid?m.catch:arrival+(m.nipDistance-m.entryDistance);
  arrival=m.exit;
 });
 let drive=0;
 function add(kind,i,endDrive,title,info,hold=0){
  const startDrive=drive;endDrive=Math.max(drive,endDrive);
  const seconds=hold||Math.max(.18,(endDrive-startDrive)/38);
  segments.push({kind,i,start:duration,end:duration+seconds,startDrive,endDrive,title,info});
  duration+=seconds;drive=endDrive;
 }
 add('feed',null,240,'Feed the sheet','The whole sheet advances into the machine at a fixed drawing scale.');
 stations.forEach((s,i)=>{
  const m=motionStations[i];
  if(!result.records[i].valid){add('bypass',i,m.exit,`Plate ${i+1} · bypass`,units[i].on?'This stop is beyond the packet’s reach. No fold can form here.':'The full packet follows the roller path. A bypass neither folds nor shortens it.');return;}
  add('enter',i,m.contact,`Plate ${i+1} · enter the plate`,`The leading edge enters the ${i%2?'lower':'upper'} plate toward its ${fmt(units[i].mm)} mm stop. Earlier nips may still be drawing the trailing layers through.`);
  add('stop',i,m.contact,`Plate ${i+1} · meet the stop`,'The leading edge has reached the stop. Watch the trailing paper feed into the buckle space.',.75);
  add('buckle',i,m.catch,`Plate ${i+1} · form the buckle`,'The leading edge stays at the stop. Incoming material bends toward the nip without changing the sheet’s length.');
  add('nip',i,m.catch+14,`Plate ${i+1} · catch & pull through`,'The rollers catch the buckle. The new folded edge moves onward while both legs are drawn through the nip.');
 });
 const final=motionStations.at(-1);
 add('delivery',null,final.exit+Math.max(285,result.span*PAPER_SCALE+24),'Delivery · inspect your fold','The complete packet exits at the original drawing scale. Overlapping layers are retained; paper is never replaced by a short placeholder.');
}
function scalarOnStrip(strips,s){
 const l=strips.find(l=>s>=l.s0-1e-7&&s<=l.s1+1e-7)||strips.at(-1);
 return mix(l.x0,l.x1,(s-l.s0)/(l.s1-l.s0));
}
function transportState(m,drive){
 if(drive<m.arrival)return {kind:'waiting'};
 if(drive<m.contact)return {kind:'enter',travel:drive-m.arrival};
 if(drive<m.catch){
  // Solve for exactly the path length supplied by the rollers. Increasing
  // the buckle consumes the trailing leg, rather than inventing extra paper.
  const s=stations[motionStations.indexOf(m)],wanted=drive-m.arrival;
  let lo=0,hi=1;
  for(let j=0;j<28;j++){
   const q=(lo+hi)/2,elbow=m.approach.at((1-q)*m.approach.length),route=makeRoute([m.stop,m.mouth,elbow,s.entry],m.center);
   if(route.length<wanted)lo=q;else hi=q;
  }
  const elbow=m.approach.at((1-(lo+hi)/2)*m.approach.length);
  return {kind:'buckle',route:makeRoute([m.stop,m.mouth,elbow,s.entry],m.center)};
 }
 return {kind:'fold',travel:drive-m.catch};
}
function frameGeometry(segment,q){
 const drive=mix(segment.startDrive,segment.endDrive,clamp(q));
 const states=motionStations.map(m=>transportState(m,drive));
 function locate(material){
  let x=material*PAPER_SCALE;
  let position=backbone.at(backbone.distances[1]+drive-240-x);
  for(let i=0;i<4;i++){
   const m=motionStations[i];
   if(!result.records[i].valid){
    const travel=drive-m.arrival-x;
    if(travel<0)break;
    position=backbone.at(m.entryDistance+travel);
    if(travel<m.nipDistance-m.entryDistance)break;
    continue;
   }
   const state=states[i];
   if(state.kind==='waiting')break;
   if(state.kind==='enter'){
    const travel=state.travel-x;
    if(travel>=0)position=m.incoming.at(travel);
    break;
   }
   if(state.kind==='buckle'){
    if(x<=state.route.length)position=state.route.at(x);
    break;
   }
   const r=Math.abs(x-m.d)-state.travel;
   if(r>0){
    if(x<m.d)position=m.plate.at(r);
    else if(r<=m.upstream.length)position=m.upstream.at(r);
    break;
   }
   x=Math.abs(x-m.d);
   position=backbone.at(m.nipDistance-r);
  }
  return position;
 }
 const points=materialSamples.map(locate);
 const completed=motionStations.filter((m,i)=>result.records[i].valid&&drive>=m.catch).length;
 const strips=segment.i===null?(segment.kind==='feed'?result.records[0].before:result.layers):result.records[segment.i].before;
 return {points,materialLength:length*PAPER_SCALE,strips,drive,completed};
}
function controls(){
 $('controls').innerHTML='';
 units.forEach((u,i)=>{
 const div=document.createElement('div');div.className='plate';div.id=`plate${i}`;div.innerHTML=`<div class="platehead"><strong>${i+1}</strong><span>Plate ${i+1} <small>${i%2?'↘ lower':'↖ upper'}</small></span><label><input type="checkbox" ${u.on?'checked':''} aria-label="Enable plate ${i+1}">On</label></div><div class="quick"><button data-frac="0.5">½ sheet</button><button data-frac="${1/3}">⅓ sheet</button><button data-frac="0.25">¼ sheet</button></div><div class="stoprow"><input type="range" min="5" max="${length-1}" step="0.1" value="${u.mm}" aria-label="Plate ${i+1} stop in millimetres"><output>${fmt(u.mm)} mm</output></div>`;
 $('controls').appendChild(div);
 div.querySelector('input[type=checkbox]').onchange=e=>{u.on=e.target.checked;custom();};
 div.querySelector('input[type=range]').oninput=e=>{u.mm=+e.target.value;div.querySelector('output').textContent=`${fmt(u.mm)} mm`;custom(false);};
 div.querySelectorAll('[data-frac]').forEach(b=>b.onclick=()=>{u.on=true;u.mm=length*Number(b.dataset.frac);custom();});
 });
}
function custom(rebuildControls=true){choice='custom';$('preset').value=choice;rebuild(false,rebuildControls);}
function setPreset(id,autoplay=true){choice=id;if(id!=='custom'){units=Array.from({length:4},()=>({on:false,mm:length/3}));presets[id].plates.forEach((p,j)=>units[p]={on:true,mm:length*presets[id].fractions[j]});}rebuild(autoplay);}
function renderResults(){
 const cuts=[0,...result.creases,length];$('panels').innerHTML='';
 cuts.slice(0,-1).forEach((s,i)=>{const d=document.createElement('div');d.style.width=`${(cuts[i+1]-s)/length*100}%`;d.innerHTML=`<b>P${i+1}</b><small>${fmt(cuts[i+1]-s)} mm</small>`;d.title=`P${i+1}: ${fmt(s)}–${fmt(cuts[i+1])} mm`; $('panels').appendChild(d);});
 $('panelBadge').textContent=`${cuts.length-1} PANELS`;$('sizeBadge').textContent=`${fmt(result.span)} mm PACKET`;
 $('creaseText').textContent=result.creases.length?`Creases from leading edge: ${result.creases.map(fmt).join(' · ')} mm`:'No creases — the sheet passes through unfolded.';
 let name=presets[choice].name;
 if(choice==='custom'){const match=Object.values(presets).find(p=>p.plates&&units.every((u,i)=>u.on===p.plates.includes(i)&&(!u.on||Math.abs(u.mm-length*p.fractions[p.plates.indexOf(i)])<.2)));if(match)name=match.name;}
 $('resultName').textContent=name;
 const stack=$('stack');stack.replaceChildren();const layers=result.layers,scale=400/result.span;
 const panelOf=l=>cuts.findIndex((s,i)=>i<cuts.length-1&&(l.s0+l.s1)/2>=s-1e-5&&(l.s0+l.s1)/2<cuts[i+1]+1e-5)+1;
 const ordered=layers.map(panelOf),spacing=Math.min(26,115/Math.max(1,layers.length-1));
 layers.forEach((l,i)=>{const x=50+Math.min(l.x0,l.x1)*scale,w=Math.abs(l.x1-l.x0)*scale,y=135-i*spacing;
 el('rect',{x,y:y-13,width:Math.max(w,1),height:14,rx:3,fill:l.face==='A'?'#95bedc':'#d0e3f1',stroke:'#5e97bf'},stack);
 text(`P${panelOf(l)} · ${l.face} ↑ ${l.x1>l.x0?'→':'←'}`,x+w/2,y-3,stack,{'text-anchor':'middle','font-size':9,fill:'#294f6c'});
 });
 text('TOP',7,Math.max(19,135-(layers.length-1)*spacing-3),stack,{'font-size':8});text('BOTTOM',2,153,stack,{'font-size':8});
 $('stackText').textContent=`Top → bottom: ${ordered.slice().reverse().map(i=>'P'+i).join(' · ')}. A/B = upward-facing side. Ideal zero-thickness stack; gaps are enlarged for inspection.`;
}
function rebuild(auto=true,rebuildControls=true){
 playing=false;cancelAnimationFrame(raf);last=null;t=0;currentPhase=-1;result=calculate(length,units);buildTimeline();drawMachine();if(rebuildControls)controls();
 $('presetInfo').textContent=presets[choice].description;
 const warnings=[];units.forEach((u,i)=>{if(u.on&&!result.records[i].valid)warnings.push(`Plate ${i+1}: ${fmt(u.mm)} mm stop exceeds the ${fmt(result.records[i].span)} mm entering packet.`);const card=$(`plate${i}`);card.classList.toggle('off',!u.on);});
 $('warning').hidden=!warnings.length;$('warning').textContent=warnings.join(' ');
 $('journey').innerHTML='';units.forEach((u,i)=>{const b=document.createElement('button');b.textContent=`${i+1} · ${result.records[i].valid?'Fold':'Bypass'}`;b.onclick=()=>{pause();t=segments.find(s=>s.i===i).start;render();};$('journey').appendChild(b);});
 renderResults();render();if(auto&&!reduced)play();
}
function phaseAt(time){const index=segments.findIndex(s=>time<s.end);return index<0?segments.length-1:index;}
function render(){
 const index=phaseAt(t),s=segments[index],q=clamp((t-s.start)/(s.end-s.start)),{points,strips,completed}=frameGeometry(s,q);
 const thickness=6+Math.min(1.5,completed*.5);paperPath.setAttribute('stroke-width',thickness);paperInner.setAttribute('stroke-width',Math.max(2,thickness-4));
 const d='M'+points.map(pt).join('L');paperPath.setAttribute('d',d);paperInner.setAttribute('d',d);
 const hit=s.i!==null&&['stop','buckle'].includes(s.kind);pulse.setAttribute('opacity',hit?.6:0);if(hit){pulse.setAttribute('cx',stopPoints[s.i][0]);pulse.setAttribute('cy',stopPoints[s.i][1]);pulse.setAttribute('r',9+5*Math.sin(q*Math.PI));}
 rotations.forEach(({g,x,y,dir})=>g.setAttribute('transform',`rotate(${t*100*dir} ${x} ${y})`));
 if(currentPhase!==index){currentPhase=index;$('phaseNumber').textContent=String(index+1).padStart(2,'0');$('phaseTitle').textContent=s.title;$('explanation').textContent=s.info;units.forEach((_,i)=>{$(`plate${i}`).classList.toggle('current',s.i===i);$('journey').children[i].classList.toggle('active',s.i===i);});setView();}
 $('timeline').value=String(t/duration*1000);$('time').textContent=`${clock(t)} / ${clock(duration)}`;$('play').textContent=playing?'Ⅱ Pause':t>=duration?'↺ Replay':'▶ Play';$('status').textContent=playing?'● RUNNING':t>=duration?'COMPLETE':t?'PAUSED':'READY';
}
function setView(){const s=segments[phaseAt(t)];if(follow&&s.i!==null){const m=stations[s.i].mouth;$('machine').setAttribute('viewBox',`${m[0]-205} ${m[1]-190} 410 380`);}else $('machine').setAttribute('viewBox','0 0 1000 680');}
function clock(n){return `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;}
function tick(now){if(!playing)return;if(last!==null)t=Math.min(duration,t+Math.min((now-last)/1000,.1)*speed);last=now;if(t>=duration)playing=false;render();if(playing)raf=requestAnimationFrame(tick);}
function play(){if(playing)return;if(t>=duration)t=0;playing=true;last=null;render();raf=requestAnimationFrame(tick);}
function pause(){playing=false;last=null;cancelAnimationFrame(raf);render();}
$('play').onclick=()=>playing?pause():play();$('restart').onclick=()=>{pause();t=0;currentPhase=-1;render();play();};$('step').onclick=()=>{pause();const s=segments[Math.min(segments.length-1,phaseAt(t)+1)];t=t>=s.start&&s===segments.at(-1)?duration:s.start;render();};
$('preset').onchange=e=>setPreset(e.target.value);$('length').onchange=e=>{length=clamp(Math.round(Number(e.target.value)||420),150,700);e.target.value=length;if(choice==='custom'){units.forEach(u=>u.mm=Math.min(u.mm,length-1));rebuild(false);}else setPreset(choice);};
$('timeline').oninput=e=>{pause();t=+e.target.value/1000*duration;render();};$('speed').onchange=e=>speed=+e.target.value;
$('wide').onclick=()=>{follow=false;$('wide').classList.add('selected');$('focus').classList.remove('selected');setView();};$('focus').onclick=()=>{follow=true;$('focus').classList.add('selected');$('wide').classList.remove('selected');setView();};$('labels').onchange=e=>$('annotations').style.display=e.target.checked?'':'none';
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON','TEXTAREA','SUMMARY','A'].includes(document.activeElement.tagName)){e.preventDefault();playing?pause():play();}});
document.addEventListener('visibilitychange',()=>{last=null;});
setPreset('z');
window.FoldingLab={calculate,presets,stations,rollers,ROLLER_RADIUS,CONTACT_RADIUS,getBackbone:()=>backbone,frameGeometry,getMaterialSamples:()=>materialSamples.slice(),getMotionStations:()=>motionStations,getState:()=>({choice,length,units,result,t,duration,playing}),setPreset,pause,play,seek:value=>{pause();t=clamp(value,0,duration);render();},getSegments:()=>segments};