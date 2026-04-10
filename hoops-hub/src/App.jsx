import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// ============================================
// CONFIG — fill in your Supabase credentials
// ============================================
const SUPABASE_URL = "https://inkuzznfbkxkknocoelz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YzQ9BD5FaIWuXN3JV4xzDA_1HeuthlX";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// XP CONSTANTS
// ============================================
const XP_WORKOUT_COMPLETE = 100;
const XP_PROOF_UPLOAD = 25;
const XP_STREAK_3 = 50;
const XP_STREAK_7 = 150;
const XP_WEEKLY_TOP3 = 200;

const XP_RULES = [
  { action: "Workout tehtud", xp: `+${XP_WORKOUT_COMPLETE} XP` },
  { action: "Tõestus üles laetud", xp: `+${XP_PROOF_UPLOAD} XP` },
  { action: "3-päeva streak", xp: `+${XP_STREAK_3} XP bonus` },
  { action: "7-päeva streak", xp: `+${XP_STREAK_7} XP bonus` },
];

const ACHIEVEMENTS = [
  { id: "first_workout", icon: "💪", title: "Esimene trenn", desc: "Tee oma esimene workout", check: (s) => s.totalWorkouts >= 1 },
  { id: "streak_3", icon: "🔥", title: "Tulekahju", desc: "3-päeva streak", check: (s) => s.streak >= 3 },
  { id: "streak_7", icon: "🌋", title: "Laava", desc: "7-päeva streak", check: (s) => s.streak >= 7 },
  { id: "proofs_5", icon: "📸", title: "Tõestaja", desc: "Lisa 5 tõestuspilti", check: (s) => s.totalProofs >= 5 },
  { id: "workouts_10", icon: "🏀", title: "Baller", desc: "Tee 10 workouti", check: (s) => s.totalWorkouts >= 10 },
  { id: "workouts_20", icon: "👑", title: "Legend", desc: "Tee 20 workouti", check: (s) => s.totalWorkouts >= 20 },
  { id: "xp_1000", icon: "⭐", title: "1K klubi", desc: "Kogu 1000 XP", check: (s) => s.xp >= 1000 },
  { id: "top3", icon: "🏆", title: "Top 3", desc: "Jõua edetabeli top 3-e", check: (s) => s.rank <= 3 },
];

const AVATARS = ["🏀", "⭐", "🔥", "💪", "🎯", "🚀", "🏆", "✨", "👑", "🌟", "💫", "🎮"];

