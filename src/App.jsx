import { useState, useEffect } from "react";

const PEOPLE = [
  { id:"MK", label:"MK", allowance:25, color:"#6366f1", light:"#eef2ff", yearStartMonth:3 },
  { id:"SL", label:"SL", allowance:25, color:"#ec4899", light:"#fdf2f8", yearStartMonth:0 },
];
const PERSON_OPTIONS = [...PEOPLE, { id:"BOTH", label:"Both MK & SL", color:"#7c3aed", light:"#f5f3ff" }];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const EVENT_COLORS=[{id:"red",hex:"#ef4444"},{id:"orange",hex:"#f97316"},{id:"teal",hex:"#14b8a6"},{id:"green",hex:"#22c55e"},{id:"sky",hex:"#0ea5e9"},{id:"rose",hex:"#f43f5e"}];
const ITIN_FIELDS=[{id:"theme",label:"Theme / Plan"},{id:"accommodation",label:"Accommodation"},{id:"transportation",label:"Transportation"},{id:"details",label:"Details"}];

// ── UK Bank Holidays ─────────────────────────────────────────────────────────
function easterSunday(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da);}
function lastMon(y,mo){const d=new Date(y,mo+1,0);while(d.getDay()!==1)d.setDate(d.getDate()-1);return new Date(d);}
function firstMon(y,mo){const d=new Date(y,mo,1);while(d.getDay()!==1)d.setDate(d.getDate()+1);return new Date(d);}
function getUKBankHolidays(year){
  const bh=[],addS=(dt,name)=>{const d=new Date(dt),day=d.getDay();if(day===6)d.setDate(d.getDate()+2);else if(day===0)d.setDate(d.getDate()+1);bh.push({date:tds(d),name});};
  addS(new Date(year,0,1),"New Year's Day");
  const easter=easterSunday(year),gf=new Date(easter),em=new Date(easter);
  gf.setDate(easter.getDate()-2);em.setDate(easter.getDate()+1);
  bh.push({date:tds(gf),name:"Good Friday"},{date:tds(em),name:"Easter Monday"});
  bh.push({date:tds(firstMon(year,4)),name:"Early May Bank Holiday"},{date:tds(lastMon(year,4)),name:"Spring Bank Holiday"},{date:tds(lastMon(year,7)),name:"Summer Bank Holiday"});
  const xday=new Date(year,11,25).getDay();
  if(xday===5){bh.push({date:`${year}-12-25`,name:"Christmas Day"},{date:`${year}-12-28`,name:"Boxing Day (sub)"});}
  else if(xday===6){bh.push({date:`${year}-12-27`,name:"Christmas Day (sub)"},{date:`${year}-12-28`,name:"Boxing Day (sub)"});}
  else if(xday===0){bh.push({date:`${year}-12-26`,name:"Christmas Day (sub)"},{date:`${year}-12-27`,name:"Boxing Day (sub)"});}
  else{bh.push({date:`${year}-12-25`,name:"Christmas Day"},{date:`${year}-12-26`,name:"Boxing Day"});}
  return bh;
}
const bhCache={};
function bankHolidays(y){if(!bhCache[y])bhCache[y]=getUKBankHolidays(y);return bhCache[y];}
function isBH(ds){return bankHolidays(+ds.slice(0,4)).some(h=>h.date===ds);}
function bhName(ds){return bankHolidays(+ds.slice(0,4)).find(h=>h.date===ds)?.name||null;}

// ── Helpers ───────────────────────────────────────────────────────────────────
const tds=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const sKey=(pid,yr)=>`${pid}-${yr}`;
function getBaseYear(person,date){const m=date.getMonth(),y=date.getFullYear();return m>=person.yearStartMonth?y:y-1;}
function getYearRange(person,by){const sm=person.yearStartMonth;return{start:`${by}-${String(sm+1).padStart(2,"0")}-01`,end:tds(new Date(by+1,sm,0))};}
function yearLabel(person,by){const{start,end}=getYearRange(person,by);const fmt=s=>{const[y,m]=s.split("-");return`${MONTHS[+m-1].slice(0,3)} ${y}`;};return`${fmt(start)} – ${fmt(end)}`;}
function isWeekend(ds){const d=new Date(ds+"T12:00:00");return d.getDay()===0||d.getDay()===6;}
function isNW(ds){return isWeekend(ds)||isBH(ds);}
function countWD(s,e){let c=0;const sd=new Date(s+"T12:00:00"),ed=new Date(e+"T12:00:00");for(let d=new Date(sd);d<=ed;d.setDate(d.getDate()+1)){if(!isNW(tds(d)))c++;}return c;}
function calDays(s,e){return Math.round((new Date(e+"T12:00:00")-new Date(s+"T12:00:00"))/86400000)+1;}
function subMos(ds,n){const d=new Date(ds+"T12:00:00");d.setMonth(d.getMonth()-n);return tds(d);}
function subDays(ds,n){const d=new Date(ds+"T12:00:00");d.setDate(d.getDate()-n);return tds(d);}
function reminderMos(n){return n<=3?3:n<=6?4:n<=9?5:6;}
function getHolTasks(h){
  const mo=reminderMos(calDays(h.start,h.end));
  const tasks=[];
  // Request holiday reminder only if entitlement is used
  if(h.days>0){
    const reqMo=h.days<=5?1:2;
    tasks.push({id:'request',icon:'📨',label:`Request holiday from employer`,subLabel:`(${reqMo} month${reqMo>1?"s":""} before departure — ${h.days} working day${h.days!==1?"s":""})`,due:subMos(h.start,reqMo)});
  }
  tasks.push(
    {id:'book',icon:'🏨',label:`Book accommodation, transportation & flights`,subLabel:`(${mo} months before departure)`,due:subMos(h.start,mo)},
    {id:'plan',icon:'📋',label:'Detailed planning',subLabel:'(1 month before departure)',due:subMos(h.start,1)},
    {id:'check',icon:'✅',label:'Final check — confirm all plans',subLabel:'(1 week before departure)',due:subDays(h.start,7)},
  );
  return tasks;
}
function getItinDays(h){const n=calDays(h.start,h.end),days=[];for(let i=0;i<n;i++){const d=new Date(h.start+"T12:00:00");d.setDate(d.getDate()+i);days.push({idx:i,date:tds(d)});}return days;}
function fmtDate(s){if(!s)return"";const[y,m,d]=s.split("-");return new Date(+y,+m-1,+d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});}
function daysUntil(ds,todayStr){return Math.round((new Date(ds+"T12:00:00")-new Date(todayStr+"T12:00:00"))/86400000);}

