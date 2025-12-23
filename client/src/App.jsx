import { useState, useEffect } from "react";
import axios from "axios";
import { Layout, Plus, Folder, LogOut, X, ChevronLeft, User, ChevronRight } from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";

const API = "http://localhost:5000/api";

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [credentials, setCredentials] = useState({ email: "", password: "", username: "" });
  const [currentProject, setCurrentProject] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" });

  // DnD Sensors (prevents accidental drags when clicking buttons)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchProjects = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
      setProjects(res.data);
    } catch (err) { if (err.response?.status === 401) logout(); }
  };

  const fetchTasks = async (projectId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/tasks/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchProjects(); }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = authMode === "login" ? "/auth/login" : "/auth/signup";
    try {
      const res = await axios.post(`${API}${endpoint}`, credentials);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) { alert(err.response?.data?.msg || "Auth Failed"); }
  };

  const createProject = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/projects`, newProject, { headers: { Authorization: `Bearer ${token}` } });
      setProjects([res.data, ...projects]);
      setIsProjectModalOpen(false);
      setNewProject({ title: "", description: "" });
    } catch (err) { alert("Error"); }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/tasks`, { ...newTask, projectId: currentProject._id }, { headers: { Authorization: `Bearer ${token}` } });
      setTasks([res.data, ...tasks]);
      setIsTaskModalOpen(false);
      setNewTask({ title: "", description: "", priority: "medium" });
    } catch (err) { alert("Error"); }
  };

  // --- DRAG AND DROP HANDLER ---
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id; // The column ID

    // 1. Optimistic Update (Update UI instantly)
    const updatedTasks = tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);

    // 2. Persist to Backend
    try {
      await axios.patch(`${API}/tasks/${taskId}`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      alert("Failed to update task status");
      fetchTasks(currentProject._id); // Revert on error
    }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    window.location.reload();
  };

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#161B22] border border-slate-800 p-10 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <Layout className="text-blue-500" size={32} />
            <h1 className="text-2xl font-bold tracking-tight">ProTasker</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "signup" && (
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Username" onChange={e => setCredentials({...credentials, username: e.target.value})} />
            )}
            <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Email" onChange={e => setCredentials({...credentials, email: e.target.value})} />
            <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" type="password" placeholder="Password" onChange={e => setCredentials({...credentials, password: e.target.value})} />
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold">
              {authMode === "login" ? "Sign In" : "Get Started"}
            </button>
          </form>
          <p onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} className="text-center text-xs text-slate-500 mt-6 cursor-pointer hover:text-white uppercase font-bold tracking-widest">
            {authMode === "login" ? "Need an account?" : "Login instead"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-300 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col p-6 hidden md:flex">
        <div className="flex items-center gap-2 mb-10 text-white cursor-pointer" onClick={() => setCurrentProject(null)}>
          <Layout className="text-blue-500" size={24} />
          <span className="font-bold tracking-tight text-lg">ProTasker</span>
        </div>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setCurrentProject(null)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${!currentProject ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800'}`}>
            <Folder size={18} /> Projects
          </button>
        </nav>
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase">{user?.username?.charAt(0)}</div>
            <span className="text-xs font-bold truncate max-w-[100px]">{user?.username}</span>
          </div>
          <button onClick={logout} className="text-slate-500 hover:text-red-400"><LogOut size={16}/></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {!currentProject ? (
          <div className="p-8">
            <header className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold text-white">Project Center</h2>
              <button onClick={() => setIsProjectModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Plus size={20}/> New Project</button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => (
                <div key={p._id} onClick={() => { setCurrentProject(p); fetchTasks(p._id); }} className="bg-[#161B22] border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all cursor-pointer group">
                  <h3 className="text-white font-bold text-xl mb-2 group-hover:text-blue-400">{p.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <header className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#161B22]/30">
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentProject(null)} className="p-2 hover:bg-slate-800 rounded-lg"><ChevronLeft/></button>
                <h2 className="text-2xl font-bold text-white">{currentProject.title}</h2>
              </div>
              <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2"><Plus size={18}/> New Task</button>
            </header>
            
            {/* KANBAN BOARD WITH DND */}
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-start overflow-x-auto">
                {['todo', 'in-progress', 'review', 'done'].map(status => (
                  <Column key={status} id={status} title={status.replace('-', ' ')} tasks={tasks.filter(t => t.status === status)} />
                ))}
              </div>
            </DndContext>
          </div>
        )}
      </main>

      {/* MODALS REMAIN THE SAME AS BEFORE */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-white mb-6">Create Project</h2>
            <form onSubmit={createProject} className="space-y-4">
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Title" value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} />
              <textarea className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 h-32 resize-none" placeholder="Description" value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="flex-1 bg-slate-800 p-4 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 p-4 rounded-xl font-bold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-white mb-6">New Task</h2>
            <form onSubmit={createTask} className="space-y-4">
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Task Name" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              <select className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <textarea className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none h-24 resize-none" placeholder="Details" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 bg-slate-800 p-4 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 p-4 rounded-xl font-bold">Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS FOR DND ---

function Column({ id, title, tasks }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="bg-[#161B22]/50 p-4 rounded-2xl border border-slate-800 min-w-[280px] min-h-[500px]">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 px-2 flex justify-between items-center">
        {title} <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">{tasks.length}</span>
      </h3>
      <div className="space-y-3">
        {tasks.map(task => <TaskCard key={task._id} task={task} />)}
      </div>
    </div>
  );
}

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

function TaskCard({ task }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task._id });
  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="bg-[#1C2128] border border-slate-800 p-4 rounded-xl hover:border-blue-500/50 cursor-grab active:cursor-grabbing shadow-sm group">
      <div className={`w-8 h-1 rounded-full mb-3 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
      <h4 className="text-white font-bold text-sm mb-1 group-hover:text-blue-400 transition-colors">{task.title}</h4>
      <p className="text-slate-500 text-[11px] line-clamp-2">{task.description}</p>
    </div>
  );
}

export default App;