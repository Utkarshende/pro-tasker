import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Layout, Plus, Folder, LogOut, X, ChevronLeft, User, Trash2, CheckCircle2, Clock, MoreHorizontal } from "lucide-react";
// DND KIT
import { DndContext, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const API = "http://localhost:5000/api";

// --- DRAGGABLE TASK CARD ---
function TaskCard({ task, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-[#1C2128] border ${isDragging ? 'border-blue-500' : 'border-slate-800'} p-4 rounded-xl shadow-sm group relative mb-3`}
    >
      {/* Drag Handle Area */}
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <div className={`w-8 h-1 rounded-full mb-3 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
        <h4 className="text-white font-bold text-sm mb-1 group-hover:text-blue-400 transition-colors">{task.title}</h4>
        <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">{task.description}</p>
      </div>

      {/* Delete Action - stopPropagation prevents drag when clicking */}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(task._id); }}
        className="absolute top-4 right-4 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 size={14}/>
      </button>
    </div>
  );
}

// --- DROPPABLE COLUMN ---
function Column({ id, title, tasks, onDeleteTask }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={`flex flex-col p-4 rounded-2xl border transition-colors min-w-[280px] min-h-[500px] ${isOver ? 'bg-blue-600/5 border-blue-500/50' : 'bg-[#161B22]/50 border-slate-800'}`}
    >
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 px-2 flex justify-between items-center">
        {title.replace('-', ' ')}
        <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md text-[10px]">{tasks.length}</span>
      </h3>
      <div className="flex-1">
        {tasks.map(task => (
          <TaskCard key={task._id} task={task} onDelete={onDeleteTask} />
        ))}
      </div>
    </div>
  );
}

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  
  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  // Forms
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" });

  // Sensors: Require 5px movement before dragging starts (allows clicking buttons)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Progress Calculation
  const completionPercentage = useMemo(() => {
    if (tasks.length === 0) return 0;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    return Math.round((doneTasks / tasks.length) * 100);
  }, [tasks]);

  useEffect(() => { if (token) fetchProjects(); }, [token]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
      setProjects(res.data);
    } catch (err) { if (err.response?.status === 401) logout(); }
  };

  const fetchTasks = async (projectId) => {
    try {
      const res = await axios.get(`${API}/tasks/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(res.data);
    } catch (err) { console.error(err); }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = active.id;
    const newStatus = over.id;

    // Optimistic UI Update
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));

    try {
      await axios.patch(`${API}/tasks/${taskId}`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      fetchTasks(currentProject._id); // Revert on error
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Permanent delete?")) return;
    try {
      await axios.delete(`${API}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(prev => prev.filter(t => t._id !== id));
    } catch (err) { alert("Delete failed"); }
  };

  const logout = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (!token) return <AuthUI setUser={setUser} setToken={setToken} />;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-300 flex">
      {/* Sidebar (Simplified) */}
      <aside className="w-64 border-r border-slate-800 p-6 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-10 text-white cursor-pointer" onClick={() => setCurrentProject(null)}>
          <Layout className="text-blue-500" size={24} />
          <span className="font-bold text-lg">ProTasker</span>
        </div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => setCurrentProject(null)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${!currentProject ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800'}`}>
            <Folder size={18} /> Projects
          </button>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-white">{user?.username}</span>
            <button onClick={logout} className="text-slate-500 hover:text-red-400"><LogOut size={16}/></button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {!currentProject ? (
          <div className="p-8">
            <header className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold text-white">Dashboard</h2>
              <button onClick={() => setIsProjectModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg">+ New Project</button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => (
                <div key={p._id} onClick={() => { setCurrentProject(p); fetchTasks(p._id); }} className="bg-[#161B22] border border-slate-800 p-6 rounded-2xl cursor-pointer hover:border-blue-500 transition-all">
                  <h3 className="text-white font-bold text-xl mb-2">{p.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <header className="p-8 border-b border-slate-800 bg-[#161B22]/30">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setCurrentProject(null)} className="p-2 hover:bg-slate-800 rounded-lg"><ChevronLeft/></button>
                  <h2 className="text-2xl font-bold text-white">{currentProject.title}</h2>
                </div>
                <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm">+ Add Task</button>
              </div>
              
              {/* FEATURE: Real-time Progress Bar */}
              <div className="max-w-md">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                  <span className="text-slate-500">Project Completion</span>
                  <span className="text-blue-400">{completionPercentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${completionPercentage}%` }} />
                </div>
              </div>
            </header>
            
            {/* KANBAN BOARD */}
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <div className="flex-1 p-8 flex gap-6 overflow-x-auto items-start">
                {['todo', 'in-progress', 'review', 'done'].map(status => (
                  <Column key={status} id={status} title={status} tasks={tasks.filter(t => t.status === status)} onDeleteTask={deleteTask} />
                ))}
              </div>
            </DndContext>
          </div>
        )}
      </main>

      {/* Modal code for Create Project and Create Task goes here (Keep your existing modal UI) */}
    </div>
  );
}

// Minimal AuthUI for completeness
function AuthUI({ setToken, setUser }) {
    const [creds, setCreds] = useState({ email: "", password: "" });
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API}/auth/login`, creds);
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            setToken(res.data.token);
            setUser(res.data.user);
        } catch (err) { alert("Login failed"); }
    };
    return (
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
            <form onSubmit={handleLogin} className="bg-[#161B22] p-10 rounded-3xl border border-slate-800 w-full max-w-md">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Login to ProTasker</h2>
                <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl mb-4 text-white" placeholder="Email" onChange={e => setCreds({...creds, email: e.target.value})} />
                <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl mb-6 text-white" type="password" placeholder="Password" onChange={e => setCreds({...creds, password: e.target.value})} />
                <button className="w-full bg-blue-600 p-4 rounded-xl font-bold text-white">Sign In</button>
            </form>
        </div>
    );
}