// ── Storage ───────────────────────────────────────────────────────────────────
function loadKey(k){const r={holidays:[],carryover:0,coSet:false,initUsed:0,initSet:false};try{const v=localStorage.getItem(`hols-${k}`);if(v)r.holidays=JSON.parse(v);}catch{}try{const v=localStorage.getItem(`co-${k}`);if(v){r.carryover=JSON.parse(v);r.coSet=true;}}catch{}try{const v=localStorage.getItem(`init-${k}`);if(v){r.initUsed=JSON.parse(v);r.initSet=true;}}catch{}return r;}
function persistKey(k,e){try{localStorage.setItem(`hols-${k}`,JSON.stringify(e.holidays));}catch{}try{if(e.coSet)localStorage.setItem(`co-${k}`,JSON.stringify(e.carryover));}catch{}try{if(e.initSet)localStorage.setItem(`init-${k}`,JSON.stringify(e.initUsed));}catch{}}
const lsGet=(k,fb)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{return fb;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App(){
  const today=new Date(),todayStr=tds(today),beforeApril=today.getMonth()<3;
  const mkP=PEOPLE[0],slP=PEOPLE[1];
  const mkCurYear=getBaseYear(mkP,today),mkYears=beforeApril?[mkCurYear,mkCurYear+1]:[mkCurYear];
  const slCurYear=getBaseYear(slP,today);

  const[view,setView]=useState("dashboard");
  const[data,setData]=useState({});
  const[events,setEvents]=useState([]);
  const[todos,setTodos]=useState({});
  const[itin,setItin]=useState({});
  const[openItinId,setOpenItinId]=useState(null);
  const[editCO,setEditCO]=useState(null);const[coInput,setCOInput]=useState("");
  const[editRem,setEditRem]=useState(null);const[remInput,setRemInput]=useState("");
  const[form,setForm]=useState({person:"MK",start:"",end:"",label:""});
  const[formError,setFormError]=useState("");
  const[evtForm,setEvtForm]=useState({date:"",title:"",color:"red"});
  const[evtError,setEvtError]=useState("");
  const[calMonth,setCalMonth]=useState(today.getMonth());
  const[calYear,setCalYear]=useState(today.getFullYear());

  useEffect(()=>{
    const fresh={},curY=today.getFullYear();
    for(const p of PEOPLE)for(let y=curY-2;y<=curY+4;y++){const k=sKey(p.id,y);fresh[k]=loadKey(k);}
    setData(fresh);
    setEvents(lsGet("cal-events",[]));
    setTodos(lsGet("todos",{}));
    setItin(lsGet("itin",{}));
  },[]);

  const D=(pid,yr)=>data[sKey(pid,yr)]||{holidays:[],carryover:0,coSet:false,initUsed:0,initSet:false};
  const bookedDays=(pid,yr)=>D(pid,yr).holidays.reduce((s,h)=>s+h.days,0);
  const usedDays=(pid,yr)=>D(pid,yr).initUsed+bookedDays(pid,yr);
  const projCO=(person,yr)=>{const d=D(person.id,yr);const co=d.coSet?d.carryover:0;return Math.max(0,person.allowance+co-usedDays(person.id,yr));};
  const remDays=(person,yr)=>(person.allowance+D(person.id,yr).carryover)-usedDays(person.id,yr);

  function getAllHolidays(){
    const map={};
    for(const[k,v]of Object.entries(data)){
      const[pid,yr]=k.split("-");
      const person=PEOPLE.find(p=>p.id===pid);
      if(!person||!v.holidays)continue;
      for(const h of v.holidays){
        if(!map[h.id])map[h.id]={...h,persons:[person],personLabel:person.label,personColor:person.color};
        else if(!map[h.id].persons.find(p=>p.id===pid)){map[h.id].persons.push(person);map[h.id].personLabel="Both";map[h.id].personColor="#7c3aed";}
      }
    }
    return Object.values(map).sort((a,b)=>a.start.localeCompare(b.start));
  }

  // Returns [{person, holiday}] for all holidays on a given date
  function holsOn(ds){
    const res=[];
    for(const p of PEOPLE){
      for(const[k,v]of Object.entries(data)){
        if(!k.startsWith(p.id+"-"))continue;
        for(const h of(v.holidays||[])){
          if(ds>=h.start&&ds<=h.end&&!res.find(r=>r.holiday.id===h.id&&r.person.id===p.id))
            res.push({person:p,holiday:h});
        }
      }
    }
    return res;
  }

  function updateKey(k,updates){
    setData(prev=>{const next={...(prev[k]||{holidays:[],carryover:0,coSet:false,initUsed:0,initSet:false}),...updates};persistKey(k,next);return{...prev,[k]:next};});
  }
  function saveCarryover(k){updateKey(k,{carryover:Math.max(0,parseInt(coInput)||0),coSet:true});setEditCO(null);}
  function saveInitRem(k,person,baseYear){
    const entered=Math.max(0,parseInt(remInput)||0);
    const co=D(person.id,baseYear).carryover;
    const booked=bookedDays(person.id,baseYear);
    updateKey(k,{initUsed:Math.max(0,person.allowance+co-entered-booked),initSet:true});
    setEditRem(null);
  }
  function toggleTodo(hid,taskId){const u={...todos,[hid]:{...(todos[hid]||{}),[taskId]:!(todos[hid]?.[taskId])}};setTodos(u);lsSet("todos",u);}
  function updateItinDay(hid,dayIdx,field,val){const u={...itin,[hid]:{...(itin[hid]||{}),[dayIdx]:{...(itin[hid]?.[dayIdx]||{}),[field]:val}}};setItin(u);lsSet("itin",u);}

  function addHoliday(){
    setFormError("");
    const{person,start,end,label}=form;
    if(!start||!end)return setFormError("Please select start and end dates.");
    if(end<start)return setFormError("End must be after start.");
    const days=countWD(start,end);
    if(person==="BOTH"){
      for(const p of PEOPLE){const by=getBaseYear(p,new Date(start+"T12:00:00"));const rem=remDays(p,by);if(days>0&&days>rem)return setFormError(`Only ${rem} days remaining for ${p.label} (${yearLabel(p,by)}).`);}
      const id=Date.now();
      for(const p of PEOPLE){const by=getBaseYear(p,new Date(start+"T12:00:00"));updateKey(sKey(p.id,by),{holidays:[...D(p.id,by).holidays,{id,start,end,label:label||"Holiday",days,joint:true}]});}
    } else {
      const p=PEOPLE.find(x=>x.id===person);
      const by=getBaseYear(p,new Date(start+"T12:00:00"));
      const rem=remDays(p,by);
      if(days>0&&days>rem)return setFormError(`Only ${rem} days remaining for ${p.label} (${yearLabel(p,by)}).`);
      updateKey(sKey(p.id,by),{holidays:[...D(p.id,by).holidays,{id:Date.now(),start,end,label:label||"Holiday",days}]});
    }
    setForm(f=>({...f,start:"",end:"",label:""}));
    setView("dashboard");
  }

  function removeHoliday(pid,yr,id){updateKey(sKey(pid,yr),{holidays:D(pid,yr).holidays.filter(h=>h.id!==id)});}
  function addEvent(){
    setEvtError("");
    if(!evtForm.date)return setEvtError("Please select a date.");
    if(!evtForm.title.trim())return setEvtError("Please enter a title.");
    const u=[...events,{id:Date.now(),...evtForm,title:evtForm.title.trim()}];
    setEvents(u);lsSet("cal-events",u);
    const[y,m]=evtForm.date.split("-");setCalYear(+y);setCalMonth(+m-1);
    setEvtForm(f=>({...f,date:"",title:""}));setView("calendar");
  }
  function removeEvent(id){const u=events.filter(e=>e.id!==id);setEvents(u);lsSet("cal-events",u);}

  // ── Card ─────────────────────────────────────────────────────────────────────
  function card(person,baseYear,isNext){
    const k=sKey(person.id,baseYear),d=D(person.id,baseYear);
    const co=isNext&&!d.coSet?projCO(mkP,mkCurYear):d.carryover;
    const eff=person.allowance+co,u=usedDays(person.id,baseYear),rem=eff-u,pct=Math.min(100,(u/eff)*100);
    return(
      <div key={k} style={{background:"white",borderRadius:16,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",borderTop:`4px solid ${person.color}`}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",color:isNext?"#f59e0b":"#10b981"}}>{isNext?"⏭ NEXT YEAR":"▶ CURRENT YEAR"}</span>
          <span style={{fontSize:11,color:"#94a3b8"}}>{yearLabel(person,baseYear)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",margin:"10px 0 12px"}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"#64748b"}}>{person.label}</div>
            {editRem===k?(
              <div style={{display:"flex",gap:6,alignItems:"center",marginTop:4,flexWrap:"wrap"}}>
                <input type="number" min="0" max={eff} value={remInput} onChange={e=>setRemInput(e.target.value)} autoFocus
                  style={{width:64,padding:"4px 8px",border:`2px solid ${person.color}`,borderRadius:8,fontSize:22,fontWeight:800,color:person.color,outline:"none",boxSizing:"border-box"}}/>
                <button onClick={()=>saveInitRem(k,person,baseYear)} style={{padding:"4px 10px",background:person.color,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>Save</button>
                <button onClick={()=>setEditRem(null)} style={{padding:"4px 8px",background:"none",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",fontSize:12,color:"#94a3b8"}}>✕</button>
              </div>
            ):(
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <div style={{fontSize:42,fontWeight:800,color:person.color,lineHeight:1}}>{rem}</div>
                <button onClick={()=>{setEditRem(k);setRemInput(rem);setEditCO(null);}} style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"2px 7px",cursor:"pointer",color:"#94a3b8",fontSize:11}}>✏️</button>
              </div>
            )}
            <div style={{fontSize:12,color:"#94a3b8"}}>days remaining</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"#94a3b8"}}>Used / Total</div>
            <div style={{fontSize:22,fontWeight:700,color:"#334155"}}>{u} / {eff}</div>
            <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>Base {person.allowance}{co>0?` + ${co} carried over`:""}{d.initUsed>0?` · Pre-loaded: ${d.initUsed}`:""}</div>
          </div>
        </div>
        <div style={{background:person.light,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12}}>
          {editCO===k?(
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{color:"#64748b",fontWeight:600}}>Carry over:</span>
              <input type="number" min="0" max={person.allowance} value={coInput} onChange={e=>setCOInput(e.target.value)} style={{width:56,padding:"2px 6px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:12}}/>
              <button onClick={()=>saveCarryover(k)} style={{padding:"2px 10px",background:person.color,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>Save</button>
              <button onClick={()=>setEditCO(null)} style={{padding:"2px 8px",background:"none",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",fontSize:12,color:"#94a3b8"}}>Cancel</button>
            </div>
          ):(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{color:"#64748b"}}><span style={{fontWeight:600}}>Carry over: </span><span style={{color:person.color,fontWeight:700}}>{co} days</span>{isNext&&!d.coSet&&<span style={{color:"#94a3b8",fontStyle:"italic",marginLeft:4}}>(projected)</span>}</div>
              <button onClick={()=>{setEditCO(k);setCOInput(co);setEditRem(null);}} style={{background:"none",border:"1px solid #cbd5e1",borderRadius:6,padding:"2px 8px",cursor:"pointer",color:"#64748b",fontSize:11}}>✏️ Edit</button>
            </div>
          )}
        </div>
        <div style={{background:"#f1f5f9",borderRadius:99,height:8,overflow:"hidden"}}><div style={{width:`${pct}%`,background:person.color,height:"100%",borderRadius:99,transition:"width 0.4s"}}/></div>
      </div>
    );
  }

  function holidayList(pid,yr,bgColor){
    const hols=[...D(pid,yr).holidays].sort((a,b)=>a.start.localeCompare(b.start));
    if(!hols.length)return null;
    return(
      <div key={`list-${pid}-${yr}`} style={{background:"white",borderRadius:12,padding:16,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:12,fontWeight:600,color:"#94a3b8",marginBottom:8}}>{yearLabel(PEOPLE.find(p=>p.id===pid),yr)}</div>
        {hols.map(h=>(
          <div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:8,background:bgColor,marginBottom:6}}>
            <div>
              <div style={{fontWeight:600,fontSize:14,color:"#1e293b"}}>{h.label}{h.joint&&<span style={{marginLeft:6,fontSize:11,background:"#f5f3ff",color:"#7c3aed",borderRadius:4,padding:"1px 6px",fontWeight:600}}>Joint</span>}{h.days===0&&<span style={{marginLeft:6,fontSize:11,background:"#f0fdf4",color:"#16a34a",borderRadius:4,padding:"1px 6px",fontWeight:600}}>🏖️ No entitlement</span>}</div>
              <div style={{fontSize:12,color:"#64748b"}}>{fmtDate(h.start)} – {fmtDate(h.end)} · {h.days>0?<><strong>{h.days}</strong> working day{h.days!==1?"s":""}</>:"weekends/bank holidays only"}</div>
            </div>
            <button onClick={()=>removeHoliday(pid,yr,h.id)} style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#94a3b8",fontSize:12}}>Remove</button>
          </div>
        ))}
      </div>
    );
  }

  // ── Calendar ─────────────────────────────────────────────────────────────────
  const getDIM=(y,m)=>new Date(y,m+1,0).getDate();
  const getFD=(y,m)=>{const d=new Date(y,m,1).getDay();return d===0?6:d-1;};
  const eventsOn=ds=>events.filter(e=>e.date===ds);

  // ── Add holiday preview ───────────────────────────────────────────────────────
  const prevDays=form.start&&form.end&&form.end>=form.start?countWD(form.start,form.end):0;
  function getPreviewInfo(){
    if(!form.start||!form.end||form.end<form.start)return null;
    if(form.person==="BOTH"){
      return{isBoth:true,days:prevDays,infos:PEOPLE.map(p=>{
        const by=getBaseYear(p,new Date(form.start+"T12:00:00"));
        const rem=remDays(p,by);
        return{person:p,by,rem,after:rem-prevDays};
      })};
    }
    const p=PEOPLE.find(x=>x.id===form.person);
    const by=getBaseYear(p,new Date(form.start+"T12:00:00"));
    const rem=remDays(p,by);
    return{isBoth:false,days:prevDays,person:p,by,rem,after:rem-prevDays};
  }
  const preview=getPreviewInfo();

  const NAV=[{id:"dashboard",label:"Dashboard"},{id:"calendar",label:"Calendar"},{id:"todo",label:"📋 To-do"},{id:"reminders",label:"🗺️ Itinerary"},{id:"add",label:"+ Holiday"},{id:"addevent",label:"+ Event"}];

  return(
    <div style={{fontFamily:"system-ui,sans-serif",minHeight:"100vh",background:"#f8fafc"}}>
      <div style={{background:"linear-gradient(135deg,#6366f1 0%,#ec4899 100%)",padding:"20px 24px 0",color:"white"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{marginBottom:16}}>
            <h1 style={{margin:0,fontSize:22,fontWeight:700}}>✈️ Holiday Tracker</h1>
            <p style={{margin:"2px 0 0",opacity:0.85,fontSize:13}}>MK & SL</p>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {NAV.map(v=>(
              <button key={v.id} onClick={()=>setView(v.id)} style={{padding:"8px 14px",border:"none",cursor:"pointer",borderRadius:"8px 8px 0 0",background:view===v.id?"white":"rgba(255,255,255,0.15)",color:view===v.id?"#6366f1":"white",fontWeight:600,fontSize:13,whiteSpace:"nowrap"}}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:24}}>

        {/* ── DASHBOARD ── */}
        {view==="dashboard"&&(
          <div>
            <div style={{marginBottom:28}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:4,height:18,borderRadius:2,background:"#6366f1"}}/>
                <h3 style={{margin:0,fontSize:14,fontWeight:700,color:"#6366f1"}}>MK · {beforeApril?"Current & upcoming holiday years":"Current holiday year"}</h3>
              </div>
              <div style={{display:"grid",gridTemplateColumns:mkYears.length>1?"1fr 1fr":"1fr",gap:16,marginBottom:14}}>
                {mkYears.map((yr,i)=>card(mkP,yr,i>0))}
              </div>
              {mkYears.map(yr=>holidayList("MK",yr,"#eef2ff"))}
              {mkYears.every(yr=>D("MK",yr).holidays.length===0)&&<p style={{margin:0,color:"#94a3b8",fontSize:13}}>No holidays added yet for MK.</p>}
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:4,height:18,borderRadius:2,background:"#ec4899"}}/>
                <h3 style={{margin:0,fontSize:14,fontWeight:700,color:"#ec4899"}}>SL · Current holiday year</h3>
              </div>
              <div style={{marginBottom:14}}>{card(slP,slCurYear,false)}</div>
              {holidayList("SL",slCurYear,"#fdf2f8")}
              {D("SL",slCurYear).holidays.length===0&&<p style={{margin:0,color:"#94a3b8",fontSize:13}}>No holidays added yet for SL.</p>}
            </div>
          </div>
        )}

        {/* ── CALENDAR ── */}
        {view==="calendar"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}} style={{background:"white",border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:600}}>‹</button>
              <h2 style={{margin:0,fontSize:18,fontWeight:700,color:"#1e293b"}}>{MONTHS[calMonth]} {calYear}</h2>
              <button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}} style={{background:"white",border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:600}}>›</button>
            </div>
            <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
              {PEOPLE.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}><div style={{width:12,height:12,borderRadius:3,background:p.color}}/>{p.label}</div>)}
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}><div style={{width:12,height:12,borderRadius:3,background:"#fbbf24"}}/>Bank Holiday</div>
              {EVENT_COLORS.filter(c=>events.some(e=>e.color===c.id)).map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}><div style={{width:12,height:12,borderRadius:3,background:c.hex}}/>Event</div>
              ))}
            </div>
            <div style={{background:"white",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"#f8fafc"}}>
                {DAYS.map(d=><div key={d} style={{padding:"10px 0",textAlign:"center",fontSize:12,fontWeight:700,color:"#94a3b8"}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
                {Array.from({length:getFD(calYear,calMonth)}).map((_,i)=><div key={`e${i}`} style={{minHeight:72,borderTop:"1px solid #f1f5f9"}}/>)}
                {Array.from({length:getDIM(calYear,calMonth)}).map((_,i)=>{
                  const d=i+1,ds=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                  const isToday=ds===todayStr,weekend=isWeekend(ds),bhn=bhName(ds);
                  const dayHols=holsOn(ds),dayEvts=eventsOn(ds);
                  // Deduplicate by holiday id for display (joint hols appear once per person, show label once with both initials)
                  const holMap={};
                  for(const{person,holiday}of dayHols){
                    if(!holMap[holiday.id])holMap[holiday.id]={holiday,persons:[person]};
                    else holMap[holiday.id].persons.push(person);
                  }
                  return(
                    <div key={d} style={{minHeight:72,borderTop:"1px solid #f1f5f9",padding:4,background:isToday?"#fffbeb":bhn?"#fffdf5":weekend?"#fafafa":"white"}}>
                      <div style={{fontSize:12,fontWeight:isToday?800:400,color:isToday?"#f59e0b":bhn?"#d97706":weekend?"#cbd5e1":"#334155",marginBottom:2}}>{d}</div>
                      {bhn&&<div style={{background:"#fbbf24",color:"white",borderRadius:4,fontSize:9,fontWeight:700,padding:"1px 4px",marginBottom:2,lineHeight:1.3,wordBreak:"break-word"}}>{bhn}</div>}
                      {Object.values(holMap).map(({holiday:h,persons})=>{
                        const color=persons.length>1?"#7c3aed":persons[0].color;
                        const initials=persons.map(p=>p.id).join("+");
                        return(
                          <div key={h.id} title={h.label} style={{background:color,color:"white",borderRadius:4,fontSize:9,fontWeight:600,padding:"1px 5px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            <span style={{opacity:0.85,fontSize:8}}>{initials} · </span>{h.label}
                          </div>
                        );
                      })}
                      {dayEvts.map(ev=>{const c=EVENT_COLORS.find(x=>x.id===ev.color)||EVENT_COLORS[0];return<div key={ev.id} style={{background:c.hex,color:"white",borderRadius:4,fontSize:9,fontWeight:600,padding:"1px 4px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={ev.title}>{ev.title}</div>;})}
                    </div>
                  );
                })}
              </div>
            </div>
            {events.filter(e=>e.date.startsWith(`${calYear}-${String(calMonth+1).padStart(2,"0")}`)).length>0&&(
              <div style={{marginTop:16,background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:10}}>EVENTS THIS MONTH</div>
                {events.filter(e=>e.date.startsWith(`${calYear}-${String(calMonth+1).padStart(2,"0")}`)).sort((a,b)=>a.date.localeCompare(b.date)).map(ev=>{
                  const c=EVENT_COLORS.find(x=>x.id===ev.color)||EVENT_COLORS[0];
                  return<div key={ev.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:8,background:"#f8fafc",marginBottom:6,borderLeft:`4px solid ${c.hex}`}}>
                    <div><div style={{fontWeight:600,fontSize:14,color:"#1e293b"}}>{ev.title}</div><div style={{fontSize:12,color:"#64748b"}}>{fmtDate(ev.date)}</div></div>
                    <button onClick={()=>removeEvent(ev.id)} style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#94a3b8",fontSize:12}}>Remove</button>
                  </div>;
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TO-DO ── */}
        {view==="todo"&&(()=>{
          const allHols=getAllHolidays();
          const upcoming=allHols.filter(h=>h.end>=todayStr);
          const past=allHols.filter(h=>h.end<todayStr);
          const renderHolTodo=(h)=>{
            const tasks=getHolTasks(h);
            const cd=calDays(h.start,h.end);
            const du=daysUntil(h.start,todayStr);
            const isActive=h.start<=todayStr&&h.end>=todayStr;
            return(
              <div key={h.id} style={{background:"white",borderRadius:14,padding:20,marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",borderLeft:`4px solid ${h.personColor}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>{h.label}</span>
                      {h.personLabel==="Both"?<span style={{fontSize:11,background:"#f5f3ff",color:"#7c3aed",borderRadius:4,padding:"2px 8px",fontWeight:600}}>MK & SL</span>:<span style={{fontSize:11,color:h.personColor,borderRadius:4,padding:"2px 8px",fontWeight:600,border:`1px solid ${h.personColor}33`}}>{h.personLabel}</span>}
                      {isActive&&<span style={{fontSize:11,background:"#dcfce7",color:"#16a34a",borderRadius:4,padding:"2px 8px",fontWeight:600}}>🟢 Ongoing</span>}
                      {h.days===0&&<span style={{fontSize:11,background:"#f0fdf4",color:"#16a34a",borderRadius:4,padding:"2px 8px",fontWeight:600}}>🏖️ No entitlement</span>}
                    </div>
                    <div style={{fontSize:13,color:"#64748b",marginTop:4}}>{fmtDate(h.start)} – {fmtDate(h.end)} · {cd} calendar day{cd!==1?"s":""}{h.days>0?` · ${h.days} working day${h.days!==1?"s":""} used`:""}</div>
                  </div>
                  {!isActive&&du>0&&<div style={{fontSize:12,color:"#94a3b8"}}><div style={{fontWeight:700,color:"#f59e0b",fontSize:14}}>{du} days to go</div></div>}
                </div>
                {tasks.map(task=>{
                  const done=!!(todos[h.id]?.[task.id]);
                  const overdue=!done&&task.due<todayStr;
                  const dtu=daysUntil(task.due,todayStr);
                  return(
                    <div key={task.id} onClick={()=>toggleTodo(h.id,task.id)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 12px",borderRadius:10,marginBottom:8,cursor:"pointer",background:done?"#f0fdf4":overdue?"#fef2f2":"#f8fafc",border:`1px solid ${done?"#bbf7d0":overdue?"#fecaca":"#e2e8f0"}`,transition:"all 0.15s"}}>
                      <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${done?"#22c55e":overdue?"#ef4444":"#cbd5e1"}`,background:done?"#22c55e":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                        {done&&<span style={{color:"white",fontSize:12}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:14,color:"#1e293b",textDecoration:done?"line-through":"none",opacity:done?0.6:1}}>{task.icon} {task.label}</div>
                        <div style={{fontSize:12,color:done?"#94a3b8":overdue?"#ef4444":dtu<=14?"#f59e0b":"#64748b",marginTop:2}}>
                          Due: {fmtDate(task.due)} {task.subLabel}{!done&&overdue?" · ⚠️ Overdue":""}{!done&&!overdue&&dtu<=14?` · ${dtu} days left`:""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          };
          return(
            <div>
              <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:700,color:"#1e293b"}}>📋 Holiday To-do</h2>
              {upcoming.length===0&&past.length===0&&<p style={{color:"#94a3b8"}}>No holidays added yet.</p>}
              {upcoming.length>0&&<><div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:12,letterSpacing:"0.05em"}}>UPCOMING & ONGOING</div>{upcoming.map(renderHolTodo)}</>}
              {past.length>0&&<><div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:12,marginTop:20,letterSpacing:"0.05em"}}>PAST TRIPS</div>{past.map(renderHolTodo)}</>}
            </div>
          );
        })()}

        {/* ── ITINERARY ── */}
        {view==="reminders"&&(()=>{
          const allHols=getAllHolidays();
          const upcoming=allHols.filter(h=>h.end>=todayStr);
          const past=allHols.filter(h=>h.end<todayStr);
          const renderHolItin=(h)=>{
            const isOpen=openItinId===h.id;
            const itinDays=getItinDays(h);
            const cd=calDays(h.start,h.end);
            const filledDays=Object.keys(itin[h.id]||{}).filter(k=>ITIN_FIELDS.some(f=>(itin[h.id]?.[k]?.[f.id]||"").trim())).length;
            return(
              <div key={h.id} style={{background:"white",borderRadius:14,marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden",border:"1px solid #f1f5f9"}}>
                <div onClick={()=>setOpenItinId(isOpen?null:h.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",cursor:"pointer",borderLeft:`4px solid ${h.personColor}`}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:700,fontSize:15,color:"#1e293b"}}>{h.label}</span>
                      {h.personLabel==="Both"?<span style={{fontSize:11,background:"#f5f3ff",color:"#7c3aed",borderRadius:4,padding:"1px 7px",fontWeight:600}}>MK & SL</span>:<span style={{fontSize:11,color:h.personColor,fontWeight:600}}>{h.personLabel}</span>}
                    </div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{fmtDate(h.start)} – {fmtDate(h.end)} · {cd} day{cd!==1?"s":""} · {filledDays}/{itinDays.length} days planned</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {filledDays>0&&<div style={{background:"#f0fdf4",color:"#16a34a",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{Math.round(filledDays/itinDays.length*100)}% planned</div>}
                    <span style={{color:"#94a3b8",fontSize:18}}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>
                {isOpen&&(
                  <div style={{padding:"0 20px 20px",borderTop:"1px solid #f1f5f9"}}>
                    {itinDays.map(({idx,date})=>{
                      const day=itin[h.id]?.[idx]||{};
                      const filled=ITIN_FIELDS.some(f=>(day[f.id]||"").trim());
                      return(
                        <div key={idx} style={{marginTop:14,background:filled?"#fafffe":"#fafafa",borderRadius:10,padding:14,border:`1px solid ${filled?"#d1fae5":"#f1f5f9"}`}}>
                          <div style={{fontWeight:700,fontSize:13,color:"#475569",marginBottom:10}}>Day {idx+1} &nbsp;·&nbsp; <span style={{color:"#94a3b8",fontWeight:400}}>{fmtDate(date)}{isWeekend(date)?" (weekend)":isBH(date)?` (${bhName(date)})`:""}</span></div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                            {ITIN_FIELDS.slice(0,3).map(f=>(
                              <div key={f.id}>
                                <label style={{display:"block",fontSize:11,fontWeight:600,color:"#94a3b8",marginBottom:3}}>{f.label.toUpperCase()}</label>
                                <input value={day[f.id]||""} onChange={e=>updateItinDay(h.id,idx,f.id,e.target.value)} placeholder={`Enter ${f.label.toLowerCase()}…`}
                                  style={{width:"100%",padding:"7px 10px",border:"1px solid #e2e8f0",borderRadius:7,fontSize:13,boxSizing:"border-box",outline:"none"}}/>
                              </div>
                            ))}
                          </div>
                          <div>
                            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#94a3b8",marginBottom:3}}>DETAILS</label>
                            <textarea value={day.details||""} onChange={e=>updateItinDay(h.id,idx,"details",e.target.value)} placeholder="Notes, activities, bookings…" rows={2}
                              style={{width:"100%",padding:"7px 10px",border:"1px solid #e2e8f0",borderRadius:7,fontSize:13,boxSizing:"border-box",resize:"vertical",outline:"none"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          };
          return(
            <div>
              <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:700,color:"#1e293b"}}>🗺️ Itinerary Planner</h2>
              {upcoming.length===0&&past.length===0&&<p style={{color:"#94a3b8"}}>No holidays added yet.</p>}
              {upcoming.length>0&&<><div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:12,letterSpacing:"0.05em"}}>UPCOMING & ONGOING</div>{upcoming.map(renderHolItin)}</>}
              {past.length>0&&<><div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:12,marginTop:20,letterSpacing:"0.05em"}}>PAST TRIPS</div>{past.map(renderHolItin)}</>}
            </div>
          );
        })()}

        {/* ── ADD HOLIDAY ── */}
        {view==="add"&&(
          <div style={{background:"white",borderRadius:16,padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",maxWidth:500}}>
            <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:700,color:"#1e293b"}}>Add a Holiday</h2>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>Person</label>
              <div style={{display:"flex",gap:8}}>
                {PERSON_OPTIONS.map(p=>(
                  <button key={p.id} onClick={()=>{setFormError("");setForm(f=>({...f,person:p.id,start:"",end:""}));}} style={{flex:1,padding:"10px 0",border:`2px solid ${form.person===p.id?p.color:"#e2e8f0"}`,borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,background:form.person===p.id?p.light:"white",color:form.person===p.id?p.color:"#94a3b8"}}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>Label (optional)</label>
              <input value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} placeholder="e.g. Summer holiday"
                style={{width:"100%",padding:"10px 12px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>Start</label>
                <input type="date" value={form.start} onChange={e=>{setFormError("");setForm(f=>({...f,start:e.target.value,end:f.end<e.target.value?e.target.value:f.end}));}}
                  style={{width:"100%",padding:"10px 8px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>End</label>
                <input type="date" value={form.end} min={form.start||undefined} onChange={e=>{setFormError("");setForm(f=>({...f,end:e.target.value}));}}
                  style={{width:"100%",padding:"10px 8px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
              </div>
            </div>
            {preview&&(
              <div style={{marginBottom:16}}>
                <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,padding:"10px 14px",marginBottom:8,fontSize:13,color:"#0369a1"}}>
                  📅 <strong>{preview.days}</strong> working day{preview.days!==1?"s":""} used &nbsp;·&nbsp; {calDays(form.start,form.end)} calendar day{calDays(form.start,form.end)!==1?"s":""}
                  {preview.days===0&&<span style={{marginLeft:8,background:"#e0f2fe",borderRadius:4,padding:"1px 7px",fontSize:12,fontWeight:600}}>🏖️ No entitlement used</span>}
                </div>
                {preview.isBoth?preview.infos.map(info=>(
                  preview.days>0&&<div key={info.person.id} style={{background:info.after<0?"#fef2f2":"#f0fdf4",border:`1px solid ${info.after<0?"#fecaca":"#bbf7d0"}`,borderRadius:8,padding:"8px 14px",marginBottom:6,fontSize:13,color:info.after<0?"#b91c1c":"#166534",display:"flex",justifyContent:"space-between"}}>
                    <span><strong>{info.person.label}</strong>: {info.rem} remaining → <strong>{Math.max(0,info.after)} after</strong></span>
                    <span style={{fontSize:11,opacity:0.8}}>{yearLabel(info.person,info.by)}</span>
                  </div>
                )):(preview.days>0&&(
                  <div style={{background:preview.after<0?"#fef2f2":"#f0fdf4",border:`1px solid ${preview.after<0?"#fecaca":"#bbf7d0"}`,borderRadius:8,padding:"8px 14px",fontSize:13,color:preview.after<0?"#b91c1c":"#166534",display:"flex",justifyContent:"space-between"}}>
                    <span>{preview.rem} remaining → <strong>{Math.max(0,preview.after)} after</strong></span>
                    <span style={{fontSize:11,opacity:0.8}}>{yearLabel(preview.person,preview.by)}</span>
                  </div>
                ))}
              </div>
            )}
            {formError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#b91c1c"}}>{formError}</div>}
            <button onClick={addHoliday} style={{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#6366f1,#ec4899)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:15,cursor:"pointer"}}>Add Holiday</button>
          </div>
        )}

        {/* ── ADD EVENT ── */}
        {view==="addevent"&&(
          <div style={{background:"white",borderRadius:16,padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",maxWidth:480}}>
            <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:700,color:"#1e293b"}}>Add an Event</h2>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>Title</label>
              <input value={evtForm.title} onChange={e=>setEvtForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Wedding, Birthday, Deadline…"
                style={{width:"100%",padding:"10px 12px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>Date</label>
              <input type="date" value={evtForm.date} onChange={e=>setEvtForm(f=>({...f,date:e.target.value}))}
                style={{width:"100%",padding:"10px 8px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:24}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:8}}>Colour</label>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {EVENT_COLORS.map(c=>(
                  <button key={c.id} onClick={()=>setEvtForm(f=>({...f,color:c.id}))} style={{width:36,height:36,borderRadius:"50%",background:c.hex,border:evtForm.color===c.id?"3px solid #1e293b":"3px solid transparent",cursor:"pointer",transform:evtForm.color===c.id?"scale(1.2)":"scale(1)",transition:"transform 0.1s"}}/>
                ))}
              </div>
            </div>
            {evtError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#b91c1c"}}>{evtError}</div>}
            <button onClick={addEvent} style={{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#6366f1,#ec4899)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:15,cursor:"pointer"}}>Add Event</button>
            {events.length>0&&(
              <div style={{marginTop:28}}>
                <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:10}}>ALL EVENTS</div>
                {[...events].sort((a,b)=>a.date.localeCompare(b.date)).map(ev=>{const c=EVENT_COLORS.find(x=>x.id===ev.color)||EVENT_COLORS[0];return(
                  <div key={ev.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:8,background:"#f8fafc",marginBottom:6,borderLeft:`4px solid ${c.hex}`}}>
                    <div><div style={{fontWeight:600,fontSize:14,color:"#1e293b"}}>{ev.title}</div><div style={{fontSize:12,color:"#64748b"}}>{fmtDate(ev.date)}</div></div>
                    <button onClick={()=>removeEvent(ev.id)} style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#94a3b8",fontSize:12}}>Remove</button>
                  </div>
                );})}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
