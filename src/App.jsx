import { useState, useEffect } from "react";

const PEOPLE = [
  { id:"MK", label:"MK", allowance:25, color:"#6366f1", light:"#eef2ff", yearStartMonth:3 },
  { id:"SL", label:"SL", allowance:25, color:"#ec4899", light:"#fdf2f8", yearStartMonth:0 },
];
const PERSON_OPTIONS = [...PEOPLE, { id:"BOTH", label:"Both MK & SL", color:"#7c3aed", light:"#f5f3ff" }];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const EVENT_COLORS=[{id:"red",hex:"#ef4444"},{id:"orange",hex:"#f97316"},{id:"teal",hex:"#14b8a6"},{id:"green",hex:"#22c55e"},{id:"sky",hex:"#0ea5e9"},{id:"rose",hex:"#f43f5e"}];
const EMPTY_FORM={person:"MK",start:"",end:"",label:"",startType:"full",endType:"full",ovr:{MK:"",SL:""}};

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
const fmt=n=>Number.isInteger(n)?String(n):n.toFixed(1);
const round05=n=>Math.round(n*2)/2;
function getBaseYear(person,date){const m=date.getMonth(),y=date.getFullYear();return m>=person.yearStartMonth?y:y-1;}
function getYearRange(person,by){const sm=person.yearStartMonth;return{start:`${by}-${String(sm+1).padStart(2,"0")}-01`,end:tds(new Date(by+1,sm,0))};}
function yearLabel(person,by){const{start,end}=getYearRange(person,by);const f=s=>{const[y,m]=s.split("-");return`${MONTHS[+m-1].slice(0,3)} ${y}`;};return`${f(start)} – ${f(end)}`;}
function isWeekend(ds){const d=new Date(ds+"T12:00:00");return d.getDay()===0||d.getDay()===6;}
function isNW(ds){return isWeekend(ds)||isBH(ds);}

// Day types: "full" | "am" (morning off) | "pm" (afternoon off)
function normTypes(start,end,st,et){
  if(!start||!end)return{st:"full",et:"full"};
  if(start===end)return{st,et:st};
  return{st:st==="pm"?"pm":"full",et:et==="am"?"am":"full"};
}
function countWD(s,e,st,et){
  let c=0;const sd=new Date(s+"T12:00:00"),ed=new Date(e+"T12:00:00");
  for(let d=new Date(sd);d<=ed;d.setDate(d.getDate()+1)){
    const ds=tds(d);
    if(isNW(ds))continue;
    let w=1;
    if(s===e){if(st!=="full")w=0.5;}
    else{if(ds===s&&st!=="full")w=0.5;if(ds===e&&et!=="full")w=0.5;}
    c+=w;
  }
  return c;
}
function parseOvr(str){
  if(str===""||str===undefined||str===null)return{value:null,valid:true};
  const n=parseFloat(str);
  if(isNaN(n)||n<0||(n*2)%1!==0)return{value:null,valid:false};
  return{value:n,valid:true};
}
function halfMarker(h,ds){
  const st=h.startType||"full",et=h.endType||"full";
  if(h.start===h.end){if(st==="am")return"½ AM";if(st==="pm")return"½ PM";return null;}
  if(ds===h.start&&st==="pm")return"½ PM";
  if(ds===h.end&&et==="am")return"½ AM";
  return null;
}
function halfDesc(h){
  const st=h.startType||"full",et=h.endType||"full";
  if(h.start===h.end){if(st==="am")return"morning only";if(st==="pm")return"afternoon only";return"";}
  const p=[];if(st==="pm")p.push("first day afternoon only");if(et==="am")p.push("last day morning only");
  return p.join(", ");
}
const isHalf=h=>halfDesc(h)!=="";
function chargeText(perPerson){
  const multi=perPerson.length>1;
  return perPerson.map(e=>{
    let t=e.days===0?"no entitlement used":`${fmt(e.days)} day${e.days===1?"":"s"} charged`;
    if(e.manual)t+=` (auto: ${fmt(e.autoDays)})`;
    return multi?`${e.person.label}: ${t}`:t;
  }).join(" · ");
}

