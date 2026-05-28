import { useState, useEffect, useCallback } from "react";

const GAS_URL = "https://script.google.com/macros/s/AKfycbw_gQ8-SSjJbD6ymG2Th7KG_ru0y9uQNOv9Lz4MmqbyblUIQ9bCWSiD1mRCJcRqTvvG6Q/exec";

const DEFAULT_EXERCISES = [
  "槓鈴RDL","槓鈴臥推","單腳RDL","側棒式","TRX肩外旋","壺鈴對握深蹲",
  "弓箭步前進","槓鈴胸推","棒式","深蹲","硬舉","肩推","划船",
  "引體向上","腿推","腿彎舉","二頭彎舉","三頭下壓","側平舉","面拉","胸肌外旋伸展"
];

const STORAGE_KEY = "coach_planner_v3";
const STATUS_OPTIONS = ["正常","普通","穩定","需注意"];
const BODY_LABELS = { foot:"足弓", knee:"膝蓋", shoulder:"肩膀", core:"核心" };

function loadLocal() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return { students: [], exercises: DEFAULT_EXERCISES };
}
function saveLocal(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
};
const blankSession = () => ({
  date: todayStr(), goal: "", exercises: [],
  notes: "", bodyStatus: { foot:"正常", knee:"正常", shoulder:"正常", core:"正常", pain:"0" },
  homework: "", nextFocus: "",
});

const C = {
  bg:"#0d0d0d", surface:"#161616", border:"#242424",
  accent:"#b5f542", text:"#eeebe5", muted:"#777", danger:"#ff5252",
};
const inputStyle = {
  background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px",
  padding:"11px 13px", color:C.text, fontSize:"14px", width:"100%",
  boxSizing:"border-box", outline:"none", fontFamily:"inherit",
};
const textareaStyle = { ...inputStyle, resize:"vertical", minHeight:"76px", fontSize:"13px" };
const smallInputStyle = {
  background:"#0f0f0f", border:`1px solid ${C.border}`, borderRadius:"7px",
  padding:"5px 6px", color:C.text, fontSize:"12px", width:"100%",
  boxSizing:"border-box", outline:"none", textAlign:"center", fontFamily:"inherit",
};
const selectStyle = {
  background:C.surface, border:`1px solid ${C.border}`, borderRadius:"7px",
  padding:"5px 7px", color:C.text, fontSize:"12px", outline:"none", fontFamily:"inherit",
};