// ============================================
// HELPERS
// ============================================
async function hashPin(pin) {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function calcStreak(completionDates) {
  if (!completionDates.length) return 0;
  const unique = [...new Set(completionDates.map((d) => d.slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diff = (prev - curr) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function calcXP(totalWorkoutsCompleted, totalProofs, streak) {
  let xp = totalWorkoutsCompleted * XP_WORKOUT_COMPLETE;
  xp += totalProofs * XP_PROOF_UPLOAD;
  if (streak >= 3) xp += XP_STREAK_3;
  if (streak >= 7) xp += XP_STREAK_7;
  return xp;
}

function getCompletedWorkoutIds(exercises, completions, participantId) {
  const myCompletions = new Set(completions.filter((c) => c.participant_id === participantId).map((c) => c.exercise_id));
  const workoutExercises = {};
  exercises.forEach((ex) => {
    if (!workoutExercises[ex.workout_id]) workoutExercises[ex.workout_id] = [];
    workoutExercises[ex.workout_id].push(ex.id);
  });
  const completed = [];
  Object.entries(workoutExercises).forEach(([wId, exIds]) => {
    if (exIds.length > 0 && exIds.every((id) => myCompletions.has(id))) completed.push(wId);
  });
  return completed;
}

function relativeDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return "Täna";
  if (diff === 1) return "Eile";
  if (diff === 2) return "Üleeile";
  if (diff < 7) return `${diff} päeva tagasi`;
  return d.toLocaleDateString("et-EE", { day: "numeric", month: "short" });
}

// ============================================
// STYLES
// ============================================
const C = {
  bg: "#0a0a14",
  card: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.06)",
  accent: "#FF6B35",
  accentLight: "rgba(255,107,53,0.15)",
  green: "#4CAF50",
  greenLight: "rgba(76,175,80,0.08)",
  text: "#fff",
  textSoft: "rgba(255,255,255,0.4)",
  textMuted: "rgba(255,255,255,0.25)",
};

const globalStyles = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes breatheCircle {
    0% { transform: scale(0.55); }
    40% { transform: scale(1); }
    100% { transform: scale(0.55); }
  }
  @keyframes breatheGlow {
    0% { opacity: 0.15; transform: scale(0.5); }
    40% { opacity: 0.4; transform: scale(1.1); }
    100% { opacity: 0.15; transform: scale(0.5); }
  }
  @keyframes ringRotate { to { transform: rotate(360deg); } }
  @keyframes particleFloat {
    0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
    50% { transform: translateY(-30px) scale(1.3); opacity: 0.7; }
  }
  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  ::-webkit-scrollbar { display: none; }
  body { margin: 0; background: ${C.bg}; }
  input, textarea, select { font-family: 'DM Sans', sans-serif; }
`;

// ============================================
// SMALL COMPONENTS
// ============================================
function Loader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.cardBorder}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

function NavBar({ active, onChange }) {
  const items = [
    { id: "dashboard", icon: "⚡", label: "Avaleht" },
    { id: "workouts", icon: "📋", label: "Trennid" },
    { id: "breathe", icon: "🧘", label: "Hingamine" },
    { id: "leaderboard", icon: "🏆", label: "Edetabel" },
    { id: "profile", icon: "👤", label: "Profiil" },
  ];
  return (
    <div style={{ display: "flex", justifyContent: "space-around", padding: "8px 0 max(12px, env(safe-area-inset-bottom))", background: "rgba(15,15,25,0.95)", backdropFilter: "blur(20px)", borderTop: `1px solid ${C.cardBorder}`, position: "sticky", bottom: 0, zIndex: 100 }}>
      {items.map((it) => (
        <button key={it.id} onClick={() => onChange(it.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", padding: "4px 12px" }}>
          <span style={{ fontSize: 20, filter: active === it.id ? "none" : "grayscale(0.8)", opacity: active === it.id ? 1 : 0.5, transition: "all 0.2s" }}>{it.icon}</span>
          <span style={{ fontSize: 10, fontWeight: active === it.id ? 700 : 500, color: active === it.id ? C.accent : C.textMuted, transition: "color 0.2s" }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function StatCard({ icon, value, label, accent }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "16px 14px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent || C.text, fontFamily: "'Outfit', sans-serif", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textSoft, marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Modal({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#16161f", border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, maxHeight: "80vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.card, borderRadius: 12, padding: 4, marginBottom: 20 }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, background: active === t.id ? C.accent : "transparent", color: active === t.id ? "#fff" : C.textSoft, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// AUTH SCREEN
// ============================================
function AuthScreen({ participants, onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!selectedId || pin.length !== 4) { setError("Vali nimi ja sisesta 4-kohaline PIN"); return; }
    setLoading(true);
    setError("");
    const h = await hashPin(pin);
    const p = participants.find((p) => p.id === selectedId);
    if (p && p.pin_hash === h) {
      sessionStorage.setItem("hoopshub_user", JSON.stringify(p));
      onLogin(p);
    } else {
      setError("Vale PIN!");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name.trim() || pin.length !== 4) { setError("Sisesta nimi ja 4-kohaline PIN"); return; }
    setLoading(true);
    setError("");
    const h = await hashPin(pin);
    const { data, error: err } = await supabase.from("participants").insert({ name: name.trim(), name_lower: name.trim().toLowerCase(), pin_hash: h }).select().single();
    if (err) {
      setError(err.message.includes("unique") ? "See nimi on juba võetud!" : err.message);
    } else {
      sessionStorage.setItem("hoopshub_user", JSON.stringify(data));
      onLogin(data);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🏀</div>
      <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 900, color: C.text, margin: "0 0 4px" }}>Hoops Hub</h1>
      <p style={{ color: C.textSoft, fontSize: 14, marginBottom: 32 }}>Korvpalli community</p>

      <div style={{ display: "flex", gap: 4, background: C.card, borderRadius: 12, padding: 4, marginBottom: 24, width: "100%", maxWidth: 320 }}>
        <button onClick={() => { setMode("login"); setError(""); }} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, background: mode === "login" ? C.accent : "transparent", color: mode === "login" ? "#fff" : C.textSoft, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Logi sisse</button>
        <button onClick={() => { setMode("register"); setError(""); }} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, background: mode === "register" ? C.accent : "transparent", color: mode === "register" ? "#fff" : C.textSoft, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Registreeri</button>
      </div>

      <div style={{ width: "100%", maxWidth: 320 }}>
        {mode === "login" ? (
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.cardBorder}`, borderRadius: 12, color: C.text, fontSize: 15, marginBottom: 12, appearance: "none", outline: "none" }}>
            <option value="">Vali oma nimi...</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sinu nimi" maxLength={20} style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.cardBorder}`, borderRadius: 12, color: C.text, fontSize: 15, marginBottom: 12, outline: "none" }} />
        )}

        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4-kohaline PIN" type="password" inputMode="numeric" maxLength={4} style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.cardBorder}`, borderRadius: 12, color: C.text, fontSize: 15, marginBottom: 16, outline: "none", letterSpacing: "0.3em", textAlign: "center" }} />

        {error && <div style={{ color: "#e74c3c", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

        <button onClick={mode === "login" ? handleLogin : handleRegister} disabled={loading} style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${C.accent}, #FF8F5E)`, border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "..." : mode === "login" ? "Logi sisse" : "Registreeri"}
        </button>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD SCREEN
// ============================================
function DashboardScreen({ user, stats, workouts, exercises, completions, leaderboard, onNavigate }) {
  const newestWorkout = workouts[0];
  const myCompletedExercises = new Set(completions.filter((c) => c.participant_id === user.id).map((c) => c.exercise_id));
  const newestExercises = newestWorkout ? exercises.filter((e) => e.workout_id === newestWorkout.id) : [];
  const newestDone = newestExercises.filter((e) => myCompletedExercises.has(e.id)).length;

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ padding: "28px 0 20px" }}>
        <div style={{ fontSize: 13, color: C.textSoft, fontWeight: 500, marginBottom: 4 }}>Tere 👋</div>
        <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.text }}>{user.name}</div>
      </div>

      {/* Streak hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.accent} 0%, #FF8F5E 50%, #E85D26 100%)`, borderRadius: 20, padding: 22, marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -10, fontSize: 80, opacity: 0.15 }}>🏀</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500, marginBottom: 6 }}>Sinu streak</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 42, fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: "#fff", lineHeight: 1 }}>{stats.streak}</span>
          <span style={{ fontSize: 18, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>päeva 🔥</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <StatCard icon="⭐" value={stats.xp.toLocaleString()} label="XP kokku" accent={C.accent} />
        <StatCard icon="📋" value={stats.totalWorkouts} label="Trenni tehtud" />
        <StatCard icon="🏅" value={stats.rank > 0 ? `#${stats.rank}` : "-"} label="Edetabelis" />
      </div>

      {/* Newest workout */}
      {newestWorkout && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: C.text }}>Uus workout 🆕</span>
            <button onClick={() => onNavigate("workouts")} style={{ background: "none", border: "none", color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Kõik →</button>
          </div>
          <div onClick={() => onNavigate("workout_detail", newestWorkout)} style={{ background: C.card, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 16, padding: 18, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ display: "inline-block", background: C.accentLight, color: C.accent, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {newestWorkout.type === "video" ? "🎬 Video" : newestWorkout.type === "both" ? "🎬+📝" : "📝 Tekst"}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Outfit', sans-serif" }}>{newestWorkout.title}</div>
              </div>
              {newestWorkout.duration && <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{newestWorkout.duration}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
              <div style={{ height: 4, flex: 1, background: C.cardBorder, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: newestExercises.length ? `${(newestDone / newestExercises.length) * 100}%` : "0%", background: newestDone === newestExercises.length && newestExercises.length > 0 ? C.green : C.accent, borderRadius: 2, transition: "width 0.3s" }} />
              </div>
              <span style={{ fontSize: 11, color: newestDone === newestExercises.length && newestExercises.length > 0 ? C.green : C.textMuted, fontWeight: 600 }}>
                {newestDone === newestExercises.length && newestExercises.length > 0 ? "✅" : `${newestDone}/${newestExercises.length}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: C.text, marginBottom: 14 }}>Edetabeli top 3 🏆</div>
        {leaderboard.slice(0, 3).map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: i === 0 ? "rgba(255,215,0,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${i === 0 ? "rgba(255,215,0,0.12)" : C.cardBorder}`, borderRadius: 14, marginBottom: 8 }}>
            <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{["🥇", "🥈", "🥉"][i]}</span>
            <span style={{ fontSize: 16 }}>{p.avatar || "🏀"}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: p.id === user.id ? C.accent : C.text }}>{p.name}{p.id === user.id ? " (sina)" : ""}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.accent, fontFamily: "'Outfit', sans-serif" }}>{p.xp.toLocaleString()} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// WORKOUT LIST SCREEN
