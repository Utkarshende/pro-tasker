import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { 
  Layout, Plus, Folder, LogOut, X, ChevronLeft, 
  Trash2, Clock, CheckCircle2, AlertCircle, Settings 
} from "lucide-react";

// DND KIT
import { 
  DndContext, PointerSensor, useSensor, useSensors, 
  closestCorners 
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const API = "http://localhost:5000/api";

// --- 1. DRAGGABLE TASK CARD ---
function TaskCard({ task, onDelete, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...listeners} 
      {...attributes}
      className="relative group mb-3 outline-none"
    >
      <div 
        onClick={(e) => { if (!isDragging) onClick(task); }}
        className={`bg-[#1C2128] border ${isDragging ? 'border-blue-500 shadow-2xl' : 'border-slate-800'} p-4 rounded-xl hover:border-slate-600 transition-colors cursor-grab active:cursor-grabbing`}
      >
        <div className={`w-10 h-1 rounded-full mb-3 ${
            task.priority === 'high' ? 'bg-red-500' : 
            task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
        }`} />
        <h4 className="text-white font-bold text-sm mb-1">{task.title}</h4>
        <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">{task.description}</p>
      </div>

      <button 
        onPointerDown={(e) => e.stopPropagation()} 
        onClick={(e) => { e.stopPropagation(); onDelete(task._id); }}
        className="absolute top-3 right-3 p-1.5 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white z-20"
      >
        <Trash2 size={12}/>
      </button>
    </div>
  );
}

// --- 2. DROPPABLE COLUMN ---
function Column({ id, title, tasks, onDeleteTask, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={`flex flex-col p-4 rounded-2xl border transition-all min-w-[280px] min-h-[500px] ${
        isOver ? 'bg-blue-600/10 border-blue-500/50 scale-[1.01]' : 'bg-[#161B22]/50 border-slate-800'
      }`}
    >
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-5 px-2 flex justify-between items-center">
        {title.replace('-', ' ')}
        <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">{tasks.length}</span>
      </h3>
      <div className="flex-1">
        {tasks.map(task => (
          <TaskCard key={task._id} task={task} onDelete={onDeleteTask} onClick={onTaskClick} />
        ))}
      </div>
    </div>
  );
}

