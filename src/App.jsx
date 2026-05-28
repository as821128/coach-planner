import { useState, useCallback, useMemo } from "react";

const GAS_URL = "https://script.google.com/macros/s/AKfycbw_gQ8-SSjJbD6ymG2Th7KG_ru0y9uQNOv9Lz4MmqbyblUIQ9bCWSiD1mRCJcRqTvvG6Q/exec";
const STORAGE_KEY = "coach_planner_v4";
const API_URL = "https://api.anthropic.com/v1/messages";

const C = {
  bg: "#0d0d0d", surface: "#161616", border: "#242424",
  accent: "#b5f542", text: "#eeebe5", muted: "#777", danger: "#ff5252",
};

const todayISOStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const isoToDisplay = (iso) => iso.replace(/-/g, "/");

function loadHistory() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return [];
}
function saveHistory(h) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); } catch {} }

const t = {
  app:          { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", paddingBottom: "72px" },
  header:       { background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 20 },
  logo:         { width: 34, height: 34, background: C.accent, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flexShrink: 0 },
  nav:          { position: "fixed", bottom: 0, left: 0, right: 0, background: "#111", borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 20 },
  navBtn:       a => ({ flex: 1, padding: "10px 4px 8px", background: "none", border: "none", cursor: "pointer", color: a ? C.accent : "#444", fontSize: "10px", fontWeight: a ? 700 : 400, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }),
  page:         { padding: "18px" },
  sec:          { marginBottom: "22px" },
  secTitle:     { fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", marginBottom: "10px" },
  card:         { background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "13px 15px", marginBottom: "10px" },
  btnPrimary:   { background: C.accent, color: "#0d0d0d", border: "none", borderRadius: "10px", padding: "13px 20px", fontSize: "14px", fontWeight: 800, cursor: "pointer", width: "100%", marginTop: "6px" },
  btnSecondary: { background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: "9px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  btnLine:      { background: "#06c755", color: "#fff", border: "none", borderRadius: "9px", padding: "8px 14px", fontSize: "13px", fontWeight: 700, cursor: "pointer" },
  input:        { background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "11px 13px", color: C.text, fontSize: "14px", width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  textarea:     { background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "11px 13px", color: C.text, fontSize: "13px", width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: "220px", lineHeight: "1.8" },
  exportBox:    { background: "#0a0a0a", border: `1px solid ${C.border}`, borderRadius: "11px", padding: "13px", fontSize: "12px", color: "#aaa", fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: "1.75", marginBottom: "9px", maxHeight: "220px", overflowY: "auto" },
  toast:        { position: "fixed", bottom: "82px", left: "50%", transform: "translateX(-50%)", background: C.accent, color: "#0d0d0d", padding: "9px 20px", borderRadius: "30px", fontSize: "13px", fontWeight: 800, zIndex: 999, whiteSpace: "nowrap", boxShadow: `0 4px 20px ${C.accent}44` },
  skeleton:     { background: "linear-gradient(90deg,#1a1a1a 25%,#2a2a2a 50%,#1a1a1a 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", borderRadius: "6px", height: "14px", marginBottom: "8px" },
  planCard:     { background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px", marginBottom: "10px" },
};

function InputView({ date, setDate, notes, setNotes, loading, onGenerate }) {
  return (
    <div style={t.page}>
      <div style={{ marginBottom: "22px" }}>
        <div style={{ fontSize: "22px", fontWeight: 900, marginBottom: "3px" }}>今日訓練紀錄</div>
        <div style={{ color: C.muted, fontSize: "12px" }}>自由輸入所有學生的課程內容，AI 幫你整理成報告</div>
      </div>
      <div style={t.sec}>
        <div style={t.secTitle}>上課日期</div>
        <input style={t.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div style={t.sec}>
        <div style={t.secTitle}>課程筆記（所有學生）</div>
        <div style={{ color: C.muted, fontSize: "11px", marginBottom: "8px" }}>
          直接輸入每位學生的狀況，AI 會自動辨識每個人並產生個別報告
        </div>
        <textarea
          style={t.textarea}
          placeholder={"範例：\n小明：今天做了深蹲3組10下90kg，硬舉3組8下100kg。右膝稍微不舒服，動作有修正。回家作業：臀橋每天10下。\n\n小美：TRX划船3組12下，單腳RDL進步很多。核心穩定比上次好。下次加強肩膀穩定。"}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>
      <button
        style={{ ...t.btnPrimary, opacity: loading ? 0.6 : 1 }}
        onClick={onGenerate}
        disabled={loading}
      >
        {loading ? "⏳ AI 分析中..." : "✨ AI 產出訓練報告"}
      </button>
    </div>
  );
}

function OutputView({ results, syncing, onCopy }) {
  const shareToLine = useCallback((text) => {
    window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank");
  }, []);

  if (results.length === 0) {
    return (
      <div style={t.page}>
        <div style={{ color: C.muted, textAlign: "center", padding: "60px 0", fontSize: "13px" }}>
          尚無報告，請先在「輸入」頁面記錄課程
        </div>
      </div>
    );
  }

  return (
    <div style={t.page}>
      <div style={{ fontWeight: 900, fontSize: "20px", marginBottom: "4px" }}>📋 今日訓練報告</div>
      <div style={{ fontSize: "12px", color: syncing ? "#f5a623" : C.accent, marginBottom: "20px" }}>
        {syncing ? "⏳ 同步 Google Sheet 中..." : "✅ 已自動寫入 Google Sheet"}
      </div>
      {results.map((r, i) => (
        <div key={i} style={t.card}>
          <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "10px", color: C.accent }}>
            👤 {r.name}
          </div>
          <div style={t.exportBox}>{r.report}</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button style={t.btnSecondary} onClick={() => onCopy(r.report, r.name)}>
              📋 複製
            </button>
            <button style={t.btnLine} onClick={() => shareToLine(r.report)}>
              🟢 Line 傳送
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanView({ history }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [plan, setPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);

  const students = useMemo(() => {
    const names = new Set();
    history.forEach(session => session.students.forEach(s => names.add(s.name)));
    return Array.from(names);
  }, [history]);

  const generatePlan = useCallback(async (name) => {
    setSelectedStudent(name);
    setPlan("");
    setPlanLoading(true);

    const recentSessions = history
      .filter(session => session.students.some(s => s.name === name))
      .slice(-5);

    if (recentSessions.length === 0) {
      setPlan("尚無歷史資料，請先記錄課程後再使用備課建議功能。");
      setPlanLoading(false);
      return;
    }

    const sessionText = recentSessions
      .map(session => {
        const sd = session.students.find(s => s.name === name);
        return `【日期】${session.date}\n【紀錄】${sd?.report || ""}`;
      })
      .join("\n\n");

    const prompt = `你是一位專業健身教練助理。請根據以下學生 ${name} 最近 ${recentSessions.length} 次的課程紀錄，提供下次上課的備課建議。

${sessionText}

請用繁體中文輸出以下格式（純文字，不要使用 markdown 符號如 ** 或 #）：

📌 上次重點回顧
（簡述上次課程的重點和學生表現）

🎯 本次建議方向
（根據趨勢給出具體的本次課程方向建議）

💪 推薦動作清單
（列出3-5個推薦的訓練動作，每個附上簡短說明）

⚠️ 教練提醒
（需要特別注意的事項，如傷病、動作問題、進步點等）`;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const d = await res.json();
      setPlan(d.content.map(c => c.text || "").join("").trim());
    } catch (e) {
      setPlan("❌ 備課建議產生失敗，請再試一次。");
      console.error(e);
    }
    setPlanLoading(false);
  }, [history]);

  return (
    <div style={t.page}>
      <div style={{ fontWeight: 900, fontSize: "22px", marginBottom: "4px" }}>📚 備課建議</div>
      <div style={{ color: C.muted, fontSize: "12px", marginBottom: "18px" }}>
        選擇學生，AI 根據歷史紀錄產出下次上課建議
      </div>

      {students.length === 0 ? (
        <div style={{ color: C.muted, textAlign: "center", padding: "40px 0", fontSize: "13px" }}>
          尚無學生資料，請先在「輸入」頁面記錄課程
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
            {students.map(name => (
              <button
                key={name}
                onClick={() => generatePlan(name)}
                style={{
                  padding: "8px 16px",
                  background: selectedStudent === name ? C.accent : C.surface,
                  color: selectedStudent === name ? "#0d0d0d" : C.text,
                  border: `1px solid ${selectedStudent === name ? C.accent : C.border}`,
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: selectedStudent === name ? 700 : 400,
                  cursor: "pointer",
                }}
              >
                {name}
              </button>
            ))}
          </div>

          {selectedStudent && (
            <div style={t.planCard}>
              <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "14px", color: C.accent }}>
                📋 {selectedStudent} 的備課建議
              </div>
              {planLoading ? (
                <div>
                  {[100, 80, 90, 60, 85, 70, 95, 55, 75, 65].map((w, i) => (
                    <div key={i} style={{ ...t.skeleton, width: `${w}%` }} />
                  ))}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: "13px", color: C.text, lineHeight: "1.9", whiteSpace: "pre-wrap", marginBottom: "14px" }}>
                    {plan}
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button style={t.btnSecondary} onClick={() => navigator.clipboard.writeText(plan)}>
                      📋 複製備課建議
                    </button>
                    <button
                      style={{ ...t.btnSecondary, borderColor: C.accent, color: C.accent }}
                      onClick={() => generatePlan(selectedStudent)}
                    >
                      🔄 重新產生
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HistoryView({ history }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div style={t.page}>
      <div style={{ fontWeight: 900, fontSize: "22px", marginBottom: "4px" }}>📅 歷史紀錄</div>
      <div style={{ color: C.muted, fontSize: "12px", marginBottom: "18px" }}>所有課程紀錄</div>

      {history.length === 0 ? (
        <div style={{ color: C.muted, textAlign: "center", padding: "40px 0", fontSize: "13px" }}>
          尚無紀錄，請先使用輸入頁面記錄課程
        </div>
      ) : (
        [...history].reverse().map((session, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "13px 15px", marginBottom: "8px" }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div>
                <div style={{ fontWeight: 800, color: C.accent, fontSize: "14px" }}>📅 {session.date}</div>
                <div style={{ fontSize: "12px", color: C.muted, marginTop: "3px" }}>
                  {session.students.map(s => s.name).join("、")}
                </div>
              </div>
              <div style={{ color: C.muted, fontSize: "16px" }}>{expanded === i ? "▲" : "▼"}</div>
            </div>
            {expanded === i && (
              <div style={{ marginTop: "14px", borderTop: `1px solid ${C.border}`, paddingTop: "14px" }}>
                {session.students.map((s, j) => (
                  <div key={j} style={{ marginBottom: "16px" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>👤 {s.name}</div>
                    <div style={{ fontSize: "12px", color: "#aaa", lineHeight: "1.75", whiteSpace: "pre-wrap" }}>{s.report}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default function CoachPlanner() {
  const [tab, setTab]       = useState("input");
  const [date, setDate]     = useState(todayISOStr);
  const [notes, setNotes]   = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState(loadHistory);
  const [toast, setToast]   = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const setNotesCallback = useCallback(v => setNotes(v), []);
  const setDateCallback  = useCallback(v => setDate(v), []);

  const generate = useCallback(async () => {
    if (!notes.trim()) return showToast("請先輸入課程筆記！");
    setLoading(true);

    const displayDate = isoToDisplay(date);
    const prompt = `你是一位專業健身教練助理。以下是教練今天（${displayDate}）的課程筆記，包含多位學生的資訊。

請幫我：
1. 辨識出每位學生的名字
2. 為每位學生產生一份給學生看的訓練紀錄（繁體中文、專業親切、含日期、動作清單、重點分析、鼓勵話語）

課程筆記：
${notes}

請輸出 JSON 格式（不要任何 markdown 或多餘文字）：
[
  {"name": "學生姓名", "report": "給學生看的完整訓練紀錄"},
  {"name": "學生姓名2", "report": "..."}
]`;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const d = await res.json();
      const raw = d.content.map(c => c.text || "").join("").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw);

      setResults(parsed);
      const sessionRecord = { date: displayDate, students: parsed };
      setHistory(prev => {
        const newHistory = [...prev, sessionRecord];
        saveHistory(newHistory);
        return newHistory;
      });
      setTab("output");

      setSyncing(true);
      try {
        for (const s of parsed) {
          await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({ action: "appendRow", row: [displayDate, s.name, s.report] }),
          });
        }
        showToast("✅ 已自動寫入 Google Sheet！");
      } catch {
        showToast("⚠️ Sheet 同步失敗，可手動複製");
      }
      setSyncing(false);
    } catch (e) {
      showToast("❌ 產生失敗，請再試一次");
      console.error(e);
    }
    setLoading(false);
  }, [notes, date, showToast]);

  const handleCopy = useCallback((text, name) => {
    navigator.clipboard.writeText(text).then(() => showToast(`✅ ${name} 的報告已複製！`));
  }, [showToast]);

  const navItems = [
    { id: "input",   icon: "✏️",  label: "輸入" },
    { id: "output",  icon: "📋",  label: "今日紀錄" },
    { id: "plan",    icon: "📚",  label: "備課" },
    { id: "history", icon: "📅",  label: "歷史" },
  ];

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={t.app}>
        <div style={t.header}>
          <div style={t.logo}>💪</div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 800 }}>Coach Planner</div>
            <div style={{ fontSize: "11px", color: C.muted }}>健身教練訓練管理</div>
          </div>
          {syncing && <div style={{ marginLeft: "auto", fontSize: "11px", color: "#f5a623" }}>⏳ 同步中</div>}
        </div>

        {tab === "input"   && <InputView date={date} setDate={setDateCallback} notes={notes} setNotes={setNotesCallback} loading={loading} onGenerate={generate} />}
        {tab === "output"  && <OutputView results={results} syncing={syncing} onCopy={handleCopy} />}
        {tab === "plan"    && <PlanView history={history} />}
        {tab === "history" && <HistoryView history={history} />}

        {toast && <div style={t.toast}>{toast}</div>}

        <nav style={t.nav}>
          {navItems.map(item => (
            <button key={item.id} style={t.navBtn(tab === item.id)} onClick={() => setTab(item.id)}>
              <span style={{ fontSize: "19px" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