function calDays(s,e){return Math.round((new Date(e+"T12:00:00")-new Date(s+"T12:00:00"))/86400000)+1;}
function subMos(ds,n){const d=new Date(ds+"T12:00:00");d.setMonth(d.getMonth()-n);return tds(d);}
function subDays(ds,n){const d=new Date(ds+"T12:00:00");d.setDate(d.getDate()-n);return tds(d);}
function reminderMos(n){return n<=3?3:n<=6?4:n<=9?5:6;}
function getHolTasks(h){
  const mo=reminderMos(calDays(h.start,h.end));
  const tasks=[];
  const multi=h.perPerson.length>1;
  for(const e of h.perPerson){
    if(e.days>0){
      const reqMo=e.days<=5?1:2;
      tasks.push({id:multi?`request-${e.person.id}`:"request",icon:"📨",label:`Request holiday from employer${multi?` (${e.person.label})`:""}`,subLabel:`(${reqMo} month${reqMo>1?"s":""} before departure — ${fmt(e.days)} day${e.days===1?"":"s"})`,due:subMos(h.start,reqMo)});
    }
  }
  tasks.push(
    {id:"book",icon:"🏨",label:"Book accommodation, transportation & flights",subLabel:`(${mo} months before departure)`,due:subMos(h.start,mo)},
    {id:"plan",icon:"📋",label:"Detailed planning",subLabel:"(1 month before departure)",due:subMos(h.start,1)},
    {id:"check",icon:"✅",label:"Final check — confirm all plans",subLabel:"(1 week before departure)",due:subDays(h.start,7)},
  );
  return tasks;
}
function fmtDate(s){if(!s)return"";const[y,m,d]=s.split("-");return new Date(+y,+m-1,+d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});}
function daysUntil(ds,todayStr){return Math.round((new Date(ds+"T12:00:00")-new Date(todayStr+"T12:00:00"))/86400000);}

// ── Storage ───────────────────────────────────────────────────────────────────
function loadKey(k){const r={holidays:[],carryover:0,coSet:false,initUsed:0,initSet:false};try{const v=localStorage.getItem(`hols-${k}`);if(v)r.holidays=JSON.parse(v);}catch{}try{const v=localStorage.getItem(`co-${k}`);if(v){r.carryover=JSON.parse(v);r.coSet=true;}}catch{}try{const v=localStorage.getItem(`init-${k}`);if(v){r.initUsed=JSON.parse(v);r.initSet=true;}}catch{}return r;}
function persistKey(k,e){try{localStorage.setItem(`hols-${k}`,JSON.stringify(e.holidays));}catch{}try{if(e.coSet)localStorage.setItem(`co-${k}`,JSON.stringify(e.carryover));else localStorage.removeItem(`co-${k}`);}catch{}try{if(e.initSet)localStorage.setItem(`init-${k}`,JSON.stringify(e.initUsed));}catch{}}
const lsGet=(k,fb)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{return fb;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};