// ============================================
function WorkoutListScreen({ user, workouts, exercises, completions, onSelect }) {
  const myCompletedExercises = new Set(completions.filter((c) => c.participant_id === user.id).map((c) => c.exercise_id));

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ padding: "28px 0 20px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.text }}>Kodused trennid 📋</div>
        <div style={{ fontSize: 13, color: C.textSoft, marginTop: 4 }}>Treener lisab igal nädalal uue workouti</div>
      </div>

      {workouts.length === 0 && <div style={{ color: C.textSoft, fontSize: 14, textAlign: "center", padding: "40px 0" }}>Veel pole ühtegi workouti lisatud</div>}

      {workouts.map((w, i) => {
        const wExercises = exercises.filter((e) => e.workout_id === w.id);
        const done = wExercises.filter((e) => myCompletedExercises.has(e.id)).length;
        const allDone = wExercises.length > 0 && done === wExercises.length;
        const isNew = (Date.now() - new Date(w.created_at).getTime()) < 7 * 86400000;

        // Count how many participants completed this workout
        const completedByCount = new Set();
        const wExIds = new Set(wExercises.map(e => e.id));
        const participantExercises = {};
        completions.forEach(c => {
          if (wExIds.has(c.exercise_id)) {
            if (!participantExercises[c.participant_id]) participantExercises[c.participant_id] = new Set();
            participantExercises[c.participant_id].add(c.exercise_id);
          }
        });
        Object.entries(participantExercises).forEach(([pid, exSet]) => {
          if (wExercises.every(e => exSet.has(e.id))) completedByCount.add(pid);
        });

        return (
          <div key={w.id} onClick={() => onSelect(w)} style={{ background: C.card, border: `1px solid ${isNew ? "rgba(255,107,53,0.2)" : C.cardBorder}`, borderRadius: 16, padding: 18, marginBottom: 10, cursor: "pointer", animation: `fadeIn 0.3s ease ${i * 0.06}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {isNew && <span style={{ background: C.accentLight, color: C.accent, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>🆕 Uus</span>}
                <span style={{ background: "rgba(255,255,255,0.06)", color: C.textSoft, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>
                  {w.type === "video" ? "🎬 Video" : w.type === "both" ? "🎬+📝" : "📝 Tekst"}
                </span>
              </div>
              {w.duration && <span style={{ fontSize: 12, color: C.textMuted }}>{w.duration}</span>}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>{w.title}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
              {relativeDate(w.created_at)} · {wExercises.length} harjutust · {completedByCount.size} teinud
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 4, flex: 1, background: C.cardBorder, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: wExercises.length ? `${(done / wExercises.length) * 100}%` : "0%", background: allDone ? C.green : C.accent, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, color: allDone ? C.green : C.textMuted, fontWeight: 600 }}>{allDone ? "✅" : `${done}/${wExercises.length}`}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// WORKOUT DETAIL SCREEN
// ============================================
function WorkoutDetailScreen({ user, workout, exercises, completions, proofs, onBack, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [toggling, setToggling] = useState(null);
  const wExercises = exercises.filter((e) => e.workout_id === workout.id).sort((a, b) => a.sort_order - b.sort_order);
  const myCompletions = new Set(completions.filter((c) => c.participant_id === user.id).map((c) => c.exercise_id));
  const myProofs = proofs.filter((p) => p.participant_id === user.id && p.workout_id === workout.id);
  const doneCount = wExercises.filter((e) => myCompletions.has(e.id)).length;
  const allDone = wExercises.length > 0 && doneCount === wExercises.length;

  const toggleExercise = async (exerciseId) => {
    if (toggling) return;
    setToggling(exerciseId);
    if (myCompletions.has(exerciseId)) {
      await supabase.from("completions").delete().eq("participant_id", user.id).eq("exercise_id", exerciseId);
    } else {
      await supabase.from("completions").insert({ participant_id: user.id, exercise_id: exerciseId, workout_id: workout.id });
    }
    await onRefresh();
    setToggling(null);
  };

  const uploadProof = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Fail on liiga suur (max 10MB)"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${user.id}_${workout.id}_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("proofs").upload(fileName, file);
    if (uploadErr) { alert("Upload ebaõnnestus: " + uploadErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("proofs").getPublicUrl(fileName);
    await supabase.from("proofs").insert({ participant_id: user.id, workout_id: workout.id, image_url: urlData.publicUrl });
    await onRefresh();
    setUploading(false);
  };

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.accent, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "20px 0 12px", display: "flex", alignItems: "center", gap: 4 }}>← Tagasi</button>

      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.text, marginBottom: 6 }}>{workout.title}</div>
      <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 20 }}>{workout.duration ? `${workout.duration} · ` : ""}{wExercises.length} harjutust</div>

      {workout.video_url && (
        <div style={{ marginBottom: 20, borderRadius: 16, overflow: "hidden" }}>
          <video src={workout.video_url} controls playsInline preload="metadata" style={{ width: "100%", display: "block", borderRadius: 16, background: "#000" }} />
        </div>
      )}

      {workout.description && <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.6, marginBottom: 24 }}>{workout.description}</div>}

      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: C.text, marginBottom: 14 }}>Harjutused ({doneCount}/{wExercises.length})</div>

      {wExercises.map((ex) => {
        const isDone = myCompletions.has(ex.id);
        const isLoading = toggling === ex.id;
        return (
          <div key={ex.id} onClick={() => toggleExercise(ex.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: isDone ? C.greenLight : "rgba(255,255,255,0.03)", border: `1px solid ${isDone ? "rgba(76,175,80,0.15)" : C.cardBorder}`, borderRadius: 14, marginBottom: 8, cursor: "pointer", opacity: isLoading ? 0.5 : 1, transition: "all 0.2s" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, border: isDone ? "none" : "2px solid rgba(255,255,255,0.15)", background: isDone ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0 }}>{isDone ? "✓" : ""}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: isDone ? C.textSoft : C.text, textDecoration: isDone ? "line-through" : "none" }}>{ex.name}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{ex.reps}</div>
            </div>
          </div>
        );
      })}

      {allDone && (
        <div style={{ background: C.greenLight, border: "1px solid rgba(76,175,80,0.2)", borderRadius: 14, padding: 16, textAlign: "center", marginTop: 16 }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🎉</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Kõik tehtud! +{XP_WORKOUT_COMPLETE} XP</div>
        </div>
      )}

      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, padding: 16, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, color: C.textSoft, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: uploading ? 0.5 : 1 }}>
        <input type="file" accept="image/*,video/*" onChange={uploadProof} disabled={uploading} style={{ display: "none" }} />
        {uploading ? "Laen üles..." : `📸 Lisa tõestus (pilt/video) — +${XP_PROOF_UPLOAD} XP`}
      </label>

      {myProofs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textSoft, marginBottom: 10 }}>Sinu tõestused</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {myProofs.map((p) => (
              <img key={p.id} src={p.image_url} alt="proof" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// LOG SCREEN
// ============================================
function LogScreen({ user, completions, exercises, workouts, proofs }) {
  const days = ["E", "T", "K", "N", "R", "L", "P"];
  const myCompletions = completions.filter((c) => c.participant_id === user.id);

  // Build day-by-day completion data for this week and last week
  const getWeekData = (weeksAgo) => {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Mon = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek - weeksAgo * 7);
    monday.setHours(0, 0, 0, 0);

    return days.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const hasCompletion = myCompletions.some((c) => c.completed_at.slice(0, 10) === dateStr);
      const isFuture = d > now;
      return { dateStr, hasCompletion, isFuture };
    });
  };

  const thisWeek = getWeekData(0);
  const lastWeek = getWeekData(1);

  // Recent entries grouped by workout
  const myCompletedExerciseIds = new Set(myCompletions.map((c) => c.exercise_id));
  const completedWorkouts = [];
  const seen = new Set();
  workouts.forEach((w) => {
    const wEx = exercises.filter((e) => e.workout_id === w.id);
    if (wEx.length === 0) return;
    const doneEx = wEx.filter((e) => myCompletedExerciseIds.has(e.id));
    if (doneEx.length === 0) return;
    if (seen.has(w.id)) return;
    seen.add(w.id);
    const allDone = doneEx.length === wEx.length;
    const latestCompletion = myCompletions.filter((c) => wEx.some((e) => e.id === c.exercise_id)).sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0];
    const hasProof = proofs.some((p) => p.participant_id === user.id && p.workout_id === w.id);
    completedWorkouts.push({ workout: w, done: doneEx.length, total: wEx.length, allDone, date: latestCompletion?.completed_at, hasProof });
  });
  completedWorkouts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ padding: "28px 0 20px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.text }}>Minu logi ✅</div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textSoft, marginBottom: 14 }}>See nädal</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
          {days.map((d, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: thisWeek[i].hasCompletion ? C.accent : C.card, border: `1px solid ${thisWeek[i].hasCompletion ? C.accent : C.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: thisWeek[i].hasCompletion ? "#fff" : C.textMuted, opacity: thisWeek[i].isFuture ? 0.3 : 1 }}>
                {thisWeek[i].hasCompletion ? "✓" : ""}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>{d}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: C.textSoft, marginTop: 20, marginBottom: 14 }}>Eelmine nädal</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
          {days.map((d, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: lastWeek[i].hasCompletion ? C.accentLight : "rgba(255,255,255,0.02)", border: `1px solid ${lastWeek[i].hasCompletion ? "rgba(255,107,53,0.3)" : "rgba(255,255,255,0.04)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: lastWeek[i].hasCompletion ? C.accent : "rgba(255,255,255,0.1)" }}>
                {lastWeek[i].hasCompletion ? "✓" : ""}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.2)" }}>{d}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: C.text, marginBottom: 14 }}>Viimased sissekanded</div>

      {completedWorkouts.length === 0 && <div style={{ color: C.textSoft, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Pole veel ühtegi trenni logitud</div>}

      {completedWorkouts.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 14, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.allDone ? C.green : C.accent, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.workout.title}{!entry.allDone ? ` (${entry.done}/${entry.total})` : ""}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{entry.date ? relativeDate(entry.date) : ""}{entry.hasProof ? " · 📸 Tõestus" : ""}</div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.accent, fontFamily: "'Outfit', sans-serif" }}>
            +{(entry.allDone ? XP_WORKOUT_COMPLETE : 0) + (entry.hasProof ? XP_PROOF_UPLOAD : 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// LEADERBOARD SCREEN
// ============================================
function LeaderboardScreen({ user, leaderboard }) {
  const [tab, setTab] = useState("xp");

  const sorted = useMemo(() => {
    const s = [...leaderboard];
    if (tab === "streak") s.sort((a, b) => b.streak - a.streak);
    else if (tab === "workouts") s.sort((a, b) => b.totalWorkouts - a.totalWorkouts);
    return s;
  }, [leaderboard, tab]);

  const leader = sorted[0];

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ padding: "28px 0 16px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.text }}>Edetabel 🏆</div>
      </div>

      <TabBar tabs={[{ id: "xp", label: "XP" }, { id: "streak", label: "Streak 🔥" }, { id: "workouts", label: "Trennid" }]} active={tab} onChange={setTab} />

      {leader && (
        <div style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,107,53,0.06) 100%)", border: "1px solid rgba(255,215,0,0.1)", borderRadius: 20, padding: "24px 20px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🥇</div>
          <div style={{ fontSize: 14, color: C.textSoft, fontWeight: 500 }}>Liider</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.text, margin: "4px 0" }}>{leader.name}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, fontFamily: "'Outfit', sans-serif" }}>
            {tab === "xp" ? `${leader.xp.toLocaleString()} XP` : tab === "streak" ? `${leader.streak} päeva 🔥` : `${leader.totalWorkouts} trenni`}
          </div>
        </div>
      )}

      {sorted.map((p, i) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: p.id === user.id ? "rgba(255,107,53,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${p.id === user.id ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.04)"}`, borderRadius: 14, marginBottom: 6, animation: `fadeIn 0.3s ease ${i * 0.04}s both` }}>
          <span style={{ width: 24, fontSize: i < 3 ? 16 : 13, textAlign: "center", color: i >= 3 ? C.textMuted : undefined, fontWeight: 700 }}>
            {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`}
          </span>
          <span style={{ fontSize: 18, width: 26, textAlign: "center" }}>{p.avatar || "🏀"}</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: p.id === user.id ? 700 : 600, color: p.id === user.id ? C.accent : C.text }}>
            {p.name}{p.id === user.id ? " (sina)" : ""}
          </span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)", fontFamily: "'Outfit', sans-serif" }}>
              {tab === "xp" ? p.xp.toLocaleString() : tab === "streak" ? `${p.streak}🔥` : p.totalWorkouts}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{tab === "xp" ? "XP" : tab === "streak" ? "päeva" : "trenni"}</div>
          </div>
        </div>
      ))}

      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 18, marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Kuidas XP teenida?</div>
        {XP_RULES.map((rule, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < XP_RULES.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none" }}>
            <span style={{ fontSize: 12, color: C.textSoft }}>{rule.action}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, fontFamily: "'Outfit', sans-serif" }}>{rule.xp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// BREATHE / MEDITATION SCREEN
// ============================================
const BREATHE_PRESETS = [
  { id: "calm", label: "Rahunemine", inhale: 4, hold1: 0, exhale: 6, hold2: 0, desc: "Pikk väljahingamine rahustab närvisüsteemi" },
  { id: "box", label: "Box Breathing", inhale: 4, hold1: 4, exhale: 4, hold2: 4, desc: "Armeija tehnika — täielik kontroll" },
  { id: "focus", label: "Fookus", inhale: 4, hold1: 7, exhale: 8, hold2: 0, desc: "4-7-8 tehnika enne võistlust" },
  { id: "energy", label: "Energia", inhale: 3, hold1: 0, exhale: 3, hold2: 0, desc: "Kiire hingamine enne trenni" },
];

function BreatheScreen({ onNavigate }) {
  const [preset, setPreset] = useState(BREATHE_PRESETS[0]);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState("ready"); // ready, inhale, hold1, exhale, hold2
  const [timer, setTimer] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  const phaseLabels = { ready: "Valmis?", inhale: "SISSE", hold1: "HOIA", exhale: "VÄLJA", hold2: "HOIA" };
  const phaseColors = { ready: C.textSoft, inhale: "#64B5F6", hold1: "#FFB74D", exhale: "#81C784", hold2: "#FFB74D" };

  const totalCycleTime = preset.inhale + preset.hold1 + preset.exhale + preset.hold2;

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        const next = t + 0.05;
        setTotalSeconds((s) => s + 0.05);

        // Determine current phase
        const cyclePos = next % totalCycleTime;
        let newPhase;
        if (cyclePos < preset.inhale) {
          newPhase = "inhale";
        } else if (cyclePos < preset.inhale + preset.hold1) {
          newPhase = preset.hold1 > 0 ? "hold1" : "exhale";
        } else if (cyclePos < preset.inhale + preset.hold1 + preset.exhale) {
          newPhase = "exhale";
        } else {
          newPhase = preset.hold2 > 0 ? "hold2" : "inhale";
        }

        setPhase((prev) => {
          if (prev === "hold2" && newPhase === "inhale") setCycles((c) => c + 1);
          if (prev === "exhale" && newPhase === "inhale" && preset.hold2 === 0) setCycles((c) => c + 1);
          return newPhase;
        });

        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isActive, preset, totalCycleTime]);

  const getPhaseProgress = () => {
    if (!isActive || phase === "ready") return 0;
    const cyclePos = timer % totalCycleTime;
    if (phase === "inhale") return cyclePos / preset.inhale;
    if (phase === "hold1") return (cyclePos - preset.inhale) / preset.hold1;
    if (phase === "exhale") return (cyclePos - preset.inhale - preset.hold1) / preset.exhale;
    if (phase === "hold2") return (cyclePos - preset.inhale - preset.hold1 - preset.exhale) / preset.hold2;
    return 0;
  };

  const getScale = () => {
    if (!isActive || phase === "ready") return 0.55;
    const cyclePos = timer % totalCycleTime;
    if (phase === "inhale") return 0.55 + (cyclePos / preset.inhale) * 0.45;
    if (phase === "hold1") return 1;
    if (phase === "exhale") return 1 - ((cyclePos - preset.inhale - preset.hold1) / preset.exhale) * 0.45;
    if (phase === "hold2") return 0.55;
    return 0.55;
  };

  const getPhaseTimeLeft = () => {
    if (!isActive || phase === "ready") return "";
    const cyclePos = timer % totalCycleTime;
    let elapsed, duration;
    if (phase === "inhale") { elapsed = cyclePos; duration = preset.inhale; }
    else if (phase === "hold1") { elapsed = cyclePos - preset.inhale; duration = preset.hold1; }
    else if (phase === "exhale") { elapsed = cyclePos - preset.inhale - preset.hold1; duration = preset.exhale; }
    else { elapsed = cyclePos - preset.inhale - preset.hold1 - preset.exhale; duration = preset.hold2; }
    return Math.ceil(duration - elapsed);
  };

  const toggle = () => {
    if (isActive) {
      setIsActive(false);
      setPhase("ready");
    } else {
      setIsActive(true);
      setTimer(0);
      setCycles(0);
      setTotalSeconds(0);
      setPhase("inhale");
    }
  };

  const reset = () => {
    setIsActive(false);
    setPhase("ready");
    setTimer(0);
    setCycles(0);
    setTotalSeconds(0);
  };

  const scale = getScale();
  const phaseTime = getPhaseTimeLeft();

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Particles around the circle
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 130 * scale;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      delay: i * 0.3,
    };
  });

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ padding: "28px 0 8px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.text }}>Hingamine 🧘</div>
        <div style={{ fontSize: 13, color: C.textSoft, marginTop: 4 }}>Rahune enne mängu, keskendu enne trenni</div>
      </div>

      {/* Preset selector */}
      {!isActive && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "20px 0" }}>
          {BREATHE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setPreset(p); reset(); }}
              style={{
                background: preset.id === p.id ? C.accentLight : C.card,
                border: `1px solid ${preset.id === p.id ? "rgba(255,107,53,0.3)" : C.cardBorder}`,
                borderRadius: 14,
                padding: "14px 12px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: preset.id === p.id ? C.accent : C.text, marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
                {p.inhale}s sisse{p.hold1 > 0 ? ` · ${p.hold1}s hoia` : ""} · {p.exhale}s välja{p.hold2 > 0 ? ` · ${p.hold2}s hoia` : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {!isActive && (
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.textSoft }}>{preset.desc}</div>
        </div>
      )}

      {/* Breathing visualizer */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 320, position: "relative", margin: "10px 0" }}>
        {/* Outer glow */}
        <div style={{
          position: "absolute",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${phaseColors[phase]}22 0%, transparent 70%)`,
          transform: `scale(${scale * 1.3})`,
          transition: "transform 0.15s linear, background 0.5s",
        }} />

        {/* Rotating ring */}
        {isActive && (
          <div style={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            border: `1px solid ${phaseColors[phase]}30`,
            borderTopColor: `${phaseColors[phase]}80`,
            animation: "ringRotate 8s linear infinite",
          }} />
        )}

        {/* Particles */}
        {isActive && particles.map((p, i) => (
          <div key={i} style={{
            position: "absolute",
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: phaseColors[phase],
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            opacity: 0.4,
            transition: "all 0.15s linear",
            animation: `particleFloat ${totalCycleTime}s ease-in-out ${p.delay}s infinite`,
          }} />
        ))}

        {/* Main circle */}
        <div style={{
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: `radial-gradient(circle at 40% 35%, ${phaseColors[phase]}40 0%, ${phaseColors[phase]}15 50%, transparent 80%)`,
          border: `2px solid ${phaseColors[phase]}50`,
          transform: `scale(${scale})`,
          transition: "transform 0.15s linear, border-color 0.5s, background 0.5s",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{
            fontSize: isActive ? 18 : 16,
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            color: phaseColors[phase],
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            transition: "color 0.5s",
          }}>{phaseLabels[phase]}</div>
          {phaseTime !== "" && (
            <div style={{
              fontSize: 36,
              fontWeight: 900,
              fontFamily: "'Outfit', sans-serif",
              color: C.text,
              marginTop: 4,
              lineHeight: 1,
            }}>{phaseTime}</div>
          )}
        </div>
      </div>

      {/* Stats when active */}
      {isActive && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.text }}>{cycles}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>tsüklit</div>
          </div>
          <div style={{ width: 1, background: C.cardBorder, margin: "4px 16px" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.text }}>{formatTime(totalSeconds)}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>aega</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button
          onClick={toggle}
          style={{
            padding: "16px 40px",
            background: isActive ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${C.accent}, #FF8F5E)`,
            border: isActive ? `1px solid ${C.cardBorder}` : "none",
            borderRadius: 16,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >{isActive ? "⏹ Peata" : "▶ Alusta"}</button>

        {isActive && (
          <button
            onClick={reset}
            style={{
              padding: "16px 20px",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${C.cardBorder}`,
              borderRadius: 16,
              color: C.textSoft,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >↺</button>
        )}
      </div>

      {/* Tips section */}
      {!isActive && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: C.text, marginBottom: 14 }}>Nõuanded 💡</div>
          {[
            { icon: "🏀", tip: "Kasuta \"Fookus\" rutiini 5 min enne mängu vabaviskejoonel" },
            { icon: "😤", tip: "\"Rahunemine\" aitab pärast intensiivset trenni taastuda" },
            { icon: "💤", tip: "\"Box Breathing\" enne magamaminekut parandab und" },
            { icon: "⚡", tip: "\"Energia\" rutiin hommikul ärgates annab hea stardi" },
          ].map((t, i) => (
            <div key={i} style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "12px 14px",
              background: C.card,
              border: `1px solid ${C.cardBorder}`,
              borderRadius: 12,
              marginBottom: 6,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
              <span style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.5 }}>{t.tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// PROFILE SCREEN
// ============================================
function ProfileScreen({ user, stats, proofs, onLogout, onAvatarChange, onNavigate }) {
  const [showAvatars, setShowAvatars] = useState(false);
  const allProofs = proofs.filter((p) => p.participant_id === user.id);

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ padding: "28px 0 20px", textAlign: "center" }}>
        <div onClick={() => setShowAvatars(true)} style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, #FF8F5E)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 12px", cursor: "pointer" }}>{user.avatar || "🏀"}</div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.text }}>{user.name}</div>
        <div style={{ fontSize: 13, color: C.textSoft, marginTop: 4 }}>Vajuta avatarile, et muuta</div>
      </div>

      {showAvatars && (
        <Modal onClose={() => setShowAvatars(false)}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>Vali avatar</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {AVATARS.map((a) => (
              <button key={a} onClick={() => { onAvatarChange(a); setShowAvatars(false); }} style={{ fontSize: 28, padding: 12, background: user.avatar === a ? C.accentLight : C.card, border: `1px solid ${user.avatar === a ? C.accent : C.cardBorder}`, borderRadius: 14, cursor: "pointer" }}>{a}</button>
            ))}
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <StatCard icon="⭐" value={stats.xp.toLocaleString()} label="XP kokku" accent={C.accent} />
        <StatCard icon="🔥" value={stats.streak} label="Streak" />
        <StatCard icon="📋" value={stats.totalWorkouts} label="Trennid" />
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: C.text, marginBottom: 14 }}>Saavutused 🎖️</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = a.check(stats);
          return (
            <div key={a.id} style={{ background: unlocked ? "rgba(255,107,53,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${unlocked ? "rgba(255,107,53,0.12)" : "rgba(255,255,255,0.04)"}`, borderRadius: 14, padding: 16, opacity: unlocked ? 1 : 0.4 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{a.title}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{a.desc}</div>
            </div>
          );
        })}
      </div>

      {allProofs.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: C.text, marginBottom: 14 }}>Minu tõestused 📸</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 24 }}>
            {allProofs.map((p) => (
              <img key={p.id} src={p.image_url} alt="" style={{ width: "100%", aspectRatio: "1", borderRadius: 12, objectFit: "cover" }} />
            ))}
          </div>
        </>
      )}

      <button onClick={() => onNavigate("log")} style={{ width: "100%", padding: 14, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>✅ Minu treeningu logi</button>

      <button onClick={onLogout} style={{ width: "100%", padding: 14, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.cardBorder}`, borderRadius: 12, color: C.textSoft, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Logi välja</button>
    </div>
  );
}

// ============================================
// TRAINER: ADD WORKOUT
// ============================================
function AddWorkoutScreen({ user, onBack, onRefresh }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("both");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [exerciseList, setExerciseList] = useState([{ name: "", reps: "" }, { name: "", reps: "" }, { name: "", reps: "" }]);
  const [saving, setSaving] = useState(false);
  const [videoFile, setVideoFile] = useState(null);

  const addExercise = () => setExerciseList([...exerciseList, { name: "", reps: "" }]);
  const removeExercise = (i) => setExerciseList(exerciseList.filter((_, j) => j !== i));
  const updateExercise = (i, field, val) => {
    const next = [...exerciseList];
    next[i] = { ...next[i], [field]: val };
    setExerciseList(next);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert("Video on liiga suur (max 50MB)"); return; }
    setVideoFile(file);
  };

  const save = async () => {
    if (!title.trim()) { alert("Lisa pealkiri"); return; }
    const validExercises = exerciseList.filter((e) => e.name.trim() && e.reps.trim());
    if (validExercises.length === 0) { alert("Lisa vähemalt üks harjutus"); return; }

    setSaving(true);
    let finalVideoUrl = videoUrl;

    // Upload video file if provided
    if (videoFile) {
      const ext = videoFile.name.split(".").pop();
      const fileName = `workout_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("proofs").upload(fileName, videoFile);
      if (uploadErr) { alert("Video upload ebaõnnestus: " + uploadErr.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("proofs").getPublicUrl(fileName);
      finalVideoUrl = urlData.publicUrl;
    }

    const { data: workout, error: wErr } = await supabase.from("workouts").insert({
      title: title.trim(),
      description: description.trim() || null,
      type,
      video_url: finalVideoUrl || null,
      duration: duration.trim() || null,
      created_by: user.id,
    }).select().single();

    if (wErr) { alert("Viga: " + wErr.message); setSaving(false); return; }

    const exInserts = validExercises.map((e, i) => ({
      workout_id: workout.id,
      name: e.name.trim(),
      reps: e.reps.trim(),
      sort_order: i,
    }));

    const { error: eErr } = await supabase.from("exercises").insert(exInserts);
    if (eErr) { alert("Harjutuste viga: " + eErr.message); setSaving(false); return; }

    await onRefresh();
    setSaving(false);
    onBack();
  };

  const inputStyle = { width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.cardBorder}`, borderRadius: 12, color: C.text, fontSize: 14, outline: "none", marginBottom: 12 };

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.accent, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "20px 0 12px" }}>← Tagasi</button>

      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.text, marginBottom: 20 }}>Lisa uus workout 🆕</div>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pealkiri *" maxLength={60} style={inputStyle} />

      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kirjeldus (valikuline)" rows={3} style={{ ...inputStyle, resize: "vertical" }} />

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Kestus (nt 15 min)" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1, appearance: "none" }}>
          <option value="text">📝 Tekst</option>
          <option value="video">🎬 Video</option>
          <option value="both">🎬+📝 Mõlemad</option>
        </select>
      </div>

      {(type === "video" || type === "both") && (
        <div style={{ marginBottom: 12 }}>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL (YouTube/Vimeo link)" style={inputStyle} />
          <div style={{ textAlign: "center", color: C.textMuted, fontSize: 12, margin: "-4px 0 8px" }}>— või —</div>
          <label style={{ display: "block", padding: 14, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, textAlign: "center", color: C.textSoft, fontSize: 13, cursor: "pointer" }}>
            <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: "none" }} />
            {videoFile ? `📎 ${videoFile.name}` : "📤 Lae video üles (max 50MB)"}
          </label>
        </div>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: C.text, marginTop: 8, marginBottom: 14 }}>Harjutused</div>

      {exerciseList.map((ex, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 2 }}>
            <input value={ex.name} onChange={(e) => updateExercise(i, "name", e.target.value)} placeholder={`Harjutus ${i + 1}`} style={{ ...inputStyle, marginBottom: 0 }} />
          </div>
          <div style={{ flex: 1 }}>
            <input value={ex.reps} onChange={(e) => updateExercise(i, "reps", e.target.value)} placeholder="3 × 10" style={{ ...inputStyle, marginBottom: 0 }} />
          </div>
          {exerciseList.length > 1 && (
            <button onClick={() => removeExercise(i)} style={{ background: "none", border: "none", color: "#e74c3c", fontSize: 18, cursor: "pointer", padding: "10px 4px", flexShrink: 0 }}>×</button>
          )}
        </div>
      ))}

      <button onClick={addExercise} style={{ width: "100%", padding: 12, background: C.card, border: `1px dashed ${C.cardBorder}`, borderRadius: 12, color: C.textSoft, fontSize: 13, cursor: "pointer", marginBottom: 20 }}>+ Lisa harjutus</button>

      <button onClick={save} disabled={saving} style={{ width: "100%", padding: 16, background: `linear-gradient(135deg, ${C.accent}, #FF8F5E)`, border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Salvestan..." : "Salvesta workout"}
      </button>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showAddWorkout, setShowAddWorkout] = useState(false);

  // Data
  const [participants, setParticipants] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadParticipants = async () => {
    const { data } = await supabase.from("participants").select("*").order("name");
    if (data) setParticipants(data);
    return data || [];
  };

  const loadData = useCallback(async () => {
    const [{ data: w }, { data: e }, { data: c }, { data: p }] = await Promise.all([
      supabase.from("workouts").select("*").order("created_at", { ascending: false }),
      supabase.from("exercises").select("*").order("sort_order"),
      supabase.from("completions").select("*"),
      supabase.from("proofs").select("*").order("created_at", { ascending: false }),
    ]);
    if (w) setWorkouts(w);
    if (e) setExercises(e);
    if (c) setCompletions(c);
    if (p) setProofs(p);
    setLoading(false);
  }, []);

  // Check session
  useEffect(() => {
    const stored = sessionStorage.getItem("hoopshub_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    loadParticipants();
  }, []);

  // Load data when logged in
  useEffect(() => {
    if (!user) return;
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [user, loadData]);

  // Calculate leaderboard
  const leaderboard = useMemo(() => {
    return participants.map((p) => {
      const completedWorkoutIds = getCompletedWorkoutIds(exercises, completions, p.id);
      const pProofs = proofs.filter((pr) => pr.participant_id === p.id);
      const completionDates = completions.filter((c) => c.participant_id === p.id).map((c) => c.completed_at);
      const streak = calcStreak(completionDates);
      const xp = calcXP(completedWorkoutIds.length, pProofs.length, streak);
      return { ...p, xp, streak, totalWorkouts: completedWorkoutIds.length, totalProofs: pProofs.length };
    }).sort((a, b) => b.xp - a.xp).map((p, i) => ({ ...p, rank: i + 1 }));
  }, [participants, exercises, completions, proofs]);

  const myStats = useMemo(() => {
    if (!user) return { xp: 0, streak: 0, totalWorkouts: 0, totalProofs: 0, rank: 0 };
    const me = leaderboard.find((p) => p.id === user.id);
    return me || { xp: 0, streak: 0, totalWorkouts: 0, totalProofs: 0, rank: 0 };
  }, [user, leaderboard]);

  const handleLogin = async (u) => {
    setUser(u);
    await loadParticipants();
    await loadData();
  };

  const handleLogout = () => {
    sessionStorage.removeItem("hoopshub_user");
    setUser(null);
    setScreen("dashboard");
  };

  const handleAvatarChange = async (avatar) => {
    await supabase.from("participants").update({ avatar }).eq("id", user.id);
    const updated = { ...user, avatar };
    setUser(updated);
    sessionStorage.setItem("hoopshub_user", JSON.stringify(updated));
    await loadParticipants();
  };

  const navigate = (s, data) => {
    if (s === "workout_detail" && data) {
      setSelectedWorkout(data);
      setScreen("workout_detail");
    } else {
      setSelectedWorkout(null);
      setShowAddWorkout(false);
      setScreen(s);
    }
  };

  if (!user) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", maxWidth: 420, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{globalStyles}</style>
        <AuthScreen participants={participants} onLogin={handleLogin} />
      </div>
    );
  }

  const renderScreen = () => {
    if (loading) return <Loader />;
    if (showAddWorkout) return <AddWorkoutScreen user={user} onBack={() => setShowAddWorkout(false)} onRefresh={async () => { await loadData(); await loadParticipants(); }} />;
    if (screen === "workout_detail" && selectedWorkout) return <WorkoutDetailScreen user={user} workout={selectedWorkout} exercises={exercises} completions={completions} proofs={proofs} onBack={() => navigate("workouts")} onRefresh={async () => { await loadData(); await loadParticipants(); }} />;
    switch (screen) {
      case "dashboard": return <DashboardScreen user={user} stats={myStats} workouts={workouts} exercises={exercises} completions={completions} leaderboard={leaderboard} onNavigate={navigate} />;
      case "workouts": return <WorkoutListScreen user={user} workouts={workouts} exercises={exercises} completions={completions} onSelect={(w) => navigate("workout_detail", w)} />;
      case "breathe": return <BreatheScreen onNavigate={navigate} />;
      case "log": return <LogScreen user={user} completions={completions} exercises={exercises} workouts={workouts} proofs={proofs} />;
      case "leaderboard": return <LeaderboardScreen user={user} leaderboard={leaderboard} />;
      case "profile": return <ProfileScreen user={user} stats={myStats} proofs={proofs} onLogout={handleLogout} onAvatarChange={handleAvatarChange} onNavigate={navigate} />;
      default: return <DashboardScreen user={user} stats={myStats} workouts={workouts} exercises={exercises} completions={completions} leaderboard={leaderboard} onNavigate={navigate} />;
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", maxWidth: 420, margin: "0 auto", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{globalStyles}</style>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
        {renderScreen()}
      </div>

      {/* Trainer FAB */}
      {user.is_trainer && screen === "workouts" && !showAddWorkout && !selectedWorkout && (
        <button onClick={() => setShowAddWorkout(true)} style={{ position: "fixed", bottom: 80, right: "max(20px, calc(50% - 190px))", width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, #FF8F5E)`, border: "none", color: "#fff", fontSize: 28, cursor: "pointer", boxShadow: "0 4px 20px rgba(255,107,53,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      )}

      <NavBar active={screen === "workout_detail" ? "workouts" : screen === "log" ? "profile" : screen} onChange={navigate} />
    </div>
  );
}