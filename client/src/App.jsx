import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Layout, Folder, LogOut, X, ChevronLeft, 
  Trash2 
} from "lucide-react";

// DND KIT
import { 
  DndContext, PointerSensor, useSensor, useSensors, 
  closestCorners 
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// --- DYNAMIC API URL ---
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// --- DRAGGABLE TASK CARD ---
function TaskCard({ task, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task._id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="relative group mb-3 outline-none">
      <div className={`bg-[#1C2128] border ${isDragging ? 'border-blue-500 shadow-2xl' : 'border-slate-800'} p-4 rounded-xl hover:border-slate-600 transition-colors cursor-grab`}>
        <div className={`w-10 h-1 rounded-full mb-3 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
        <h4 className="text-white font-bold text-sm mb-1">{task.title}</h4>
        <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">{task.description}</p>
      </div>
      <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(task._id); }} className="absolute top-3 right-3 p-1.5 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white z-20">
        <Trash2 size={12}/>
      </button>
    </div>
  );
}

// --- DROPPABLE COLUMN ---
function Column({ id, title, tasks, onDeleteTask }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex flex-col p-4 rounded-2xl border transition-all min-w-[280px] min-h-[500px] ${isOver ? 'bg-blue-600/10 border-blue-500/50' : 'bg-[#161B22]/50 border-slate-800'}`}>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-5 px-2 flex justify-between items-center">
        {title.replace('-', ' ')} <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">{tasks.length}</span>
      </h3>
      <div className="flex-1">{tasks.map(task => (<TaskCard key={task._id} task={task} onDelete={onDeleteTask} />))}</div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ email: "", password: "", username: "" });
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { if (token) fetchProjects(); }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLoginView ? "/auth/login" : "/auth/register";
    try {
      const res = await axios.post(`${API}${endpoint}`, authForm);
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
    } catch (err) { alert(err.response?.data?.message || "Auth Error"); }
  };

  const logout = () => { localStorage.clear(); setToken(null); setProjects([]); setCurrentProject(null); };

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
      setProjects(res.data);
    } catch (err) { if (err.response?.status === 401) logout(); }
  };

  const deleteProject = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete project and all its tasks?")) return;
    try {
      await axios.delete(`${API}/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setProjects(projects.filter(p => p._id !== id));
    } catch (err) { alert("Delete failed"); }
  };

  const fetchTasks = async (projectId) => {
    try {
      const res = await axios.get(`${API}/tasks/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(res.data);
    } catch (err) { console.error(err); }
  };

  if (!token) {
    return (
      <div className="min-h-screen w-full bg-[#0B0E14] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#161B22] border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-2 mb-8 justify-center text-white font-bold text-2xl tracking-tight"><Layout className="text-blue-500" /> ProTasker</div>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLoginView && <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Username" onChange={e => setAuthForm({...authForm, username: e.target.value})} />}
            <input type="email" className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Email" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
            <input type="password" className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            <button className="w-full bg-blue-600 p-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95">{isLoginView ? "Login" : "Sign Up"}</button>
          </form>
          <button onClick={() => setIsLoginView(!isLoginView)} className="w-full text-slate-500 text-sm mt-6 text-center hover:text-blue-400">{isLoginView ? "Create account" : "Have account? Login"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#0B0E14] text-slate-300 overflow-hidden">
      <aside className="w-64 border-r border-slate-800 p-6 hidden md:flex flex-col h-screen sticky top-0 bg-[#0B0E14]">
        <div className="flex items-center gap-2 mb-10 text-white cursor-pointer" onClick={() => setCurrentProject(null)}><Layout className="text-blue-500" /><span className="font-bold text-lg">ProTasker</span></div>
        <nav className="flex-1"><button onClick={() => setCurrentProject(null)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${!currentProject ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800'}`}><Folder size={18} /> Projects</button></nav>
        <button onClick={logout} className="flex items-center gap-2 text-slate-500 hover:text-red-400 text-xs font-bold uppercase mt-auto"><LogOut size={14}/> Logout</button>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen">
        {!currentProject ? (
          <div className="p-8">
            <header className="flex justify-between items-center mb-10"><h2 className="text-3xl font-bold text-white">Projects</h2><button onClick={() => setIsProjectModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-xl">+ New Project</button></header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => (
                <div key={p._id} onClick={() => { setCurrentProject(p); fetchTasks(p._id); }} className="relative bg-[#161B22] border border-slate-800 p-6 rounded-2xl cursor-pointer hover:border-blue-500 group transition-all">
                  <h3 className="text-white font-bold text-xl mb-2">{p.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2">{p.description}</p>
                  <button onClick={(e) => deleteProject(p._id, e)} className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <header className="p-8 border-b border-slate-800 bg-[#161B22]/30 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4"><button onClick={() => setCurrentProject(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft/></button><h2 className="text-2xl font-bold text-white">{currentProject.title}</h2></div>
                <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm">+ Add Task</button>
              </div>
            </header>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={async (e) => {
              const { active, over } = e;
              if (!over || active.id === over.id) return;
              setTasks(prev => prev.map(t => t._id === active.id ? { ...t, status: over.id } : t));
              await axios.patch(`${API}/tasks/${active.id}`, { status: over.id }, { headers: { Authorization: `Bearer ${token}` } });
            }}>
              <div className="flex-1 p-8 flex gap-6 overflow-x-auto items-start">
                {['todo', 'in-progress', 'review', 'done'].map(status => (
                  <Column key={status} id={status} title={status} tasks={tasks.filter(t => t.status === status)} onDeleteTask={async (id) => { if(window.confirm("Delete Task?")) { await axios.delete(`${API}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } }); setTasks(tasks.filter(t => t._id !== id)); }}} />
                ))}
              </div>
            </DndContext>
          </div>
        )}
      </main>

      {/* Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between mb-6 text-white font-bold text-xl"><h2>New Project</h2><button onClick={() => setIsProjectModalOpen(false)}><X/></button></div>
            <form onSubmit={async (e) => {
                e.preventDefault();
                const res = await axios.post(`${API}/projects`, newProject, { headers: { Authorization: `Bearer ${token}` } });
                setProjects([...projects, res.data]);
                setIsProjectModalOpen(false);
                setNewProject({ title: "", description: "" });
            }} className="space-y-4">
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Project Name" value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} />
              <button className="w-full bg-blue-600 p-4 rounded-xl font-bold text-white hover:bg-blue-700 shadow-lg">Create Project</button>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between mb-6 text-white font-bold text-xl"><h2>New Task</h2><button onClick={() => setIsTaskModalOpen(false)}><X/></button></div>
            <form onSubmit={async (e) => {
                e.preventDefault();
                const res = await axios.post(`${API}/tasks`, { ...newTask, projectId: currentProject._id }, { headers: { Authorization: `Bearer ${token}` } });
                setTasks([res.data, ...tasks]);
                setIsTaskModalOpen(false);
                setNewTask({ title: "", description: "", priority: "medium" });
            }} className="space-y-4">
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Task Title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              <textarea className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none h-24" placeholder="Description" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
              <button className="w-full bg-blue-600 p-4 rounded-xl font-bold text-white hover:bg-blue-700 shadow-lg">Create Task</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}