import { useState, useEffect, useRef } from "react";
import { auth, db, signInWithGoogle } from "./firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faEdit,
  faSignOutAlt,
  faSignInAlt,
  faCheck,
  faTimes,
  faSave,
  faExclamationTriangle,
  faCheckCircle,
  faListUl,
  faClock,
  faFire,
} from "@fortawesome/free-solid-svg-icons";

// ─── Priority config ─────────────────────────────────────────────────────────
const PRIORITY = {
  high:   { label: "High",   color: "text-red-400",   bg: "bg-red-500/10",   border: "priority-high" },
  medium: { label: "Medium", color: "text-amber-400", bg: "bg-amber-500/10", border: "priority-medium" },
  low:    { label: "Low",    color: "text-green-400", bg: "bg-green-500/10", border: "priority-low" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function isOverdue(task) {
  if (!task.dueDateTime || task.completed) return false;
  return new Date(task.dueDateTime) < new Date();
}

// ─── Custom Cursor Hook ───────────────────────────────────────────────────────
function useCursor() {
  useEffect(() => {
    const dot  = document.getElementById("cursor-dot");
    const ring = document.getElementById("cursor-ring");
    if (!dot || !ring) return;

    let mouseX = 0, mouseY = 0;
    let ringX  = 0, ringY  = 0;
    let raf;

    const onMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + "px";
      dot.style.top  = mouseY + "px";
    };

    const animate = () => {
      ringX += (mouseX - ringX) * 0.14;
      ringY += (mouseY - ringY) * 0.14;
      ring.style.left = ringX + "px";
      ring.style.top  = ringY + "px";
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    const addHover = () => document.body.classList.add("cursor-hover");
    const removeHover = () => document.body.classList.remove("cursor-hover");
    const addClick = () => document.body.classList.add("cursor-click");
    const removeClick = () => document.body.classList.remove("cursor-click");

    const interactives = () => document.querySelectorAll("button, a, input, select, [role='button']");
    const attachHover = () => interactives().forEach(el => {
      el.addEventListener("mouseenter", addHover);
      el.addEventListener("mouseleave", removeHover);
    });
    attachHover();

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", addClick);
    window.addEventListener("mouseup", removeClick);

    // re-attach on DOM changes
    const observer = new MutationObserver(attachHover);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", addClick);
      window.removeEventListener("mouseup", removeClick);
      observer.disconnect();
    };
  }, []);
}

// ─── SubComponents ────────────────────────────────────────────────────────────
function StatBadge({ label, value, colorClass }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 rounded-2xl glass flex-1">
      <span className={`text-2xl font-bold ${colorClass}`}>{value}</span>
      <span className="text-xs text-slate-500 mt-0.5 tracking-wide uppercase">{label}</span>
    </div>
  );
}

function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`filter-tab flex-1 py-2 rounded-xl text-sm font-medium
        ${active ? "active bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "text-slate-500"}`}
    >
      {label}
    </button>
  );
}

