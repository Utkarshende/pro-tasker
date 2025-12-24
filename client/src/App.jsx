import { useState, useEffect } from "react";
import axios from "axios";
import { Layout, Folder, LogOut, X, ChevronLeft, Trash2 } from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// FALLBACK: If Vercel env is missing, it uses this. Ensure /api is at the end!
const API = import.meta.env.VITE_API_URL || "https://pro-tasker-backend-vuh1.onrender.com/api";

// --- COMPONENTS ---
function TaskCard({ task, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task._id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="relative group mb-3 outline-none">
      <div className="bg-[#1C2128] border border-slate-800 p-4 rounded-xl hover:border-slate-600 cursor-grab">
        <div className={`w-10 h-1 rounded-full mb-3 ${task.priority === 'high' ? 'bg-red-500' : 'bg-green-500'}`} />
        <h4 className="text-white font-bold text-sm mb-1">{task.title}</h4>
        <p className="text-slate-500 text-[11px] line-clamp-2">{task.description}</p>
      </div>
      <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(task._id); }} className="absolute top-3 right-3 p-1.5 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={12}/></button>
    </div>
  );
}

function Column({ id, title, tasks, onDeleteTask }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex flex-col p-4 rounded-2xl border min-w-[280px] min-h-[500px] ${isOver ? 'bg-blue-600/10 border-blue-500/50' : 'bg-[#161B22]/50 border-slate-800'}`}>
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5 px-2 flex justify-between">{title} <span className="bg-slate-800 px-2 rounded">{tasks.length}</span></h3>
      <div className="flex-1">{tasks.map(task => <TaskCard key={task._id} task={task} onDelete={onDeleteTask} />)}</div>
    </div>
  );
}

// --- MAIN APP ---
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ email: "", password: "", username: "" });
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: "" });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { if (token) fetchProjects(); }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLoginView ? "/auth/login" : "/auth/register";
      const res = await axios.post(`${API}${endpoint}`, authForm);
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
    } catch (err) { alert("Error: " + (err.response?.data?.message || "Check if your API URL ends in /api")); }
  };

  const fetchProjects = async () => {
    const res = await axios.get(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
    setProjects(res.data);
  };

  const deleteProject = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete Project?")) return;
    await axios.delete(`${API}/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    setProjects(projects.filter(p => p._id !== id));
  };

  const fetchTasks = async (projectId) => {
    const res = await axios.get(`${API}/tasks/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
    setTasks(res.data);
  };

  if (!token) return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#161B22] border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <h2 className="text-white text-2xl font-bold mb-6 text-center">{isLoginView ? "Login" : "Sign Up"}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLoginView && <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none" placeholder="Username" onChange={e => setAuthForm({...authForm, username: e.target.value})} />}
          <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none" placeholder="Email" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
          <input type="password" className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-blue-600 p-4 rounded-xl font-bold text-white shadow-lg">{isLoginView ? "Login" : "Sign Up"}</button>
        </form>
        <button onClick={() => setIsLoginView(!isLoginView)} className="w-full text-slate-500 text-sm mt-6">{isLoginView ? "Need account? Sign Up" : "Have account? Login"}</button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0B0E14] text-slate-300">
      <aside className="w-64 border-r border-slate-800 p-6 hidden md:flex flex-col h-screen sticky top-0">
        <div className="flex items-center gap-2 mb-10 text-white font-bold text-lg"><Layout className="text-blue-500" /> ProTasker</div>
        <button onClick={() => setCurrentProject(null)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-all font-bold text-sm"><Folder size={18} /> Projects</button>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-auto flex items-center gap-2 text-slate-500 hover:text-red-400 font-bold text-xs uppercase"><LogOut size={14}/> Logout</button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {!currentProject ? (
          <>
            <div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-bold text-white">Dashboard</h2><button onClick={() => setIsProjectModalOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ New</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => (
                <div key={p._id} onClick={() => { setCurrentProject(p); fetchTasks(p._id); }} className="relative bg-[#161B22] border border-slate-800 p-6 rounded-2xl cursor-pointer hover:border-blue-500 group transition-all">
                  <h3 className="text-white font-bold text-xl">{p.title}</h3>
                  <button onClick={(e) => deleteProject(p._id, e)} className="absolute top-4 right-4 p-2 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col h-full">
            <header className="flex items-center gap-4 mb-8">
              <button onClick={() => setCurrentProject(null)} className="p-2 hover:bg-slate-800 rounded-lg"><ChevronLeft/></button>
              <h2 className="text-2xl font-bold text-white">{currentProject.title}</h2>
            </header>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={async (e) => {
              if (!e.over || e.active.id === e.over.id) return;
              setTasks(tasks.map(t => t._id === e.active.id ? { ...t, status: e.over.id } : t));
              await axios.patch(`${API}/tasks/${e.active.id}`, { status: e.over.id }, { headers: { Authorization: `Bearer ${token}` } });
            }}>
              <div className="flex gap-6 overflow-x-auto pb-4">
                {['todo', 'in-progress', 'done'].map(status => (
                  <Column key={status} id={status} title={status} tasks={tasks.filter(t => t.status === status)} onDeleteTask={async (id) => { if(window.confirm("Delete Task?")) { await axios.delete(`${API}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } }); setTasks(tasks.filter(t => t._id !== id)); }}} />
                ))}
              </div>
            </DndContext>
          </div>
        )}
      </main>

      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-sm bg-[#161B22] border border-slate-800 p-8 rounded-3xl">
            <h2 className="text-white font-bold text-xl mb-4">New Project</h2>
            <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white mb-4" placeholder="Name" onChange={e => setNewProject({title: e.target.value})} />
            <button onClick={async () => {
              const res = await axios.post(`${API}/projects`, newProject, { headers: { Authorization: `Bearer ${token}` } });
              setProjects([...projects, res.data]);
              setIsProjectModalOpen(false);
            }} className="w-full bg-blue-600 p-4 rounded-xl font-bold text-white">Create</button>
            <button onClick={() => setIsProjectModalOpen(false)} className="w-full text-slate-500 mt-4">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}