const selStyle={width:"100%",padding:"10px 8px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box",background:"white"};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App(){
  const today=new Date(),todayStr=tds(today);
  const mkP=PEOPLE[0],slP=PEOPLE[1];
  const mkCurYear=getBaseYear(mkP,today);
  const slCurYear=getBaseYear(slP,today);

  const[view,setView]=useState("dashboard");
  const[dashYear,setDashYear]=useState("current");
  const[data,setData]=useState({});
  const[events,setEvents]=useState([]);
  const[todos,setTodos]=useState({});
  const[editCO,setEditCO]=useState(null);const[coInput,setCOInput]=useState("");
  const[editRem,setEditRem]=useState(null);const[remInput,setRemInput]=useState("");
  const[form,setForm]=useState(EMPTY_FORM);
  const[editingId,setEditingId]=useState(null);
  const[formError,setFormError]=useState("");
  const[evtForm,setEvtForm]=useState({date:"",title:"",color:"red"});
  const[evtError,setEvtError]=useState("");
  const[calMonth,setCalMonth]=useState(today.getMonth());
  const[calYear,setCalYear]=useState(today.getFullYear());

  useEffect(()=>{
    const fresh={},curY=today.getFullYear();
    for(const p of PEOPLE)for(let y=curY-3;y<=curY+6;y++){const k=sKey(p.id,y);fresh[k]=loadKey(k);}
    setData(fresh);
    setEvents(lsGet("cal-events",[]));
    setTodos(lsGet("todos",{}));
  },[]);

  const D=(pid,yr)=>data[sKey(pid,yr)]||{holidays:[],carryover:0,coSet:false,initUsed:0,initSet:false};
  const bookedDays=(pid,yr)=>D(pid,yr).holidays.reduce((s,h)=>s+h.days,0);
  const usedDays=(pid,yr)=>D(pid,yr).initUsed+bookedDays(pid,yr);
  const hasActivity=(pid,yr)=>{const d=D(pid,yr);return d.coSet||d.initSet||d.holidays.length>0;};
  // Carry over = what's left from the previous year (including that year's own carry over),
  // unless set manually. Future years always chain from the year before; past years only
  // chain if they actually hold data (so the first year you use the app doesn't start at 25).
  const effectiveCO=(person,yr)=>{
    const d=D(person.id,yr);
    if(d.coSet)return d.carryover;
    const prev=yr-1;
    if(prev<getBaseYear(person,today)&&!hasActivity(person.id,prev))return 0;
    return Math.max(0,remDays(person,prev));
  };
  const remDays=(person,yr)=>(person.allowance+effectiveCO(person,yr))-usedDays(person.id,yr);

  // All stored records (one per person) for a given holiday id
  function findRecords(id){
    const recs=[];
    for(const[k,v]of Object.entries(data)){
      const[pid,yrStr]=k.split("-");
      const person=PEOPLE.find(p=>p.id===pid);
      if(!person)continue;
      const h=(v.holidays||[]).find(x=>x.id===id);
      if(h)recs.push({person,yr:+yrStr,holiday:h});
    }
    return recs;
  }

  function getAllHolidays(){
    const map={};
    for(const[k,v]of Object.entries(data)){
      const pid=k.split("-")[0];
      const person=PEOPLE.find(p=>p.id===pid);
      if(!person||!v.holidays)continue;
      for(const h of v.holidays){
        const entry={person,days:h.days,autoDays:h.autoDays!==undefined?h.autoDays:h.days,manual:!!h.manual};
        if(!map[h.id])map[h.id]={...h,perPerson:[entry],personLabel:person.label,personColor:person.color};
        else if(!map[h.id].perPerson.find(e=>e.person.id===pid)){map[h.id].perPerson.push(entry);map[h.id].personLabel="Both";map[h.id].personColor="#7c3aed";}
      }
    }
    return Object.values(map).map(h=>({...h,perPerson:[...h.perPerson].sort((a,b)=>PEOPLE.indexOf(a.person)-PEOPLE.indexOf(b.person))})).sort((a,b)=>a.start.localeCompare(b.start));
  }

  function holsOn(ds){
    const res=[];
    for(const p of PEOPLE){
      for(const[k,v]of Object.entries(data)){
        if(!k.startsWith(p.id+"-"))continue;
        for(const h of(v.holidays||[])){
          if(ds>=h.start&&ds<=h.end&&!res.find(r=>r.holiday.id===h.id&&r.person.id===p.id))res.push({person:p,holiday:h});
        }
      }
    }
    return res;
  }

  function updateKey(k,updates){
    setData(prev=>{const next={...(prev[k]||{holidays:[],carryover:0,coSet:false,initUsed:0,initSet:false}),...updates};persistKey(k,next);return{...prev,[k]:next};});
  }
  function saveCarryover(k){updateKey(k,{carryover:round05(Math.max(0,parseFloat(coInput)||0)),coSet:true});setEditCO(null);}
  function saveInitRem(k,person,baseYear){
    const entered=round05(Math.max(0,parseFloat(remInput)||0));
    const co=effectiveCO(person,baseYear);
    const booked=bookedDays(person.id,baseYear);
    updateKey(k,{initUsed:Math.max(0,person.allowance+co-entered-booked),initSet:true});
    setEditRem(null);
  }
  function toggleTodo(hid,taskId){const u={...todos,[hid]:{...(todos[hid]||{}),[taskId]:!(todos[hid]?.[taskId])}};setTodos(u);lsSet("todos",u);}

  // ── Navigation / edit mode ──
  function goView(v){
    if(editingId!==null&&v!=="add"){setEditingId(null);setForm(EMPTY_FORM);setFormError("");}
    setView(v);
  }
  function startEdit(h){
    const recs=findRecords(h.id);
    const base=recs[0]?.holiday||h;
    const ovr={MK:"",SL:""};
    for(const r of recs){if(r.holiday.manual)ovr[r.person.id]=String(r.holiday.days);}
    const person=recs.length>1?"BOTH":(recs[0]?.person.id||"MK");
    setForm({person,start:base.start,end:base.end,label:base.label,startType:base.startType||"full",endType:base.endType||"full",ovr});
    setFormError("");
    setEditingId(h.id);
    setView("add");
  }
  function cancelEdit(){
    setEditingId(null);setForm(EMPTY_FORM);setFormError("");setView("dashboard");
  }

  // ── Form derived values ──
  const types=normTypes(form.start,form.end,form.startType,form.endType);
  const isSingle=!!(form.start&&form.end&&form.start===form.end);
  const datesOk=!!(form.start&&form.end&&form.end>=form.start);
  const autoDays=datesOk?countWD(form.start,form.end,types.st,types.et):0;
  const formTargets=form.person==="BOTH"?PEOPLE:[PEOPLE.find(p=>p.id===form.person)];
  const editRecs=editingId!==null?findRecords(editingId):[];
  const preview=datesOk?{auto:autoDays,infos:formTargets.map(p=>{
    const by=getBaseYear(p,new Date(form.start+"T12:00:00"));
    const o=parseOvr(form.ovr[p.id]);
    const charged=o.valid&&o.value!==null?o.value:autoDays;
    const old=editRecs.find(r=>r.person.id===p.id);
    const own=old&&old.yr===by?old.holiday.days:0;
    const rem=remDays(p,by)+own;
    return{person:p,by,o,charged,rem,after:rem-charged};
  })}:null;

  function submitHoliday(){
    setFormError("");
    const{person,start,end,label}=form;
    if(!start||!end)return setFormError("Please select start and end dates.");
    if(end<start)return setFormError("End must be after start.");
    const{st,et}=normTypes(start,end,form.startType,form.endType);
    const auto=countWD(start,end,st,et);
    const targets=person==="BOTH"?PEOPLE:[PEOPLE.find(x=>x.id===person)];
    const recs=editingId!==null?findRecords(editingId):[];
    const plan=[];
    for(const p of targets){
      const o=parseOvr(form.ovr[p.id]);
      if(!o.valid)return setFormError(`Days charged${targets.length>1?` for ${p.label}`:""} must be 0 or more, in steps of 0.5.`);
      const charged=o.value!==null?o.value:auto;
      const by=getBaseYear(p,new Date(start+"T12:00:00"));
      const old=recs.find(r=>r.person.id===p.id);
      const own=old&&old.yr===by?old.holiday.days:0;
      const rem=remDays(p,by)+own;
      if(charged>0&&charged>rem)return setFormError(`Only ${fmt(rem)} days remaining for ${p.label} (${yearLabel(p,by)}).`);
      plan.push({p,by,charged,manual:o.value!==null&&o.value!==auto,old});
    }
    const id=editingId!==null?editingId:Date.now();
    for(const{p,by,charged,manual,old}of plan){
      const rec={id,start,end,label:label||"Holiday",days:charged,autoDays:auto,manual,startType:st,endType:et,...(person==="BOTH"?{joint:true}:{})};
      if(old&&old.yr===by){
        updateKey(sKey(p.id,by),{holidays:D(p.id,by).holidays.map(h=>h.id===id?rec:h)});
      }else{
        if(old)updateKey(sKey(p.id,old.yr),{holidays:D(p.id,old.yr).holidays.filter(h=>h.id!==id)});
        updateKey(sKey(p.id,by),{holidays:[...D(p.id,by).holidays,rec]});
      }
    }
    if(editingId!==null){setEditingId(null);setForm(EMPTY_FORM);}
    else setForm(f=>({...f,start:"",end:"",label:"",startType:"full",endType:"full",ovr:{MK:"",SL:""}}));
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
    const co=effectiveCO(person,baseYear);
    const eff=person.allowance+co,u=usedDays(person.id,baseYear),rem=eff-u,pct=Math.min(100,Math.max(0,(u/eff)*100));
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
                <input type="number" min="0" step="0.5" max={eff} value={remInput} onChange={e=>setRemInput(e.target.value)} autoFocus
                  style={{width:76,padding:"4px 8px",border:`2px solid ${person.color}`,borderRadius:8,fontSize:22,fontWeight:800,color:person.color,outline:"none",boxSizing:"border-box"}}/>
                <button onClick={()=>saveInitRem(k,person,baseYear)} style={{padding:"4px 10px",background:person.color,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>Save</button>
                <button onClick={()=>setEditRem(null)} style={{padding:"4px 8px",background:"none",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",fontSize:12,color:"#94a3b8"}}>✕</button>
              </div>
            ):(
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <div style={{fontSize:42,fontWeight:800,color:person.color,lineHeight:1}}>{fmt(rem)}</div>
                <button onClick={()=>{setEditRem(k);setRemInput(rem);setEditCO(null);}} style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"2px 7px",cursor:"pointer",color:"#94a3b8",fontSize:11}}>✏️</button>
              </div>
            )}
            <div style={{fontSize:12,color:"#94a3b8"}}>days remaining</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"#94a3b8"}}>Used / Total</div>
            <div style={{fontSize:22,fontWeight:700,color:"#334155"}}>{fmt(u)} / {fmt(eff)}</div>
            <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>Base {person.allowance}{co>0?` + ${fmt(co)} carried over`:""}{d.initUsed>0?` · Pre-loaded: ${fmt(d.initUsed)}`:""}</div>
          </div>
        </div>
        <div style={{background:person.light,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12}}>
          {editCO===k?(
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{color:"#64748b",fontWeight:600}}>Carry over:</span>
              <input type="number" min="0" step="0.5" max={person.allowance} value={coInput} onChange={e=>setCOInput(e.target.value)} style={{width:64,padding:"2px 6px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:12}}/>
              <button onClick={()=>saveCarryover(k)} style={{padding:"2px 10px",background:person.color,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>Save</button>
              <button onClick={()=>setEditCO(null)} style={{padding:"2px 8px",background:"none",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",fontSize:12,color:"#94a3b8"}}>Cancel</button>
              {d.coSet&&<button onClick={()=>{updateKey(k,{coSet:false,carryover:0});setEditCO(null);}} style={{background:"none",border:"none",color:"#6366f1",cursor:"pointer",fontSize:12,fontWeight:600,padding:0,textDecoration:"underline"}}>Reset to automatic</button>}
            </div>
          ):(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{color:"#64748b"}}><span style={{fontWeight:600}}>Carry over: </span><span style={{color:person.color,fontWeight:700}}>{fmt(co)} days</span>{d.coSet?<span style={{color:"#c2410c",fontStyle:"italic",marginLeft:4}}>(manual)</span>:(co>0&&<span style={{color:"#94a3b8",fontStyle:"italic",marginLeft:4}}>(auto: left over from previous year)</span>)}</div>
              <button onClick={()=>{setEditCO(k);setCOInput(co);setEditRem(null);}} style={{background:"none",border:"1px solid #cbd5e1",borderRadius:6,padding:"2px 8px",cursor:"pointer",color:"#64748b",fontSize:11}}>✏️ Edit</button>
            </div>
          )}
        </div>
        <div style={{background:"#f1f5f9",borderRadius:99,height:8,overflow:"hidden"}}><div style={{width:`${pct}%`,background:person.color,height:"100%",borderRadius:99,transition:"width 0.4s"}}/></div>
      </div>
    );
  }

  const tag=(text,bg,color)=><span style={{marginLeft:6,fontSize:11,background:bg,color,borderRadius:4,padding:"1px 6px",fontWeight:600}}>{text}</span>;

  function holidayList(pid,yr,bgColor){
    const hols=[...D(pid,yr).holidays].sort((a,b)=>a.start.localeCompare(b.start));
    if(!hols.length)return null;
    return(
      <div key={`list-${pid}-${yr}`} style={{background:"white",borderRadius:12,padding:16,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:12,fontWeight:600,color:"#94a3b8",marginBottom:8}}>{yearLabel(PEOPLE.find(p=>p.id===pid),yr)}</div>
        {hols.map(h=>{
          const per=[{person:PEOPLE.find(p=>p.id===pid),days:h.days,autoDays:h.autoDays!==undefined?h.autoDays:h.days,manual:!!h.manual}];
          const hd=halfDesc(h);
          return(
            <div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:8,background:bgColor,marginBottom:6,gap:8}}>
              <div>
                <div style={{fontWeight:600,fontSize:14,color:"#1e293b"}}>
                  {h.label}
                  {h.joint&&tag("Joint","#f5f3ff","#7c3aed")}
                  {isHalf(h)&&tag("½ day","#fef3c7","#b45309")}
                  {h.manual&&tag("Manual","#fff7ed","#c2410c")}
                  {h.days===0&&tag("🏖️ No entitlement","#f0fdf4","#16a34a")}
                </div>
                <div style={{fontSize:12,color:"#64748b"}}>{fmtDate(h.start)} – {fmtDate(h.end)} · {chargeText(per)}{hd?` · ½ day: ${hd}`:""}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>startEdit(h)} style={{background:"white",border:"1px solid #c7d2fe",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#6366f1",fontSize:12,fontWeight:600}}>Edit</button>
                <button onClick={()=>removeHoliday(pid,yr,h.id)} style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#94a3b8",fontSize:12}}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Calendar ─────────────────────────────────────────────────────────────────
  const getDIM=(y,m)=>new Date(y,m+1,0).getDate();
  const getFD=(y,m)=>{const d=new Date(y,m,1).getDay();return d===0?6:d-1;};
  const eventsOn=ds=>events.filter(e=>e.date===ds);

  // ── Events lists ─────────────────────────────────────────────────────────────
  const upcomingEvts=[...events].filter(e=>e.date>=todayStr).sort((a,b)=>a.date.localeCompare(b.date));
  const pastEvts=[...events].filter(e=>e.date<todayStr).sort((a,b)=>b.date.localeCompare(a.date));
  const evtRow=(ev,muted)=>{
    const c=EVENT_COLORS.find(x=>x.id===ev.color)||EVENT_COLORS[0];
    return(
      <div key={ev.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:8,background:"#f8fafc",marginBottom:6,borderLeft:`4px solid ${c.hex}`,opacity:muted?0.6:1}}>
        <div><div style={{fontWeight:600,fontSize:14,color:"#1e293b"}}>{ev.title}</div><div style={{fontSize:12,color:"#64748b"}}>{fmtDate(ev.date)}</div></div>
        <button onClick={()=>removeEvent(ev.id)} style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#94a3b8",fontSize:12}}>Remove</button>
      </div>
    );
  };

  const NAV=[{id:"dashboard",label:"Dashboard"},{id:"calendar",label:"Calendar"},{id:"todo",label:"📋 To-do"},{id:"add",label:editingId!==null?"✏️ Edit Holiday":"+ Holiday"},{id:"addevent",label:"+ Event"}];
  const personOpts=editingId!==null?PERSON_OPTIONS.filter(p=>p.id===form.person):PERSON_OPTIONS;

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
              <button key={v.id} onClick={()=>goView(v.id)} style={{padding:"8px 14px",border:"none",cursor:"pointer",borderRadius:"8px 8px 0 0",background:view===v.id?"white":"rgba(255,255,255,0.15)",color:view===v.id?"#6366f1":"white",fontWeight:600,fontSize:13,whiteSpace:"nowrap"}}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:24}}>

        {/* ── DASHBOARD ── */}
        {view==="dashboard"&&(()=>{
          const off=dashYear==="next"?1:0;
          const mkYr=mkCurYear+off,slYr=slCurYear+off;
          const yrWord=off===1?"Next":"Current";
          return(
            <div>
              {/* Year toggle */}
              <div style={{display:"inline-flex",background:"#e2e8f0",borderRadius:10,padding:3,marginBottom:22}}>
                {[{id:"current",label:"Current year"},{id:"next",label:"Next year"}].map(o=>(
                  <button key={o.id} onClick={()=>setDashYear(o.id)} style={{padding:"7px 18px",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13,background:dashYear===o.id?"white":"transparent",color:dashYear===o.id?"#6366f1":"#64748b",boxShadow:dashYear===o.id?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>{o.label}</button>
                ))}
              </div>

              <div style={{marginBottom:28}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <div style={{width:4,height:18,borderRadius:2,background:"#6366f1"}}/>
                  <h3 style={{margin:0,fontSize:14,fontWeight:700,color:"#6366f1"}}>MK · {yrWord} holiday year</h3>
                </div>
                <div style={{marginBottom:14}}>{card(mkP,mkYr,off===1)}</div>
                {holidayList("MK",mkYr,"#eef2ff")}
                {D("MK",mkYr).holidays.length===0&&<p style={{margin:0,color:"#94a3b8",fontSize:13}}>No holidays added yet for MK in this year.</p>}
              </div>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <div style={{width:4,height:18,borderRadius:2,background:"#ec4899"}}/>
                  <h3 style={{margin:0,fontSize:14,fontWeight:700,color:"#ec4899"}}>SL · {yrWord} holiday year</h3>
                </div>
                <div style={{marginBottom:14}}>{card(slP,slYr,off===1)}</div>
                {holidayList("SL",slYr,"#fdf2f8")}
                {D("SL",slYr).holidays.length===0&&<p style={{margin:0,color:"#94a3b8",fontSize:13}}>No holidays added yet for SL in this year.</p>}
              </div>
            </div>
          );
        })()}

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
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}><div style={{width:12,height:12,borderRadius:3,background:"#7c3aed"}}/>Joint</div>
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
                        const marker=halfMarker(h,ds);
                        return(
                          <div key={h.id} title={`${h.label}${marker?` (${marker})`:""}`} style={{background:color,color:"white",borderRadius:4,fontSize:9,fontWeight:600,padding:"1px 5px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            <span style={{opacity:0.85,fontSize:8}}>{initials} · </span>{marker&&<b style={{marginRight:3}}>{marker}</b>}{h.label}
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
                {events.filter(e=>e.date.startsWith(`${calYear}-${String(calMonth+1).padStart(2,"0")}`)).sort((a,b)=>a.date.localeCompare(b.date)).map(ev=>evtRow(ev,false))}
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
            const hd=halfDesc(h);
            const anyManual=h.perPerson.some(e=>e.manual);
            const allZero=h.perPerson.every(e=>e.days===0);
            return(
              <div key={h.id} style={{background:"white",borderRadius:14,padding:20,marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",borderLeft:`4px solid ${h.personColor}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>{h.label}</span>
                      {h.personLabel==="Both"?<span style={{fontSize:11,background:"#f5f3ff",color:"#7c3aed",borderRadius:4,padding:"2px 8px",fontWeight:600}}>MK & SL</span>:<span style={{fontSize:11,color:h.personColor,borderRadius:4,padding:"2px 8px",fontWeight:600,border:`1px solid ${h.personColor}33`}}>{h.personLabel}</span>}
                      {isActive&&<span style={{fontSize:11,background:"#dcfce7",color:"#16a34a",borderRadius:4,padding:"2px 8px",fontWeight:600}}>🟢 Ongoing</span>}
                      {isHalf(h)&&<span style={{fontSize:11,background:"#fef3c7",color:"#b45309",borderRadius:4,padding:"2px 8px",fontWeight:600}}>½ day</span>}
                      {anyManual&&<span style={{fontSize:11,background:"#fff7ed",color:"#c2410c",borderRadius:4,padding:"2px 8px",fontWeight:600}}>Manual</span>}
                      {allZero&&<span style={{fontSize:11,background:"#f0fdf4",color:"#16a34a",borderRadius:4,padding:"2px 8px",fontWeight:600}}>🏖️ No entitlement</span>}
                    </div>
                    <div style={{fontSize:13,color:"#64748b",marginTop:4}}>{fmtDate(h.start)} – {fmtDate(h.end)} · {cd} calendar day{cd!==1?"s":""} · {chargeText(h.perPerson)}{hd?` · ½ day: ${hd}`:""}</div>
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

        {/* ── ADD / EDIT HOLIDAY ── */}
        {view==="add"&&(
          <div style={{background:"white",borderRadius:16,padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",maxWidth:520}}>
            <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:700,color:"#1e293b"}}>{editingId!==null?"Edit Holiday":"Add a Holiday"}</h2>

            {editingId!==null&&(
              <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"8px 12px",marginBottom:16,fontSize:12,color:"#1d4ed8"}}>
                ✏️ Editing {form.person==="BOTH"?"a joint holiday — changes apply to both MK and SL":`${form.person}'s holiday`}. The person can't be changed here; remove and re-add the holiday to do that.
              </div>
            )}

            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>Person</label>
              <div style={{display:"flex",gap:8}}>
                {personOpts.map(p=>(
                  <button key={p.id} onClick={()=>{setFormError("");setForm(f=>({...f,person:p.id}));}} style={{flex:1,padding:"10px 0",border:`2px solid ${form.person===p.id?p.color:"#e2e8f0"}`,borderRadius:8,cursor:editingId!==null?"default":"pointer",fontWeight:700,fontSize:13,background:form.person===p.id?p.light:"white",color:form.person===p.id?p.color:"#94a3b8"}}>
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

            {/* Day type (half days) */}
            {datesOk&&(isSingle?(
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>Day type</label>
                <select value={types.st} onChange={e=>{setFormError("");setForm(f=>({...f,startType:e.target.value}));}} style={selStyle}>
                  <option value="full">Full day</option>
                  <option value="am">Morning off (½ day)</option>
                  <option value="pm">Afternoon off (½ day)</option>
                </select>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                <div>
                  <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>First day</label>
                  <select value={types.st} onChange={e=>{setFormError("");setForm(f=>({...f,startType:e.target.value}));}} style={selStyle}>
                    <option value="full">Full day</option>
                    <option value="pm">Afternoon only (½ day)</option>
                  </select>
                </div>
                <div>
                  <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>Last day</label>
                  <select value={types.et} onChange={e=>{setFormError("");setForm(f=>({...f,endType:e.target.value}));}} style={selStyle}>
                    <option value="full">Full day</option>
                    <option value="am">Morning only (½ day)</option>
                  </select>
                </div>
              </div>
            ))}

            {preview&&(
              <div style={{marginBottom:16}}>
                <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:13,color:"#0369a1"}}>
                  📅 <strong>{fmt(preview.auto)}</strong> working day{preview.auto!==1?"s":""} (automatic, excl. weekends & bank holidays) &nbsp;·&nbsp; {calDays(form.start,form.end)} calendar day{calDays(form.start,form.end)!==1?"s":""}
                </div>

                {preview.infos.map(info=>{
                  const{person,o,charged,rem,after,by}=info;
                  const ovrStr=form.ovr[person.id];
                  const isManual=o.valid&&o.value!==null&&o.value!==preview.auto;
                  const multi=preview.infos.length>1;
                  return(
                    <div key={person.id} style={{border:`1px solid ${person.color}33`,borderRadius:10,padding:12,marginBottom:10,background:"#fcfcfd"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <label style={{fontSize:13,fontWeight:600,color:"#475569"}}>
                          Days charged to entitlement{multi&&<span style={{color:person.color}}> — {person.label}</span>}
                        </label>
                        <span style={{fontSize:11,fontWeight:700,borderRadius:4,padding:"2px 8px",background:isManual?"#fff7ed":"#f1f5f9",color:isManual?"#c2410c":"#64748b"}}>{isManual?"Manual":"Automatic"}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <input type="number" min="0" step="0.5" value={ovrStr} placeholder={fmt(preview.auto)}
                          onChange={e=>{setFormError("");setForm(f=>({...f,ovr:{...f.ovr,[person.id]:e.target.value}}));}}
                          style={{width:110,padding:"8px 10px",border:`1px solid ${o.valid?"#e2e8f0":"#fca5a5"}`,borderRadius:8,fontSize:15,fontWeight:700,boxSizing:"border-box"}}/>
                        {ovrStr!==""&&<button onClick={()=>setForm(f=>({...f,ovr:{...f.ovr,[person.id]:""}}))} style={{background:"none",border:"none",color:"#6366f1",cursor:"pointer",fontSize:12,fontWeight:600,padding:0,textDecoration:"underline"}}>Reset to automatic</button>}
                      </div>
                      <div style={{fontSize:11,color:o.valid?"#94a3b8":"#b91c1c",marginTop:5}}>
                        {o.valid?"Leave blank to use the automatic figure. Overwrite it for cases like a sabbatical (enter 0).":"Enter 0 or more, in steps of 0.5."}
                      </div>
                      <div style={{marginTop:10,borderRadius:8,padding:"8px 12px",fontSize:13,display:"flex",justifyContent:"space-between",gap:8,
                        background:charged===0?"#f0fdf4":after<0?"#fef2f2":"#f0fdf4",
                        border:`1px solid ${charged===0?"#bbf7d0":after<0?"#fecaca":"#bbf7d0"}`,
                        color:charged===0?"#166534":after<0?"#b91c1c":"#166534"}}>
                        {charged===0
                          ?<span>🏖️ <strong>No entitlement used</strong> · {fmt(rem)} remaining stays the same</span>
                          :<span><strong>{fmt(charged)}</strong> charged · {fmt(rem)} remaining → <strong>{fmt(Math.max(0,after))} after</strong></span>}
                        <span style={{fontSize:11,opacity:0.8}}>{yearLabel(person,by)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {formError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#b91c1c"}}>{formError}</div>}

            {editingId!==null?(
              <div style={{display:"flex",gap:10}}>
                <button onClick={cancelEdit} style={{flex:1,padding:"12px 0",background:"white",border:"1px solid #e2e8f0",borderRadius:8,color:"#64748b",fontWeight:700,fontSize:15,cursor:"pointer"}}>Cancel</button>
                <button onClick={submitHoliday} style={{flex:2,padding:"12px 0",background:"linear-gradient(135deg,#6366f1,#ec4899)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:15,cursor:"pointer"}}>Save changes</button>
              </div>
            ):(
              <button onClick={submitHoliday} style={{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#6366f1,#ec4899)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:15,cursor:"pointer"}}>Add Holiday</button>
            )}
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

            {upcomingEvts.length>0&&(
              <div style={{marginTop:28}}>
                <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:10,letterSpacing:"0.05em"}}>UPCOMING EVENTS</div>
                {upcomingEvts.map(ev=>evtRow(ev,false))}
              </div>
            )}
            {pastEvts.length>0&&(
              <div style={{marginTop:24}}>
                <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:10,letterSpacing:"0.05em"}}>PAST EVENTS</div>
                {pastEvts.map(ev=>evtRow(ev,true))}
              </div>
            )}
            {events.length===0&&<p style={{marginTop:24,color:"#94a3b8",fontSize:13}}>No events added yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
