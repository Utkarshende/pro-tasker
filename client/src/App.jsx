import { useState, useEffect } from "react";
import axios from "axios";
import { Layout, Plus, Folder, CheckCircle, LogOut, X, ChevronLeft, User, ChevronRight } from "lucide-react";

const API = "http://localhost:5000/api";

function App() {
  // 1. SAFE STATE INITIALIZATION
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

  // 2. STABLE API CALLS WITH EXPLICIT HEADERS
  const fetchProjects = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data);
    } catch (err) {
      if (err.response?.status === 401) logout();
      console.error("Fetch projects failed", err);
    }
  };

  const fetchTasks = async (projectId) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/tasks/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data);
    } catch (err) {
      console.error("Fetch tasks failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchProjects();
  }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = authMode === "login" ? "/auth/login" : "/auth/signup";
    try {
      const res = await axios.post(`${API}${endpoint}`, credentials);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) { 
      alert(err.response?.data?.msg || "Auth Failed"); 
    }
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
    } catch (err) { alert("Error creating project"); }
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
    } catch (err) { alert("Error creating task"); }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    window.location.reload();
  };

  // 3. AUTH VIEW
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#161B22] border border-slate-800 p-10 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <Layout className="text-blue-500" size={32} />
            <h1 className="text-2xl font-bold tracking-tight">ProTasker</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "signup" && (
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" 
                placeholder="Username" onChange={e => setCredentials({...credentials, username: e.target.value})} />
            )}
            <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" 
              placeholder="Email" onChange={e => setCredentials({...credentials, email: e.target.value})} />
            <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" 
              type="password" placeholder="Password" onChange={e => setCredentials({...credentials, password: e.target.value})} />
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold transition-all active:scale-95">
              {authMode === "login" ? "Sign In" : "Get Started"}
            </button>
          </form>
          <p onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} className="text-center text-xs text-slate-500 mt-6 cursor-pointer uppercase font-bold hover:text-white transition-colors">
            {authMode === "login" ? "Need an account? Join" : "Already a member? Login"}
          </p>
        </div>
      </div>
    );
  }

  // 4. DASHBOARD VIEW
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
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase">
              {user?.username?.charAt(0) || "U"}
            </div>
            <span className="text-xs font-bold truncate max-w-[100px]">{user?.username}</span>
          </div>
          <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-colors"><LogOut size={16}/></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {!currentProject ? (
          <div className="p-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-bold text-white">Project Center</h2>
                <p className="text-slate-500 text-sm mt-1">Select a workspace to manage your team.</p>
              </div>
              <button onClick={() => setIsProjectModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/10 active:scale-95 transition-all">
                <Plus size={20}/> New Project
              </button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => (
                <div key={p._id} onClick={() => { setCurrentProject(p); fetchTasks(p._id); }} className="bg-[#161B22] border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all cursor-pointer group">
                  <h3 className="text-white font-bold text-xl mb-2 group-hover:text-blue-400 transition-colors">{p.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
            <header className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#161B22]/30 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentProject(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft/></button>
                <div>
                  <h2 className="text-2xl font-bold text-white">{currentProject.title}</h2>
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    <span className="text-blue-400">Board View</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10"><Plus size={18}/> New Task</button>
            </header>
            
            <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-start overflow-x-auto">
              {['todo', 'in-progress', 'review', 'done'].map(status => (
                <div key={status} className="bg-[#161B22]/50 p-4 rounded-2xl border border-slate-800 min-w-[280px]">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 px-2 flex justify-between items-center">
                    {status.replace('-', ' ')}
                    <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md text-[10px]">
                      {tasks.filter(t => t.status === status).length}
                    </span>
                  </h3>
                  <div className="space-y-3 min-h-[150px]">
                    {loading ? (
                      <div className="p-4 text-center text-xs text-slate-600 animate-pulse">Loading tasks...</div>
                    ) : (
                      tasks.filter(t => t.status === status).map(task => (
                        <div key={task._id} className="bg-[#1C2128] border border-slate-800 p-4 rounded-xl hover:border-slate-500 transition-all cursor-pointer shadow-sm group">
                          <div className={`w-8 h-1 rounded-full mb-3 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                          <h4 className="text-white font-bold text-sm mb-1 group-hover:text-blue-400 transition-colors">{task.title}</h4>
                          <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2 mb-3">{task.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold bg-slate-800/50 w-fit px-2 py-1 rounded-md">
                            <User size={10}/> {task.assignedTo?.username || user?.username}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-white mb-6">Create Project</h2>
            <form onSubmit={createProject} className="space-y-4">
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Title" value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} />
              <textarea className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 h-32 resize-none" placeholder="Briefly describe the project goals..." value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="flex-1 bg-slate-800 p-4 rounded-xl font-bold hover:bg-slate-700 text-white transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 p-4 rounded-xl font-bold hover:bg-blue-700 text-white transition-all">Create</button>
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
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <textarea className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none h-24 resize-none focus:border-blue-500" placeholder="Details..." value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 bg-slate-800 p-4 rounded-xl font-bold hover:bg-slate-700 text-white transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 p-4 rounded-xl font-bold hover:bg-blue-700 text-white transition-all">Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;