function TaskCard({ task, onComplete, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const overdue = isOverdue(task);
  const prio = PRIORITY[task.priority || "medium"];

  const handleSave = () => {
    if (editText.trim()) onEdit(task.id, editText.trim());
    setEditing(false);
  };
  const handleCancel = () => { setEditText(task.text); setEditing(false); };

  return (
    <div className={`task-card fade-in glass rounded-2xl p-4 ${prio.border} ${task.completed ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Complete toggle */}
        <button
          onClick={() => onComplete(task.id, task.completed)}
          className={`icon-btn mt-0.5 flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center
            ${task.completed ? "bg-green-500 border-green-500 text-white" : "border-slate-600 hover:border-indigo-400"}`}
        >
          {task.completed && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
                className="input-glow w-full bg-black border border-slate-700 rounded-xl px-3 py-1.5 text-white text-sm"
              />
              <div className="flex gap-2">
                <button onClick={handleSave}
                  className="btn-glow flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-xl">
                  <FontAwesomeIcon icon={faSave} /> Save
                </button>
                <button onClick={handleCancel}
                  className="btn-glow flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-xl">
                  <FontAwesomeIcon icon={faTimes} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={`text-sm font-medium break-words ${task.completed ? "line-through text-slate-600" : "text-white"}`}>
                {task.text}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${prio.bg} ${prio.color}`}>
                  <FontAwesomeIcon icon={faFire} className="text-[10px]" /> {prio.label}
                </span>
                {task.dueDateTime && (
                  <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-400" : "text-slate-500"}`}>
                    {overdue && <FontAwesomeIcon icon={faExclamationTriangle} className="text-[10px]" />}
                    <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                    {formatDate(task.dueDateTime)}
                    {overdue && <span className="font-semibold">• Overdue</span>}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        {!editing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {!task.completed && (
              <button onClick={() => { setEditing(true); setEditText(task.text); }}
                className="icon-btn p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl">
                <FontAwesomeIcon icon={faEdit} />
              </button>
            )}
            <button onClick={() => onDelete(task.id)}
              className="icon-btn p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl">
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser]         = useState(null);
  const [tasks, setTasks]       = useState([]);
  const [newTask, setNewTask]   = useState("");
  const [dueDate, setDueDate]   = useState("");
  const [dueTime, setDueTime]   = useState("");
  const [priority, setPriority] = useState("medium");
  const [filter, setFilter]     = useState("all");
  const [loading, setLoading]   = useState(true);

  useCursor();

  // Auth listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        await firebaseUser.reload();
        const u = auth.currentUser;
        setUser({
          uid:         u.uid,
          displayName: u.displayName?.split(" ")[0] || u.email.split("@")[0],
          email:       u.email,
          photoURL:    u.photoURL || "https://www.gravatar.com/avatar/?d=mp",
        });
      } else {
        setUser(null);
        setTasks([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Firestore listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTasks(data.sort((a, b) => {
        if (!a.dueDateTime) return 1;
        if (!b.dueDateTime) return -1;
        return new Date(a.dueDateTime) - new Date(b.dueDateTime);
      }));
    });
    return () => unsub();
  }, [user]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const dueDateTime = dueDate && dueTime ? new Date(`${dueDate}T${dueTime}`).toISOString() : null;
    await addDoc(collection(db, "tasks"), {
      text: newTask.trim(), completed: false,
      userId: user.uid, priority,
      createdAt: new Date().toISOString(), dueDateTime,
    });
    setNewTask(""); setDueDate(""); setDueTime(""); setPriority("medium");
  };

  const handleComplete = (id, completed) => updateDoc(doc(db, "tasks", id), { completed: !completed });
  const handleDelete   = (id) => deleteDoc(doc(db, "tasks", id));
  const handleEdit     = (id, text) => updateDoc(doc(db, "tasks", id), { text });

  const total     = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending   = total - completed;
  const filtered  = tasks.filter((t) =>
    filter === "active" ? !t.completed : filter === "completed" ? t.completed : true
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Landing ────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Animated blobs */}
        <div className="blob absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-700/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="blob-2 absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-700/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative text-center max-w-lg z-10">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-indigo-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Smart Task Manager
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-5">
            Stay&nbsp;
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Organised
            </span>
            <br />Every Day
          </h1>

          <p className="text-slate-400 text-lg mb-12 leading-relaxed">
            Manage tasks with priorities, deadlines, and real-time sync.
          </p>

          <button
            onClick={signInWithGoogle}
            className="btn-glow inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg
              bg-gradient-to-r from-indigo-600 to-purple-600
              shadow-lg shadow-indigo-500/30"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  // ── Authenticated ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black">
      {/* Subtle ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-700/10 rounded-full blur-[120px]" />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <FontAwesomeIcon icon={faCheckCircle} className="text-white text-sm" />
              </div>
              <span className="text-white font-bold text-lg hidden sm:block">To-Do List</span>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={user.photoURL} alt={user.displayName}
                referrerPolicy="no-referrer"
                onError={(e) => { e.target.src = "https://www.gravatar.com/avatar/?d=mp"; e.target.onerror = null; }}
                className="w-8 h-8 rounded-full ring-2 ring-indigo-500/40"
              />
              <span className="text-slate-300 text-sm font-medium hidden sm:block">{user.displayName}</span>
              <button
                onClick={() => signOut(auth)}
                className="btn-glow flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-slate-400
                  bg-white/5 hover:text-red-400 border border-white/10"
              >
                <FontAwesomeIcon icon={faSignOutAlt} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 relative z-10">

        {/* Stats */}
        <div className="flex gap-3 mb-8">
          <StatBadge label="Total"     value={total}     colorClass="text-white" />
          <StatBadge label="Pending"   value={pending}   colorClass="text-amber-400" />
          <StatBadge label="Done"      value={completed} colorClass="text-green-400" />
        </div>

        {/* Add Task Form */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} className="text-indigo-400" />
            Add New Task
          </h2>
          <form onSubmit={handleAddTask} className="flex flex-col gap-3">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="What do you need to do?"
              required
              className="input-glow w-full bg-black border border-slate-800 text-white placeholder-slate-600
                rounded-xl px-4 py-3 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="input-glow flex-1 min-w-[130px] bg-black border border-slate-800 text-slate-400
                  rounded-xl px-3 py-2 text-sm" />
              <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                className="input-glow flex-1 min-w-[110px] bg-black border border-slate-800 text-slate-400
                  rounded-xl px-3 py-2 text-sm" />
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="input-glow flex-1 min-w-[110px] bg-black border border-slate-800 text-slate-400
                  rounded-xl px-3 py-2 text-sm">
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
            <button type="submit"
              className="btn-glow w-full py-3 rounded-xl text-white font-semibold text-sm
                bg-gradient-to-r from-indigo-600 to-purple-600
                shadow-lg shadow-indigo-500/20">
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add Task
            </button>
          </form>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 mb-4 glass rounded-2xl p-1.5">
          <FilterTab label="All"       active={filter === "all"}       onClick={() => setFilter("all")} />
          <FilterTab label="Active"    active={filter === "active"}    onClick={() => setFilter("active")} />
          <FilterTab label="Completed" active={filter === "completed"} onClick={() => setFilter("completed")} />
        </div>

        {/* Task List */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <FontAwesomeIcon icon={faListUl} className="text-4xl mb-3 opacity-20" />
              <p className="text-sm">
                {filter === "completed" ? "No completed tasks yet." :
                 filter === "active"    ? "No active tasks. Well done! 🎉" :
                                         "No tasks yet. Add one above!"}
              </p>
            </div>
          ) : (
            filtered.map((task) => (
              <TaskCard key={task.id} task={task}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
