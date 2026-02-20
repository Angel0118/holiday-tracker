import { useState, useEffect } from "react";

const PEOPLE = [
  { id: "MK", label: "MK", allowance: 25, color: "#6366f1", light: "#eef2ff", yearStartMonth: 3 },
  { id: "SL", label: "SL", allowance: 25, color: "#ec4899", light: "#fdf2f8", yearStartMonth: 0 },
];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// ── UK Bank Holidays (England) ──────────────────────────────────────────────
function easterSunday(y) {
  const a=y%19, b=Math.floor(y/100), c=y%100, d=Math.floor(b/4), e=b%4,
        f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3),
        h=(19*a+b-d-g+15)%30, i=Math.floor(c/4), k=c%4,
        l=(32+2*e+2*i-h-k)%7, m=Math.floor((a+11*h+22*l)/451),
        mo=Math.floor((h+l-7*m+114)/31), da=((h+l-7*m+114)%31)+1;
  return new Date(y, mo-1, da);
}

function lastWeekdayOfMonth(y, mo, wd) {
  const d = new Date(y, mo+1, 0);
  while (d.getDay() !== wd) d.setDate(d.getDate()-1);
  return new Date(d);
}

function firstWeekdayOfMonth(y, mo, wd) {
  const d = new Date(y, mo, 1);
  while (d.getDay() !== wd) d.setDate(d.getDate()+1);
  return new Date(d);
}

function subst(date, holidays) {
  const d = new Date(date), day = d.getDay();
  if (day === 6) { d.setDate(d.getDate()+2); holidays.push({ date: toDateStr(d), name: "" }); }
  else if (day === 0) { d.setDate(d.getDate()+1); holidays.push({ date: toDateStr(d), name: "" }); }
  else holidays.push({ date: toDateStr(d), name: "" });
  holidays[holidays.length-1].name = "";
}

function getUKBankHolidays(year) {
  const bh = [];
  const add = (date, name) => { const h = { date: toDateStr(new Date(date)), name }; bh.push(h); return h; };
  const addSubst = (date, name) => {
    const d = new Date(date), day = d.getDay();
    if (day === 6) d.setDate(d.getDate()+2);
    else if (day === 0) d.setDate(d.getDate()+1);
    bh.push({ date: toDateStr(d), name });
  };

  addSubst(new Date(year, 0, 1), "New Year's Day");

  const easter = easterSunday(year);
  const gf = new Date(easter); gf.setDate(easter.getDate()-2);
  const em = new Date(easter); em.setDate(easter.getDate()+1);
  bh.push({ date: toDateStr(gf), name: "Good Friday" });
  bh.push({ date: toDateStr(em), name: "Easter Monday" });

  bh.push({ date: toDateStr(firstWeekdayOfMonth(year, 4, 1)), name: "Early May Bank Holiday" });
  bh.push({ date: toDateStr(lastWeekdayOfMonth(year, 4, 1)), name: "Spring Bank Holiday" });
  bh.push({ date: toDateStr(lastWeekdayOfMonth(year, 7, 1)), name: "Summer Bank Holiday" });

  // Christmas + Boxing Day with substitute logic
  const xmas = new Date(year, 11, 25);
  const box  = new Date(year, 11, 26);
  const xday = xmas.getDay();
  if (xday === 5) { // Fri xmas, Sat boxing → Mon sub
    bh.push({ date: toDateStr(xmas), name: "Christmas Day" });
    bh.push({ date: toDateStr(new Date(year, 11, 28)), name: "Boxing Day (substitute)" });
  } else if (xday === 6) { // Sat xmas → Mon, Sun boxing → Tue
    bh.push({ date: toDateStr(new Date(year, 11, 27)), name: "Christmas Day (substitute)" });
    bh.push({ date: toDateStr(new Date(year, 11, 28)), name: "Boxing Day (substitute)" });
  } else if (xday === 0) { // Sun xmas → Mon, Mon boxing → Tue
    bh.push({ date: toDateStr(new Date(year, 11, 26)), name: "Christmas Day (substitute)" });
    bh.push({ date: toDateStr(new Date(year, 11, 27)), name: "Boxing Day (substitute)" });
  } else {
    bh.push({ date: toDateStr(xmas), name: "Christmas Day" });
    bh.push({ date: toDateStr(box), name: "Boxing Day" });
  }

  return bh;
}

