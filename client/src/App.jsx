import { useState, useEffect } from "react";
import axios from "axios";
import { Layout, Plus, Folder, LogOut, X, ChevronLeft, User, Trash2 } from "lucide-react";
// DND KIT IMPORTS
import { DndContext, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const API = "http://localhost:5000/api";

// --- SUB-COMPONENTS (Defined outside App to prevent re-registration) ---

function TaskCard({ task, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes} 
      className="bg-[#1C2128] border border-slate-800 p-4 rounded-xl hover:border-blue-500/50 cursor-grab active:cursor-grabbing shadow-sm group relative"
    >
      <div className={`w-8 h-1 rounded-full mb-3 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
      <h4 className="text-white font-bold text-sm mb-1 group-hover:text-blue-400 transition-colors">{task.title}</h4>
      <p className="text-slate-500 text-[11px] line-clamp-2">{task.description}</p>
      
      <button 
        onPointerDown={(e) => e.stopPropagation()} // Prevents drag when clicking delete
        onClick={() => onDelete(task._id)}
        className="absolute top-4 right-4 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 size={14}/>
      </button>
    </div>
  );
}

function Column({ id, title, tasks, onDeleteTask }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="bg-[#161B22]/50 p-4 rounded-2xl border border-slate-800 min-w-[280px] min-h-[500px]">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 px-2 flex justify-between items-center">
        {title} <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">{tasks.length}</span>
      </h3>
      <div className="space-y-3">
        {tasks.map(task => (
          <TaskCard key={task._id} task={task} onDelete={onDeleteTask} />
        ))}
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

    // Optimistic UI update
    const updatedTasks = tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);

    try {
      await axios.patch(`${API}/tasks/${taskId}`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      fetchTasks(currentProject._id); // Revert on failure
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await axios.delete(`${API}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(tasks.filter(t => t._id !== id));
    } catch (err) { alert("Delete failed"); }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = user ? "/auth/login" : "/auth/signup"; // Simplified for brevity
    try {
      const res = await axios.post(`${API}/auth/login`, credentials);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) { alert("Auth Error"); }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    window.location.reload();
  };

  if (!token) {
    /* Login UI code here (same as before) */
    return <div className="text-white p-20 text-center">Please Log In (Code omitted for brevity, use previous version)</div>;
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-300 flex">
      <aside className="w-64 border-r border-slate-800 p-6 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-10 text-white cursor-pointer" onClick={() => setCurrentProject(null)}>
          <Layout className="text-blue-500" size={24} />
          <span className="font-bold text-lg">ProTasker</span>
        </div>
        <nav className="flex-1">
          <button onClick={() => setCurrentProject(null)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold bg-blue-600/10 text-blue-400">
            <Folder size={18} /> Projects
          </button>
        </nav>
        <button onClick={logout} className="flex items-center gap-2 text-slate-500 hover:text-white mt-auto"><LogOut size={18}/> Logout</button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {!currentProject ? (
          <div className="p-8">
            <header className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold text-white">Dashboard</h2>
              <button onClick={() => setIsProjectModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">+ New Project</button>
            </header>
            <div className="grid grid-cols-3 gap-6">
              {projects.map(p => (
                <div key={p._id} onClick={() => { setCurrentProject(p); fetchTasks(p._id); }} className="bg-[#161B22] border border-slate-800 p-6 rounded-2xl cursor-pointer hover:border-blue-500">
                  <h3 className="text-white font-bold text-xl">{p.title}</h3>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <header className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#161B22]/30">
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentProject(null)}><ChevronLeft/></button>
                <h2 className="text-2xl font-bold text-white">{currentProject.title}</h2>
              </div>
              <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold">+ New Task</button>
            </header>
            
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <div className="flex-1 p-8 grid grid-cols-4 gap-6 overflow-x-auto">
                {['todo', 'in-progress', 'review', 'done'].map(status => (
                  <Column key={status} id={status} title={status} tasks={tasks.filter(t => t.status === status)} onDeleteTask={deleteTask} />
                ))}
              </div>
            </DndContext>
          </div>
        )}
      </main>
    </div>
  );
}