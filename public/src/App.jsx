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
    set