// --- 3. MAIN APP ---
export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [activeTask, setActiveTask] = useState(null);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Forms
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" });
  const [tempUserName, setTempUserName] = useState(user?.name || "");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === 'done').length;
    return Math.round((done / tasks.length) * 100);
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

  const deleteProject = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete entire project and all tasks?")) return;
    try {
      await axios.delete(`${API}/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setProjects(prev => prev.filter(p => p._id !== id));
    } catch (err) { alert("Delete project failed"); }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const taskId = active.id;
    const newStatus = over.id;
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      await axios.patch(`${API}/tasks/${taskId}`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { if (currentProject) fetchTasks(currentProject._id); }
  };

  const logout = () => { localStorage.clear(); window.location.reload(); };

  if (!token) return <div className="text-white p-20 text-center">Login Session Expired.</div>;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-300 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-10 text-white cursor-pointer" onClick={() => setCurrentProject(null)}>
          <Layout className="text-blue-500" size={24} />
          <span className="font-bold text-lg">ProTasker</span>
        </div>
        <nav className="flex-1">
            <button onClick={() => setCurrentProject(null)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${!currentProject ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800'}`}>
                <Folder size={18} /> Projects
            </button>
        </nav>

        {/* User Profile Trigger */}
        <div onClick={() => setIsProfileModalOpen(true)} className="mt-auto flex items-center gap-3 p-3 bg-slate-800/30 rounded-2xl border border-slate-800 hover:border-blue-500 cursor-pointer transition-all mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">{user?.name?.charAt(0)}</div>
          <div className="flex-1 overflow-hidden"><p className="text-sm font-bold text-white truncate">{user?.name}</p></div>
        </div>
        
        <button onClick={logout} className="flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-widest"><LogOut size={14}/> Logout</button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {!currentProject ? (
          <div className="p-8">
            <header className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold text-white">Dashboard</h2>
              <button onClick={() => setIsProjectModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg">+ New Project</button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => (
                <div key={p._id} onClick={() => { setCurrentProject(p); fetchTasks(p._id); }} className="bg-[#161B22] border border-slate-800 p-6 rounded-2xl cursor-pointer hover:border-blue-500 transition-all group relative">
                  <button onClick={(e) => deleteProject(p._id, e)} className="absolute top-4 right-4 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                  <h3 className="text-white font-bold text-xl mb-2 group-hover:text-blue-400 pr-10">{p.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <header className="p-8 border-b border-slate-800 bg-[#161B22]/30 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setCurrentProject(null)} className="p-2 hover:bg-slate-800 rounded-lg"><ChevronLeft/></button>
                  <h2 className="text-2xl font-bold text-white">{currentProject.title}</h2>
                </div>
                <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm">+ Add Task</button>
              </div>
              <div className="max-w-md">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2"><span className="text-slate-500">Progress</span><span className="text-blue-400">{progress}%</span></div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </header>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <div className="flex-1 p-8 flex gap-6 overflow-x-auto items-start">
                {['todo', 'in-progress', 'review', 'done'].map(status => (
                  <Column key={status} id={status} title={status} tasks={tasks.filter(t => t.status === status)} onDeleteTask={(id) => {
                      if(window.confirm("Delete Task?")) {
                          axios.delete(`${API}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(() => setTasks(prev => prev.filter(t => t._id !== id)));
                      }
                  }} onTaskClick={setActiveTask} />
                ))}
              </div>
            </DndContext>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[110]">
          <div className="w-full max-w-md bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between mb-8"><h2 className="text-2xl font-bold text-white">Profile Settings</h2><button onClick={() => setIsProfileModalOpen(false)}><X/></button></div>
            <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mb-4">{tempUserName.charAt(0)}</div>
                <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 text-center" value={tempUserName} onChange={(e) => setTempUserName(e.target.value)} />
            </div>
            <button onClick={() => { const u = {...user, name: tempUserName}; localStorage.setItem("user", JSON.stringify(u)); setUser(u); setIsProfileModalOpen(false); }} className="w-full bg-blue-600 p-4 rounded-xl font-bold text-white">Save Profile</button>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {activeTask && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
          <div className="w-full max-w-xl bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{activeTask.title}</h2>
                <button onClick={() => setActiveTask(null)}><X/></button>
            </div>
            <p className="bg-[#0B0E14] p-6 rounded-2xl border border-slate-800 text-slate-400 mb-6">{activeTask.description || "No details provided."}</p>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                <span>Status: <span className="text-white">{activeTask.status}</span></span>
                <span>Priority: <span className="text-blue-400">{activeTask.priority}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Project Creation Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">New Project</h2>
            <form onSubmit={async (e) => {
                e.preventDefault();
                const res = await axios.post(`${API}/projects`, newProject, { headers: { Authorization: `Bearer ${token}` } });
                setProjects([res.data, ...projects]);
                setIsProjectModalOpen(false);
                setNewProject({ title: "", description: "" });
            }} className="space-y-4">
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none" placeholder="Project Title" value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} />
              <textarea className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none h-32" placeholder="Description" value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
              <button type="submit" className="w-full bg-blue-600 p-4 rounded-xl font-bold text-white">Create Workspace</button>
            </form>
          </div>
        </div>
      )}
      
      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Add Task</h2>
            <form onSubmit={async (e) => {
                e.preventDefault();
                const res = await axios.post(`${API}/tasks`, { ...newTask, projectId: currentProject._id }, { headers: { Authorization: `Bearer ${token}` } });
                setTasks([res.data, ...tasks]);
                setIsTaskModalOpen(false);
                setNewTask({ title: "", description: "", priority: "medium" });
            }} className="space-y-4">
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none" placeholder="Task Title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              <select className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <textarea className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none h-24" placeholder="Description" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
              <button type="submit" className="w-full bg-blue-600 p-4 rounded-xl font-bold text-white">Add to Board</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}