// Cache bank holidays per year
const bhCache = {};
function bankHolidays(year) {
  if (!bhCache[year]) bhCache[year] = getUKBankHolidays(year);
  return bhCache[year];
}
function isBankHoliday(ds) {
  const year = +ds.slice(0,4);
  return bankHolidays(year).some(h => h.date === ds);
}
function bankHolidayName(ds) {
  const year = +ds.slice(0,4);
  return bankHolidays(year).find(h => h.date === ds)?.name || null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const toDateStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const sKey = (pid, yr) => `${pid}-${yr}`;

function getBaseYear(person, date) {
  const m = date.getMonth(), y = date.getFullYear();
  return m >= person.yearStartMonth ? y : y-1;
}
function getYearRange(person, baseYear) {
  const sm = person.yearStartMonth;
  return {
    start: `${baseYear}-${String(sm+1).padStart(2,"0")}-01`,
    end: toDateStr(new Date(baseYear+1, sm, 0))
  };
}
function yearLabel(person, baseYear) {
  const { start, end } = getYearRange(person, baseYear);
  const fmt = s => { const [y,m] = s.split("-"); return `${MONTHS[+m-1].slice(0,3)} ${y}`; };
  return `${fmt(start)} – ${fmt(end)}`;
}
function isWeekend(ds) { const d = new Date(ds+"T12:00:00"); return d.getDay()===0||d.getDay()===6; }
function isNonWorking(ds) { return isWeekend(ds) || isBankHoliday(ds); }

function countWorkdays(start, end) {
  let count = 0;
  const s = new Date(start+"T12:00:00"), e = new Date(end+"T12:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
    const ds = toDateStr(d);
    if (!isNonWorking(ds)) count++;
  }
  return count;
}
function fmtDate(s) { const [y,m,d]=s.split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}); }

