import {lowest,sameHour,asCSV} from './model.mjs';
const $=id=>document.getElementById(id);
const node=(t,s)=>{const n=document.createElement(t);n.textContent=s;return n};
let edition,archive,c,series,points,activeZone;
const fmt=ts=>new Intl.DateTimeFormat('en-CA',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short',timeZone:activeZone}).format(ts*1000);
const svg=(t,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',t);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n};
function chart(selected){
 const width=760,height=189,left=57,right=746,top=12,bottom=154;
 const floor=Math.max(0,Math.floor((Math.min(100,...points.filter(p=>p[1]!==null).map(p=>p[1]))-2)/10)*10);
 const ceil=Math.ceil((Math.max(100,...points.filter(p=>p[1]!==null).map(p=>p[1]))+2)/10)*10;
 const x=i=>left+i/Math.max(1,points.length-1)*(right-left);
 const y=v=>bottom-(v-floor)/(ceil-floor)*(bottom-top);
 const graph=svg('svg',{viewBox:'0 0 '+width+' '+height,role:'img','aria-label':'Hourly internet signal relative to the reference week. Use Inspect an hour or download the data for exact values.'});
 for(const v of [...new Set([floor,100,ceil])])graph.append(svg('line',{x1:left,x2:right,y1:y(v),y2:y(v),stroke:v===100?'#376553':'#ced6ca','stroke-dasharray':v===100?'5 4':'none'}),svg('text',{x:left-5,y:y(v)+4,'text-anchor':'end',fill:'#405958','font-size':13},v+'%'));
 for(const b of c.bulletins){
  const found=sameHour(points,b.time);
  if(found){const i=points.indexOf(found);graph.append(svg('line',{x1:x(i),x2:x(i),y1:top,y2:bottom,stroke:'#b58646','stroke-width':1.4}))}
 }
 let path='',continuous=false;
 points.forEach((p,i)=>{if(p[1]===null){continuous=false;return}path+=(continuous?'L':'M')+x(i)+' '+y(p[1])+' ';continuous=true});
 graph.append(svg('path',{d:path,stroke:'#176e68','stroke-width':2.8,fill:'none'}));
 if(points[selected][1]!==null)graph.append(svg('circle',{cx:x(selected),cy:y(points[selected][1]),r:5,stroke:'white',fill:'#173937'}));
 graph.append(svg('text',{x:left,y:182,'font-size':13,fill:'#405958'},fmt(points[0][0])),svg('text',{x:right,y:182,'text-anchor':'end','font-size':13,fill:'#405958'},fmt(points.at(-1)[0])));
 $('graph').replaceChildren(graph);
}
function detail(){
 const i=+$('hour').value,p=points[i];const note=p[1]===null?'Insufficient source measurements for this hour.':p[1].toFixed(1)+'% of the reference median from '+p[2]+' valid readings.';
 $('reading').textContent=fmt(p[0])+' · '+note;chart(i);
}
function render(){
 c=edition.cases[$('event').value];series=c.signals[$('metric').value];points=series.points;activeZone=$('zone').value==='utc'?'UTC':c.zone;
 const low=lowest(points);$('low').textContent=low[1].toFixed(1)+'%';$('lowtime').textContent=fmt(low[0])+' · of the reference median';
 $('ref').textContent=series.baseline.toLocaleString('en-CA',{maximumFractionDigits:2});$('base').textContent='Median /24 blocks across '+series.baselineHours+' usable hours in the preceding seven days.';
 $('title').textContent=c.name+' · '+c.province;$('context').textContent=c.context;
 $('hour').replaceChildren(...points.map((p,i)=>new Option(fmt(p[0])+' · '+(p[1]===null?'Unavailable':p[1].toFixed(1)+'%'),i)));$('hour').value=points.indexOf(low);
 $('ioda').href='https://ioda.inetintel.cc.gatech.edu/region/'+c.region+'?from='+points[0][0]+'&until='+(points.at(-1)[0]+3600);
 $('api').href=series.source;$('utility').textContent=c.utility+' current outage map ↗';$('utility').href=c.utilityUrl;
 $('power').textContent=c.bulletins.length?c.powerScope+'. Select an internet reading to inspect the corresponding hour.':'This recent internet window has no matched utility bulletins. Use the utility’s outage map for current reports.';
 $('rows').replaceChildren(...c.bulletins.map(b=>{
  const tr=node('tr',''),time=node('td',''),a=node('a',b.time?fmt(Date.parse(b.time)/1000):b.date+' · morning local time');a.href=b.url;time.append(a);
  const overlap=sameHour(points,b.time),measure=node('td','');
  if(overlap&&overlap[1]!==null){const btn=node('button',overlap[1].toFixed(1)+'%');btn.onclick=()=>{$('hour').value=points.indexOf(overlap);detail();$('reading').scrollIntoView({block:'center'})};measure.append(btn)}
  else measure.textContent=b.time?'Unavailable':'Exact time unavailable';
  tr.append(time,node('td',b.qualifier+' '+b.value.toLocaleString('en-CA')+' · '+b.metric.toLowerCase()),node('td',b.scope),measure);return tr
 }));
 $('method').textContent=($('metric').value==='bgp'?'BGP counts visible routed /24 address blocks. Announcements may persist while access at homes fails.':'Active probing counts responding /24 network blocks. A block can include many devices and addresses. IP blocks are assigned to a province by IODA.')+' Each hour uses the median of available source readings, normalized to the median of the preceding week’s usable hourly values. A reading of 46% means a level 54% below that baseline.';
 $('sources').textContent='Internet measurements retrieved '+edition.retrieved+'. Historical electricity reports were reviewed '+edition.powerReviewed+'. Hourly index and comparisons calculated by CoolCode.';
 const days=Object.entries(archive[c.region]??{}).sort((a,b)=>b[0].localeCompare(a[0]));
 $('dailySummary').textContent=days.length+' complete dates in '+c.province;
 $('archiveRows').replaceChildren(...days.map(([day,entry])=>{const s=entry.signals[$('metric').value],tr=node('tr','');tr.append(...[day,s.minimum+'%',s.median+'%',s.hours,entry.baselineStart].map(v=>node('td',v)));return tr}));
 $('results').hidden=false;$('status').textContent='Two storm case studies · Recent provincial signals · Internet data retrieved '+edition.retrieved;
 const url=new URL(location.href);for(const id of ['event','metric','zone'])url.searchParams.set(id,$(id).value);history.replaceState(null,'',url);detail();
}
$('hour').addEventListener('change',detail);
$('download').addEventListener('click',()=>{
 const rows=[['hour_utc','province','signal','percent_of_previous_week','valid_readings','reference_median_blocks','same_hour_utility_update'],...points.map(p=>[new Date(p[0]*1000).toISOString(),c.province,$('metric').value,p[1],p[2],series.baseline,c.bulletins.filter(b=>sameHour(points,b.time)===p).map(b=>b.qualifier+' '+b.value+' '+b.metric+' · '+b.scope).join(' | ')])];
 const url=URL.createObjectURL(new Blob([asCSV(rows)],{type:'text/csv'})),a=node('a','');a.href=url;a.download='grid-dark-'+$('event').value+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
async function start(){const res=await fetch('./events.json');if(!res.ok)throw Error('Data unavailable');edition=await res.json();const daily=await fetch('./daily.json');if(!daily.ok)throw Error('Daily archive unavailable');archive=await daily.json();
 for(const [k,v] of Object.entries(edition.cases))$('event').add(new Option(v.name+' · '+v.province,k));
 const query=new URLSearchParams(location.search);
 for(const id of ['event','metric','zone']){const input=$(id),v=query.get(id);if([...input.options].some(o=>o.value===v))input.value=v;input.addEventListener('change',render)}
 render();
}
start().catch(()=>{$('status').textContent='This edition could not be read. Reload the page to try again.'});