export default function CoachPlanner() {
  const [data, setData]         = useState(loadLocal);
  const [view, setView]         = useState("home");
  const [student, setStudent]   = useState(null);
  const [session, setSession]   = useState(blankSession);
  const [output, setOutput]     = useState({ student:"", sheet:"" });
  const [loading, setLoading]   = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [toast, setToast]       = useState("");
  const [newName, setNewName]   = useState("");
  const [showLib, setShowLib]   = useState(false);

  useEffect(() => { saveLocal(data); }, [data]);

  const showToast = useCallback((m) => {
    setToast(m); setTimeout(()=>setToast(""), 2500);
  }, []);

  const setGoal      = useCallback(v => setSession(s=>({...s,goal:v})), []);
  const setNotes     = useCallback(v => setSession(s=>({...s,notes:v})), []);
  const setHomework  = useCallback(v => setSession(s=>({...s,homework:v})), []);
  const setNextFocus = useCallback(v => setSession(s=>({...s,nextFocus:v})), []);
  const setBodyField = useCallback((key,v) => setSession(s=>({...s,bodyStatus:{...s.bodyStatus,[key]:v}})), []);

  const addStudent = () => {
    if (!newName.trim()) return;
    setData(d=>({...d,students:[...d.students,{id:Date.now(),name:newName.trim(),history:[]}]}));
    setNewName(""); showToast("✅ 學生已新增");
  };
  const delStudent = id => setData(d=>({...d,students:d.students.filter(s=>s.id!==id)}));

  const openSession = (s) => {
    setStudent(s);
    const last = s.history[s.history.length-1];
    const base = blankSession();
    if (last) {
      base.exercises = last.exercises.map(e=>({...e,weight:"",note:""}));
      base.goal = last.nextFocus || "";
    }
    setSession(base); setShowLib(false); setView("session");
  };

  const addEx = useCallback(name => {
    setSession(s=>({...s,exercises:[...s.exercises,{id:Date.now(),name,sets:3,reps:10,weight:"",note:""}]}));
  }, []);
  const updEx = useCallback((id,field,val) => {
    setSession(s=>({...s,exercises:s.exercises.map(e=>e.id===id?{...e,[field]:val}:e)}));
  }, []);
  const delEx  = useCallback(id => setSession(s=>({...s,exercises:s.exercises.filter(e=>e.id!==id)})), []);
  const moveEx = useCallback((id,dir) => {
    setSession(s=>{
      const arr=[...s.exercises],i=arr.findIndex(e=>e.id===id),j=i+dir;
      if(j<0||j>=arr.length) return s;
      [arr[i],arr[j]]=[arr[j],arr[i]]; return {...s,exercises:arr};
    });
  }, []);

  const generate = async () => {
    if (!session.exercises.length) return showToast("請先加入動作！");
    setLoading(true);
    const exLines = session.exercises.map(e =>
      `${e.name}${e.weight?" "+e.weight+"kg × ":""}${e.reps}下 × ${e.sets}組${e.note?"（"+e.note+"）":""}`
    ).join("\n");
    const sheetExercises = session.exercises.map(e=>e.name).join("、");
    const sheetWeights   = session.exercises.map(e=>e.weight?`${e.name}${e.weight}kg`:"").filter(Boolean).join("、")||"—";
    const prompt = `你是一位專業健身教練助理。根據以下上課資訊，產出兩份文件。
【學生】${student.name}【日期】${session.date}【今日目標】${session.goal||"（未填）"}
【訓練動作】\n${exLines}
【教練觀察筆記】${session.notes||"（未填）"}【回家作業】${session.homework||"（未填）"}
【下次重點】${session.nextFocus||"（未填）"}
【身體狀況】足弓:${session.bodyStatus.foot} 膝蓋:${session.bodyStatus.knee} 肩膀:${session.bodyStatus.shoulder} 核心:${session.bodyStatus.core} 疼痛分數:${session.bodyStatus.pain}
請輸出 JSON（不要任何多餘文字或markdown）：
{"studentReport":"給學生看的訓練紀錄（繁體中文、專業親切、含日期動作清單分析鼓勵）","goalSummary":"今日目標15字內","observationSummary":"動作觀察15字內","bodyIssueSummary":"身體問題15字內"}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1200, messages:[{role:"user",content:prompt}] })
      });
      const d = await res.json();
      const raw = d.content.map(c=>c.text||"").join("").replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(raw);
      const row = [
        session.date, student.name, parsed.goalSummary, sheetExercises, sheetWeights,
        parsed.observationSummary, parsed.bodyIssueSummary,
        session.homework||"", session.nextFocus||"",
        session.bodyStatus.foot, session.bodyStatus.knee,
        session.bodyStatus.shoulder, session.bodyStatus.core, session.bodyStatus.pain
      ];
      const record = { date:session.date, exercises:session.exercises, goal:session.goal,
        notes:session.notes, bodyStatus:session.bodyStatus, homework:session.homework, nextFocus:session.nextFocus };
      setData(prev=>({...prev,students:prev.students.map(s=>s.id===student.id?{...s,history:[...s.history,record]}:s)}));
      setOutput({ student:parsed.studentReport, sheet:row.join("\t"), row });
      setView("export");
      setSyncing(true);
      try {
        await fetch(GAS_URL, { method:"POST", body:JSON.stringify({action:"appendRow",row}) });
        showToast("✅ 已自動寫入 Google Sheet！");
      } catch { showToast("⚠️ Sheet 同步失敗，可手動複製"); }
      setSyncing(false);
    } catch(e) { showToast("❌ 產生失敗，請再試一次"); console.error(e); }
    setLoading(false);
  };

  const copy = (text,label) => navigator.clipboard.writeText(text).then(()=>showToast(`✅ ${label} 已複製！`));

  const t = {
    app:      { minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", paddingBottom:"72px" },
    header:   { background:C.bg, borderBottom:`1px solid ${C.border}`, padding:"14px 18px", display:"flex", alignItems:"center", gap:"12px", position:"sticky", top:0, zIndex:20 },
    logo:     { width:34, height:34, background:C.accent, borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"17px", flexShrink:0 },
    nav:      { position:"fixed", bottom:0, left:0, right:0, background:"#111", borderTop:`1px solid ${C.border}`, display:"flex", zIndex:20 },
    navBtn:   a=>({ flex:1, padding:"10px 4px 8px", background:"none", border:"none", cursor:"pointer", color:a?C.accent:"#444", fontSize:"10px", fontWeight:a?700:400, display:"flex", flexDirection:"column", alignItems:"center", gap:"3px" }),
    page:     { padding:"18px" },
    sec:      { marginBottom:"22px" },
    secTitle: { fontSize:"10px", fontWeight:700, letterSpacing:"0.12em", color:C.muted, textTransform:"uppercase", marginBottom:"10px" },
    card:     { background:C.surface, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"13px 15px", marginBottom:"7px", display:"flex", alignItems:"center", justifyContent:"space-between" },
    btnPrimary:   { background:C.accent, color:"#0d0d0d", border:"none", borderRadius:"10px", padding:"13px 20px", fontSize:"14px", fontWeight:800, cursor:"pointer", width:"100%", marginTop:"6px" },
    btnSecondary: { background:C.surface, color:C.text, border:`1px solid ${C.border}`, borderRadius:"9px", padding:"8px 14px", fontSize:"13px", fontWeight:600, cursor:"pointer" },
    btnBack:  { background:"none", border:"none", color:C.accent, fontSize:"13px", fontWeight:700, cursor:"pointer", padding:0 },
    btnDanger:{ background:"none", color:C.danger, border:`1px solid #ff525233`, borderRadius:"7px", padding:"5px 9px", fontSize:"11px", cursor:"pointer" },
    tag:      a=>({ padding:"5px 11px", background:a?C.accent:C.surface, color:a?"#0d0d0d":C.muted, border:`1px solid ${a?C.accent:C.border}`, borderRadius:"20px", fontSize:"12px", cursor:"pointer", margin:"3px", display:"inline-block" }),
    exportBox:{ background:"#0a0a0a", border:`1px solid ${C.border}`, borderRadius:"11px", padding:"13px", fontSize:"12px", color:"#aaa", fontFamily:"monospace", whiteSpace:"pre-wrap", lineHeight:"1.75", marginBottom:"9px", maxHeight:"200px", overflowY:"auto" },
    toast:    { position:"fixed", bottom:"82px", left:"50%", transform:"translateX(-50%)", background:C.accent, color:"#0d0d0d", padding:"9px 20px", borderRadius:"30px", fontSize:"13px", fontWeight:800, zIndex:999, whiteSpace:"nowrap", boxShadow:`0 4px 20px ${C.accent}44` },
    planRow:  { background:C.surface, border:`1px solid ${C.border}`, borderRadius:"11px", padding:"11px 12px", marginBottom:"7px" },
  };

  const ExRow = ({ ex }) => (
    <div style={t.planRow}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
        <div style={{fontWeight:700,fontSize:"13px",flex:1,paddingRight:"8px"}}>{ex.name}</div>
        <div style={{display:"flex",gap:"4px"}}>
          <button onClick={()=>moveEx(ex.id,-1)} style={{...t.btnSecondary,padding:"3px 7px",fontSize:"11px"}}>↑</button>
          <button onClick={()=>moveEx(ex.id, 1)} style={{...t.btnSecondary,padding:"3px 7px",fontSize:"11px"}}>↓</button>
          <button onClick={()=>delEx(ex.id)} style={t.btnDanger}>✕</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1.6fr",gap:"5px"}}>
        {[{l:"組數",f:"sets",tp:"number"},{l:"次數",f:"reps",tp:"number"},{l:"重量(kg)",f:"weight",tp:"number"},{l:"備註",f:"note",tp:"text"}].map(col=>(
          <div key={col.f}>
            <div style={{fontSize:"9px",color:C.muted,marginBottom:"3px",textAlign:"center"}}>{col.l}</div>
            <input style={smallInputStyle} type={col.tp} defaultValue={ex[col.f]}
              onChange={e=>updEx(ex.id,col.f,e.target.value)} placeholder={col.l} />
          </div>
        ))}
      </div>
    </div>
  );

  const HomeView = () => (
    <div style={t.page}>
      <div style={{marginBottom:"22px"}}>
        <div style={{fontSize:"22px",fontWeight:900,marginBottom:"3px"}}>今日訓練</div>
        <div style={{color:C.muted,fontSize:"12px"}}>{todayStr()}</div>
      </div>
      <div style={t.sec}>
        <div style={t.secTitle}>學生列表 ({data.students.length})</div>
        {data.students.length===0 && <div style={{color:C.muted,textAlign:"center",padding:"32px 0",fontSize:"13px"}}>到「設定」新增學生</div>}
        {data.students.map(s=>{
          const last=s.history[s.history.length-1];
          return (
            <div key={s.id} style={t.card}>
              <div>
                <div style={{fontWeight:700,fontSize:"15px"}}>{s.name}</div>
                <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>{last?`上次：${last.date}`:"尚無紀錄"}</div>
              </div>
              <button style={{background:C.accent,color:"#0d0d0d",border:"none",borderRadius:"8px",padding:"8px 14px",fontSize:"13px",fontWeight:800,cursor:"pointer"}}
                onClick={()=>openSession(s)}>開始上課</button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const SessionView = () => {
    const [localNewEx, setLocalNewEx] = useState("");
    return (
      <div style={t.page}>
        <button style={t.btnBack} onClick={()=>setView("home")}>← 返回</button>
        <div style={{fontWeight:900,fontSize:"20px",marginTop:"10px"}}>{student?.name}</div>
        <div style={{color:C.muted,fontSize:"12px",marginBottom:"18px"}}>{session.date}</div>
        <div style={t.sec}>
          <div style={t.secTitle}>今日目標</div>
          <input style={inputStyle} placeholder="例：後側鏈強化、肩穩定"
            defaultValue={session.goal} onChange={e=>setGoal(e.target.value)} />
        </div>
        <div style={t.sec}>
          <div style={t.secTitle}>訓練動作</div>
          {session.exercises.map(ex=><ExRow key={ex.id} ex={ex} />)}
          <button style={{...t.btnSecondary,width:"100%",borderStyle:"dashed",marginTop:"4px"}}
            onClick={()=>setShowLib(v=>!v)}>
            {showLib?"▲ 收起動作庫":"＋ 新增動作"}
          </button>
          {showLib && (
            <div style={{background:"#111",borderRadius:"11px",padding:"13px",marginTop:"6px"}}>
              <div style={{display:"flex",flexWrap:"wrap"}}>
                {data.exercises.map(ex=>(
                  <span key={ex} style={t.tag(false)} onClick={()=>addEx(ex)}>{ex}</span>
                ))}
              </div>
              <div style={{display:"flex",gap:"7px",marginTop:"10px"}}>
                <input style={{...inputStyle,flex:1,padding:"8px 11px",fontSize:"13px"}}
                  placeholder="自訂動作" value={localNewEx} onChange={e=>setLocalNewEx(e.target.value)} />
                <button style={t.btnSecondary} onClick={()=>{
                  if(!localNewEx.trim()) return; addEx(localNewEx.trim()); setLocalNewEx("");
                }}>加入</button>
              </div>
            </div>
          )}
        </div>
        <div style={t.sec}>
          <div style={t.secTitle}>教練觀察筆記</div>
          <textarea style={textareaStyle}
            placeholder="簡單記錄，例：右側單腳穩定較差。AI 會幫你潤飾。"
            defaultValue={session.notes} onChange={e=>setNotes(e.target.value)} />
        </div>
        <div style={t.sec}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
            <div>
              <div style={t.secTitle}>回家作業</div>
              <input style={inputStyle} placeholder="例：單腳平衡"
                defaultValue={session.homework} onChange={e=>setHomework(e.target.value)} />
            </div>
            <div>
              <div style={t.secTitle}>下次重點</div>
              <input style={inputStyle} placeholder="例：臀肌發力"
                defaultValue={session.nextFocus} onChange={e=>setNextFocus(e.target.value)} />
            </div>
          </div>
        </div>
        <div style={t.sec}>
          <div style={t.secTitle}>身體狀況</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"10px"}}>
            {Object.entries(BODY_LABELS).map(([key,label])=>(
              <div key={key}>
                <div style={{fontSize:"10px",color:C.muted,marginBottom:"4px"}}>{label}</div>
                <select style={selectStyle} defaultValue={session.bodyStatus[key]}
                  onChange={e=>setBodyField(key,e.target.value)}>
                  {STATUS_OPTIONS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:"10px",color:C.muted,marginBottom:"4px"}}>疼痛分數 (0–10)</div>
            <input style={{...inputStyle,width:"80px"}} type="number" min="0" max="10"
              defaultValue={session.bodyStatus.pain} onChange={e=>setBodyField("pain",e.target.value)} />
          </div>
        </div>
        <button style={{...t.btnPrimary,opacity:loading?0.6:1}} onClick={generate} disabled={loading}>
          {loading?"⏳ AI 產生中...":"✨ AI 產出兩份紀錄"}
        </button>
      </div>
    );
  };

  const ExportView = () => (
    <div style={t.page}>
      <button style={t.btnBack} onClick={()=>setView("home")}>← 返回首頁</button>
      <div style={{fontWeight:900,fontSize:"20px",margin:"10px 0 4px"}}>✅ 紀錄已儲存</div>
      <div style={{fontSize:"12px",color:syncing?"#f5a623":C.accent,marginBottom:"20px"}}>
        {syncing?"⏳ 同步中...":"✅ 已自動寫入 Google Sheet"}
      </div>
      <div style={t.sec}>
        <div style={t.secTitle}>📱 給學生的版本</div>
        <div style={t.exportBox}>{output.student}</div>
        <button style={t.btnPrimary} onClick={()=>copy(output.student,"學生版本")}>複製 → 貼到 Line</button>
      </div>
      <div style={t.sec}>
        <div style={t.secTitle}>📊 備用 Sheet 格式</div>
        <div style={t.exportBox}>{output.sheet}</div>
        <button style={{...t.btnPrimary,background:"#34a853",marginTop:"6px"}}
          onClick={()=>copy(output.sheet,"Sheet 格式")}>手動複製貼上（備用）</button>
      </div>
    </div>
  );

  const HistoryView = () => {
    const [sel,setSel] = useState(data.students[0]?.id||null);
    const stu = data.students.find(s=>s.id===sel);
    return (
      <div style={t.page}>
        <div style={{fontWeight:900,fontSize:"20px",marginBottom:"14px"}}>訓練紀錄</div>
        <div style={{display:"flex",flexWrap:"wrap",marginBottom:"14px"}}>
          {data.students.map(s=><span key={s.id} style={t.tag(sel===s.id)} onClick={()=>setSel(s.id)}>{s.name}</span>)}
        </div>
        {stu&&(stu.history.length===0
          ?<div style={{color:C.muted,textAlign:"center",padding:"30px",fontSize:"13px"}}>尚無紀錄</div>
          :[...stu.history].reverse().map((h,i)=>(
            <div key={i} style={{...t.card,flexDirection:"column",alignItems:"flex-start",gap:"5px"}}>
              <div style={{fontWeight:800,color:C.accent}}>📅 {h.date}</div>
              {h.goal&&<div style={{fontSize:"12px",color:C.muted}}>目標：{h.goal}</div>}
              {h.exercises.map((ex,j)=>(
                <div key={j} style={{fontSize:"12px",color:"#aaa"}}>
                  {j+1}. {ex.name} {ex.sets}×{ex.reps}{ex.weight?` @ ${ex.weight}kg`:""}{ex.note?` (${ex.note})`:""}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    );
  };

  const SettingsView = () => {
    const [customEx,setCustomEx] = useState("");
    return (
      <div style={t.page}>
        <div style={{fontWeight:900,fontSize:"20px",marginBottom:"18px"}}>設定</div>
        <div style={t.sec}>
          <div style={t.secTitle}>新增學生</div>
<input style={inputStyle} placeholder="學生姓名"
            onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addStudent()} />
          <button style={t.btnPrimary} onClick={addStudent}>新增</button>
          <div style={{marginTop:"12px"}}>
            {data.students.map(s=>(
              <div key={s.id} style={t.card}>
                <span style={{fontWeight:600}}>{s.name}</span>
                <button style={t.btnDanger} onClick={()=>delStudent(s.id)}>刪除</button>
              </div>
            ))}
          </div>
        </div>
        <div style={t.sec}>
          <div style={t.secTitle}>動作資料庫</div>
          <div style={{display:"flex",gap:"7px",marginBottom:"10px"}}>
            <input style={{...inputStyle,flex:1}} placeholder="新增動作" value={customEx}
              onChange={e=>setCustomEx(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&customEx.trim()){
                setData(d=>({...d,exercises:[...d.exercises,customEx.trim()]}));
                setCustomEx(""); showToast("✅ 已新增");
              }}} />
            <button style={t.btnSecondary} onClick={()=>{
              if(!customEx.trim()) return;
              setData(d=>({...d,exercises:[...d.exercises,customEx.trim()]}));
              setCustomEx(""); showToast("✅ 已新增");
            }}>新增</button>
          </div>
          {data.exercises.map(ex=>(
            <div key={ex} style={t.card}>
              <span style={{fontSize:"13px"}}>{ex}</span>
              <button style={t.btnDanger} onClick={()=>setData(d=>({...d,exercises:d.exercises.filter(e=>e!==ex)}))}>✕</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const navItems = [{id:"home",icon:"🏠",label:"首頁"},{id:"history",icon:"📋",label:"紀錄"},{id:"settings",icon:"⚙️",label:"設定"}];
  const mainViews = ["home","history","settings"];

  return (
    <div style={t.app}>
      <div style={t.header}>
        <div style={t.logo}>💪</div>
        <div>
          <div style={{fontSize:"16px",fontWeight:800}}>Coach Planner</div>
          <div style={{fontSize:"11px",color:C.muted}}>健身教練訓練管理</div>
        </div>
        {syncing&&<div style={{marginLeft:"auto",fontSize:"11px",color:"#f5a623"}}>⏳ 同步中</div>}
      </div>
      {view==="home"    &&<HomeView/>}
      {view==="session" &&<SessionView/>}
      {view==="export"  &&<ExportView/>}
      {view==="history" &&<HistoryView/>}
      {view==="settings"&&<SettingsView/>}
      {toast&&<div style={t.toast}>{toast}</div>}
      {mainViews.includes(view)&&(
        <nav style={t.nav}>
          {navItems.map(item=>(
            <button key={item.id} style={t.navBtn(view===item.id)} onClick={()=>setView(item.id)}>
              <span style={{fontSize:"19px"}}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
