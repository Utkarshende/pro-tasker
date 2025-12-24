import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { 
  Layout, Plus, Folder, LogOut, X, ChevronLeft, 
  User, Trash2, Clock, CheckCircle2, AlertCircle 
} from "lucide-react";

// DND KIT IMPORTS
import { 
  DndContext, PointerSensor, useSensor, useSensors, 
  closestCorners 
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const API = "http://localhost:5000/api";

// --- 1. DRAGGABLE TASK CARD COMPONENT ---
function TaskCard({ task, onDelete, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="relative group mb-3"
    >
      <div 
        onClick={() => onClick(task)}
        className={`bg-[#1C2128] border ${isDragging ? 'border-blue-500 shadow-xl' : 'border-slate-800'} p-4 rounded-xl hover:border-slate-600 transition-all cursor-pointer`}
      >
        {/* DRAG HANDLE (Applied only to this top bar) */}
        <div {...listeners} {...attributes} className="flex items-center justify-between mb-3 cursor-grab active:cursor-grabbing">
          <div className={`w-10 h-1 rounded-full ${
            task.priority === 'high' ? 'bg-red-500' : 
            task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
          }`} />
        </div>

        <h4 className="text-white font-bold text-sm mb-1">{task.title}</h4>
        <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">
          {task.description || "No description"}
        </p>
      </div>

      {/* Delete Button (Hidden until hover) */}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(task._id); }}
        className="absolute top-3 right-3 p-1.5 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
      >
        <Trash2 size={12}/>
      </button>
    </div>
  );
}

// --- 2. DROPPABLE COLUMN COMPONENT ---
function Column({ id, title, tasks, onDeleteTask, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={`flex flex-col p-4 rounded-2xl border transition-all min-w-[280px] min-h-[600px] ${
        isOver ? 'bg-blue-600/5 border-blue-500/50 ring-2 ring-blue-500/20' : 'bg-[#161B22]/50 border-slate-800'
      }`}
    >
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-5 px-2 flex justify-between items-center">
        {title.replace('-', ' ')}
        <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
          {tasks.length}
        </span>
      </h3>
      <div className="flex-1">
        {tasks.map(task => (
          <TaskCard 
            key={task._id} 
            task={task} 
            onDelete={onDeleteTask} 
            onClick={onTaskClick} 
          />
        ))}
      </div>
    </div>
  );
}

// --- 3. MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [activeTask, setActiveTask] = useState(null); // For Details Modal

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  // Forms
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" });

  // DND Sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Progress Logic
  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === 'done').length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  useEffect(() => { if (token) fetchProjects(); }, [token]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API}/projects`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setProjects(res.data);
    } catch (err) { if (err.response?.status === 401) logout(); }
  };

  const fetchTasks = async (projectId) => {
    try {
      const res = await axios.get(`${API}/tasks/${projectId}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setTasks(res.data);
    } catch (err) { console.error(err); }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = active.id;
    const newStatus = over.id; // Corrected: Column ID

    // Optimistic Update
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));

    try {
      await axios.patch(`${API}/tasks/${taskId}`, { status: newStatus }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
    } catch (err) { fetchTasks(currentProject._id); }
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Permanent delete?")) return;
    try {
      await axios.delete(`${API}/tasks/${id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setTasks(prev => prev.filter(t => t._id !== id));
      if (activeTask?._id === id) setActiveTask(null);
    } catch (err) { alert("Delete failed"); }
  };

  const createProject = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/projects`, newProject, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setProjects([res.data, ...projects]);
      setIsProjectModalOpen(false);
      setNewProject({ title: "", description: "" });
    } catch (err) { alert("Error"); }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/tasks`, 
        { ...newTask, projectId: currentProject._id }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks([res.data, ...tasks]);
      setIsTaskModalOpen(false);
      setNewTask({ title: "", description: "", priority: "medium" });
    } catch (err) { alert("Error"); }
  };

  const logout = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (!token) return <div className="p-20 text-white text-center">Please refer to previous Auth UI code to login.</div>;

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
        <button onClick={logout} className="flex items-center gap-2 text-slate-500 hover:text-white mt-auto transition-colors">
          <LogOut size={18}/> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {!currentProject ? (
          <div className="p-8">
            <header className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold text-white">Project Dashboard</h2>
              <button onClick={() => setIsProjectModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10">
                <Plus size={20}/> New Project
              </button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => (
                <div key={p._id} onClick={() => { setCurrentProject(p); fetchTasks(p._id); }} className="bg-[#161B22] border border-slate-800 p-6 rounded-2xl cursor-pointer hover:border-blue-500 transition-all group">
                  <h3 className="text-white font-bold text-xl mb-2 group-hover:text-blue-400">{p.title}</h3>
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
                  <button onClick={() => setCurrentProject(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft/></button>
                  <h2 className="text-2xl font-bold text-white">{currentProject.title}</h2>
                </div>
                <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all"><Plus size={18}/> Add Task</button>
              </div>
              
              <div className="max-w-md">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                  <span className="text-slate-500">Completion Status</span>
                  <span className="text-blue-400">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </header>
            
            {/* KANBAN BOARD */}
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <div className="flex-1 p-8 flex gap-6 overflow-x-auto items-start">
                {['todo', 'in-progress', 'review', 'done'].map(status => (
                  <Column 
                    key={status} 
                    id={status} 
                    title={status} 
                    tasks={tasks.filter(t => t.status === status)} 
                    onDeleteTask={deleteTask} 
                    onTaskClick={setActiveTask}
                  />
                ))}
              </div>
            </DndContext>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Task Details Modal */}
      {activeTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
          <div className="w-full max-w-xl bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                  {activeTask.priority} Priority
                </span>
                <h2 className="text-3xl font-bold text-white mt-3">{activeTask.title}</h2>
              </div>
              <button onClick={() => setActiveTask(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500"><X/></button>
            </div>
            <p className="text-slate-400 leading-relaxed mb-8 bg-[#0B0E14] p-5 rounded-2xl border border-slate-800">
              {activeTask.description || "No details provided for this task."}
            </p>
            <div className="flex justify-between items-center pt-6 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Clock size={14}/> Status: <span className="text-white capitalize">{activeTask.status}</span>
              </div>
              <button onClick={() => deleteTask(activeTask._id)} className="flex items-center gap-2 text-xs font-bold text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors">
                <Trash2 size={14}/> Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">New Workspace</h2>
            <form onSubmit={createProject} className="space-y-4">
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Project Name" value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} />
              <textarea className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none h-32" placeholder="Description..." value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="flex-1 bg-slate-800 p-4 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 p-4 rounded-xl font-bold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Add New Task</h2>
            <form onSubmit={createTask} className="space-y-4">
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="What needs to be done?" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              <select className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <textarea className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none h-24" placeholder="Task details..." value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 bg-slate-800 p-4 rounded-xl font-bold text-white">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 p-4 rounded-xl font-bold text-white">Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}