// ── Storage ──────────────────────────────────────────────────────────────────
function loadKey(k) {
  const res = { holidays:[], carryover:0, coSet:false, initUsed:0, initSet:false };
  try { const v=localStorage.getItem(`hols-${k}`); if(v) res.holidays=JSON.parse(v); } catch {}
  try { const v=localStorage.getItem(`co-${k}`); if(v){res.carryover=JSON.parse(v);res.coSet=true;} } catch {}
  try { const v=localStorage.getItem(`init-${k}`); if(v){res.initUsed=JSON.parse(v);res.initSet=true;} } catch {}
  return res;
}
function persistKey(k, entry) {
  try { localStorage.setItem(`hols-${k}`, JSON.stringify(entry.holidays)); } catch {}
  try { if(entry.coSet) localStorage.setItem(`co-${k}`, JSON.stringify(entry.carryover)); } catch {}
  try { if(entry.initSet) localStorage.setItem(`init-${k}`, JSON.stringify(entry.initUsed)); } catch {}
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const today = new Date();
  const todayStr = toDateStr(today);
  const beforeApril = today.getMonth() < 3;

  const mkP = PEOPLE[0], slP = PEOPLE[1];
  const mkCurYear = getBaseYear(mkP, today);
  const mkYears = beforeApril ? [mkCurYear, mkCurYear+1] : [mkCurYear];
  const slCurYear = getBaseYear(slP, today);

  const [navYear, setNavYear] = useState(today.getFullYear());
  const [view, setView] = useState("dashboard");
  const [data, setData] = useState({});
  const [editCO, setEditCO] = useState(null);
  const [coInput, setCOInput] = useState("");
  const [editRem, setEditRem] = useState(null);
  const [remInput, setRemInput] = useState("");
  const [form, setForm] = useState({ person:"MK", start:"", end:"", label:"" });
  const [formError, setFormError] = useState("");
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  function neededKeys() {
    const ks = new Set();
    mkYears.forEach(y => ks.add(sKey("MK",y)));
    ks.add(sKey("SL",slCurYear));
    PEOPLE.forEach(p => ks.add(sKey(p.id,navYear)));
    return [...ks];
  }

  useEffect(() => {
    const fresh = {};
    for (const k of neededKeys()) fresh[k] = loadKey(k);
    setData(prev => ({...prev,...fresh}));
  }, [navYear]);

  const D = (pid,yr) => data[sKey(pid,yr)] || { holidays:[], carryover:0, coSet:false, initUsed:0, initSet:false };
  const effAllowance = (person,yr) => person.allowance + D(person.id,yr).carryover;
  const bookedDays = (pid,yr) => D(pid,yr).holidays.reduce((s,h)=>s+h.days,0);
  const usedDays = (pid,yr) => D(pid,yr).initUsed + bookedDays(pid,yr);
  const remDays = (person,yr) => effAllowance(person,yr) - usedDays(person.id,yr);
  const projCO = (person,yr) => Math.max(0, remDays(person,yr));

  function updateKey(k, updates) {
    setData(prev => {
      const next = {...(prev[k]||{holidays:[],carryover:0,coSet:false,initUsed:0,initSet:false}), ...updates};
      persistKey(k, next);
      return {...prev,[k]:next};
    });
  }

  function saveCarryover(k) { updateKey(k,{carryover:Math.max(0,parseInt(coInput)||0),coSet:true}); setEditCO(null); }
  function saveInitRem(k,person,yr) {
    const entered = Math.max(0,parseInt(remInput)||0);
    const eff = effAllowance(person,yr);
    const booked = bookedDays(person.id,yr);
    updateKey(k,{initUsed:Math.max(0,eff-entered-booked),initSet:true});
    setEditRem(null);
  }

  function addHoliday() {
    setFormError("");
    const {person,start,end,label} = form;
    if(!start||!end) return setFormError("Please select start and end dates.");
    if(end<start) return setFormError("End must be after start.");
    const p = PEOPLE.find(x=>x.id===person);
    const baseYear = getBaseYear(p,new Date(start+"T12:00:00"));
    const range = getYearRange(p,baseYear);
    if(end>range.end) return setFormError("Holiday spans into another holiday year — please split it.");
    const days = countWorkdays(start,end);
    if(days===0) return setFormError("No working days in that range (weekends & bank holidays excluded).");
    const rem = remDays(p,baseYear);
    if(days>rem) return setFormError(`Only ${rem} days remaining for this period.`);
    updateKey(sKey(person,baseYear),{holidays:[...D(person,baseYear).holidays,{id:Date.now(),start,end,label:label||"Holiday",days}]});
    setForm(f=>({...f,start:"",end:"",label:""}));
    setView("dashboard");
  }

  function removeHoliday(pid,yr,id) { updateKey(sKey(pid,yr),{holidays:D(pid,yr).holidays.filter(h=>h.id!==id)}); }

  // ── Card ──
  function card(person, baseYear, isNext) {
    const k = sKey(person.id,baseYear);
    const d = D(person.id,baseYear);
    const co = isNext&&!d.coSet ? projCO(mkP,mkCurYear) : d.carryover;
    const eff = person.allowance + co;
    const u = usedDays(person.id,baseYear);
    const rem = eff - u;
    const pct = Math.min(100,(u/eff)*100);

    return (
      <div key={k} style={{background:"white",borderRadius:16,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",borderTop:`4px solid ${person.color}`}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",color:isNext?"#f59e0b":"#10b981"}}>
            {isNext?"⏭ NEXT YEAR":"▶ CURRENT YEAR"}
          </span>
          <span style={{fontSize:11,color:"#94a3b8"}}>{yearLabel(person,baseYear)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",margin:"10px 0 12px"}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"#64748b"}}>{person.label}</div>
            {editRem===k ? (
              <div style={{display:"flex",gap:6,alignItems:"center",marginTop:4,flexWrap:"wrap"}}>
                <input type="number" min="0" max={eff} value={remInput} onChange={e=>setRemInput(e.target.value)} autoFocus
                  style={{width:64,padding:"4px 8px",border:`2px solid ${person.color}`,borderRadius:8,fontSize:22,fontWeight:800,color:person.color,outline:"none",boxSizing:"border-box"}}/>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>saveInitRem(k,person,baseYear)} style={{padding:"4px 10px",background:person.color,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>Save</button>
                  <button onClick={()=>setEditRem(null)} style={{padding:"4px 8px",background:"none",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",fontSize:12,color:"#94a3b8"}}>✕</button>
                </div>
              </div>
            ) : (
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <div style={{fontSize:42,fontWeight:800,color:person.color,lineHeight:1}}>{rem}</div>
                <button onClick={()=>{setEditRem(k);setRemInput(rem);setEditCO(null);}} title="Set remaining days"
                  style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"2px 7px",cursor:"pointer",color:"#94a3b8",fontSize:11}}>✏️</button>
              </div>
            )}
            <div style={{fontSize:12,color:"#94a3b8"}}>days remaining</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"#94a3b8"}}>Used / Total</div>
            <div style={{fontSize:22,fontWeight:700,color:"#334155"}}>{u} / {eff}</div>
            <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>
              Base {person.allowance}{co>0?` + ${co} carried over`:""}
              {d.initUsed>0?` · Pre-loaded: ${d.initUsed}`:""}
            </div>
          </div>
        </div>
        {/* Carry over */}
        <div style={{background:person.light,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12}}>
          {editCO===k ? (
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{color:"#64748b",fontWeight:600}}>Carry over (days):</span>
              <input type="number" min="0" max={person.allowance} value={coInput} onChange={e=>setCOInput(e.target.value)}
                style={{width:56,padding:"2px 6px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:12}}/>
              <button onClick={()=>saveCarryover(k)} style={{padding:"2px 10px",background:person.color,color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>Save</button>
              <button onClick={()=>setEditCO(null)} style={{padding:"2px 8px",background:"none",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",fontSize:12,color:"#94a3b8"}}>Cancel</button>
            </div>
          ) : (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{color:"#64748b"}}>
                <span style={{fontWeight:600}}>Carry over: </span>
                <span style={{color:person.color,fontWeight:700}}>{co} days</span>
                {isNext&&!d.coSet&&<span style={{color:"#94a3b8",fontStyle:"italic",marginLeft:4}}>(projected)</span>}
              </div>
              <button onClick={()=>{setEditCO(k);setCOInput(co);setEditRem(null);}}
                style={{background:"none",border:"1px solid #cbd5e1",borderRadius:6,padding:"2px 8px",cursor:"pointer",color:"#64748b",fontSize:11}}>✏️ Edit</button>
            </div>
          )}
        </div>
        <div style={{background:"#f1f5f9",borderRadius:99,height:8,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,background:person.color,height:"100%",borderRadius:99,transition:"width 0.4s"}}/>
        </div>
      </div>
    );
  }

  function holidayList(pid,yr,bgColor) {
    const hols = [...D(pid,yr).holidays].sort((a,b)=>a.start.localeCompare(b.start));
    if(!hols.length) return null;
    return (
      <div key={`list-${pid}-${yr}`} style={{background:"white",borderRadius:12,padding:16,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:12,fontWeight:600,color:"#94a3b8",marginBottom:8}}>{yearLabel(PEOPLE.find(p=>p.id===pid),yr)}</div>
        {hols.map(h=>(
          <div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:8,background:bgColor,marginBottom:6}}>
            <div>
              <div style={{fontWeight:600,fontSize:14,color:"#1e293b"}}>{h.label}</div>
              <div style={{fontSize:12,color:"#64748b"}}>{fmtDate(h.start)} – {fmtDate(h.end)} · <strong>{h.days}</strong> working day{h.days!==1?"s":""}</div>
            </div>
            <button onClick={()=>removeHoliday(pid,yr,h.id)} style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#94a3b8",fontSize:12}}>Remove</button>
          </div>
        ))}
      </div>
    );
  }

  // ── Calendar helpers ──
  function getDaysInMonth(y,m){return new Date(y,m+1,0).getDate();}
  function getFirstDay(y,m){const d=new Date(y,m,1).getDay();return d===0?6:d-1;}
  function holidayPeopleOn(ds){return PEOPLE.filter(p=>Object.keys(data).some(k=>k.startsWith(p.id+"-")&&(data[k].holidays||[]).some(h=>ds>=h.start&&ds<=h.end)));}

  const formPerson = PEOPLE.find(p=>p.id===form.person);
  const formRange = getYearRange(formPerson,navYear);

  // Workday preview for add form
  const previewDays = form.start&&form.end&&form.end>=form.start ? countWorkdays(form.start,form.end) : 0;
  const previewBaseYear = form.start ? getBaseYear(formPerson,new Date(form.start+"T12:00:00")) : navYear;
  const previewRem = remDays(formPerson,previewBaseYear);

  return (
    <div style={{fontFamily:"system-ui,sans-serif",minHeight:"100vh",background:"#f8fafc"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#6366f1 0%,#ec4899 100%)",padding:"20px 24px 0",color:"white"}}>
        <div style={{maxWidth:860,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <h1 style={{margin:0,fontSize:22,fontWeight:700}}>✈️ Holiday Tracker</h1>
              <p style={{margin:"2px 0 0",opacity:0.85,fontSize:13}}>MK & SL</p>
            </div>
            {view!=="dashboard"&&(
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,opacity:0.75,marginBottom:4}}>Viewing year</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button onClick={()=>setNavYear(y=>y-1)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:16}}>‹</button>
                  <span style={{fontWeight:700,fontSize:18}}>{navYear}</span>
                  <button onClick={()=>setNavYear(y=>y+1)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:16}}>›</button>
                </div>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:4}}>
            {["dashboard","calendar","add"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:"8px 18px",border:"none",cursor:"pointer",borderRadius:"8px 8px 0 0",background:view===v?"white":"rgba(255,255,255,0.15)",color:view===v?"#6366f1":"white",fontWeight:600,fontSize:13}}>
                {v==="add"?"+ Add Holiday":v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:860,margin:"0 auto",padding:24}}>

        {/* DASHBOARD */}
        {view==="dashboard"&&(
          <div>
            <div style={{marginBottom:28}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:4,height:18,borderRadius:2,background:"#6366f1"}}/>
                <h3 style={{margin:0,fontSize:14,fontWeight:700,color:"#6366f1",letterSpacing:"0.04em"}}>
                  MK · {beforeApril?"Current & upcoming holiday years":"Current holiday year"}
                </h3>
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
                <h3 style={{margin:0,fontSize:14,fontWeight:700,color:"#ec4899",letterSpacing:"0.04em"}}>SL · Current holiday year</h3>
              </div>
              <div style={{marginBottom:14}}>{card(slP,slCurYear,false)}</div>
              {holidayList("SL",slCurYear,"#fdf2f8")}
              {D("SL",slCurYear).holidays.length===0&&<p style={{margin:0,color:"#94a3b8",fontSize:13}}>No holidays added yet for SL.</p>}
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {view==="calendar"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}}
                style={{background:"white",border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:600}}>‹</button>
              <h2 style={{margin:0,fontSize:18,fontWeight:700,color:"#1e293b"}}>{MONTHS[calMonth]} {calYear}</h2>
              <button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}}
                style={{background:"white",border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:600}}>›</button>
            </div>

            {/* Legend */}
            <div style={{display:"flex",gap:16,marginBottom:12,flexWrap:"wrap"}}>
              {PEOPLE.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}><div style={{width:14,height:14,borderRadius:4,background:p.color}}/>{p.label}</div>)}
              <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}><div style={{width:14,height:14,borderRadius:4,background:"#fbbf24"}}/> Bank Holiday</div>
            </div>

            <div style={{background:"white",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"#f8fafc"}}>
                {DAYS.map(d=><div key={d} style={{padding:"10px 0",textAlign:"center",fontSize:12,fontWeight:700,color:"#94a3b8"}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
                {Array.from({length:getFirstDay(calYear,calMonth)}).map((_,i)=><div key={`e${i}`} style={{minHeight:64,borderTop:"1px solid #f1f5f9"}}/>)}
                {Array.from({length:getDaysInMonth(calYear,calMonth)}).map((_,i)=>{
                  const d=i+1;
                  const ds=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                  const isToday=ds===todayStr, weekend=isWeekend(ds);
                  const bhName=bankHolidayName(ds);
                  const people=holidayPeopleOn(ds);
                  return (
                    <div key={d} style={{minHeight:64,borderTop:"1px solid #f1f5f9",padding:4,background:isToday?"#fffbeb":bhName?"#fffbeb":weekend?"#fafafa":"white"}}>
                      <div style={{fontSize:12,fontWeight:isToday?800:400,color:isToday?"#f59e0b":bhName?"#d97706":weekend?"#cbd5e1":"#334155",marginBottom:2}}>{d}</div>
                      {bhName&&<div style={{background:"#fbbf24",color:"white",borderRadius:4,fontSize:9,fontWeight:700,padding:"1px 4px",marginBottom:2,lineHeight:1.3,wordBreak:"break-word"}}>{bhName}</div>}
                      {people.map(p=><div key={p.id} style={{background:p.color,color:"white",borderRadius:4,fontSize:10,fontWeight:700,padding:"1px 4px",marginBottom:2}}>{p.id}</div>)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ADD HOLIDAY */}
        {view==="add"&&(
          <div style={{background:"white",borderRadius:16,padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",maxWidth:480}}>
            <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:700,color:"#1e293b"}}>Add a Holiday</h2>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>Person</label>
              <div style={{display:"flex",gap:8}}>
                {PEOPLE.map(p=>(
                  <button key={p.id} onClick={()=>setForm(f=>({...f,person:p.id,start:"",end:""}))} style={{
                    flex:1,padding:"10px 0",border:`2px solid ${form.person===p.id?p.color:"#e2e8f0"}`,
                    borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:14,
                    background:form.person===p.id?p.light:"white",color:form.person===p.id?p.color:"#94a3b8"
                  }}>
                    <div>{p.label}</div>
                    <div style={{fontSize:10,fontWeight:400,opacity:0.8}}>{yearLabel(p,navYear)}</div>
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
                <input type="date" value={form.start} min={formRange.start} max={formRange.end}
                  onChange={e=>setForm(f=>({...f,start:e.target.value,end:f.end<e.target.value?e.target.value:f.end}))}
                  style={{width:"100%",padding:"10px 8px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>End</label>
                <input type="date" value={form.end} min={form.start||formRange.start} max={formRange.end}
                  onChange={e=>setForm(f=>({...f,end:e.target.value}))}
                  style={{width:"100%",padding:"10px 8px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
              </div>
            </div>
            {form.start&&form.end&&form.end>=form.start&&(
              <div style={{background:previewDays>previewRem?"#fef2f2":"#f0fdf4",border:`1px solid ${previewDays>previewRem?"#fecaca":"#bbf7d0"}`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:previewDays>previewRem?"#b91c1c":"#166534"}}>
                📅 <strong>{previewDays}</strong> working day{previewDays!==1?"s":""} (excl. weekends & bank holidays) · <strong>{Math.max(0,previewRem-previewDays)}</strong> remaining after
              </div>
            )}
            {formError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#b91c1c"}}>{formError}</div>}
            <button onClick={addHoliday} style={{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#6366f1,#ec4899)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:15,cursor:"pointer"}}>
              Add Holiday
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
