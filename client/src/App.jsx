import { useState, useEffect } from "react";
import axios from "axios";
import { Layout, Plus, Folder, CheckCircle, LogOut, X, ChevronLeft, Calendar, MessageSquare } from "lucide-react";

const API = "http://localhost:5000/api";

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [projects, setProjects] = useState([]);
  const [authMode, setAuthMode] = useState("login");
  const [credentials, setCredentials] = useState({ email: "", password: "", username: "" });
  
  // NAVIGATION & MODAL STATES
  const [currentProject, setCurrentProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // FORM STATES
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" });

  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  useEffect(() => {
    if (token) fetchProjects();
  }, [token]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API}/projects`);
      setProjects(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTasks = async (projectId) => {
    try {
      const res = await axios.get(`${API}/tasks/${projectId}`);
      setTasks(res.data);
    } catch (err) { console.error(err); }
  };

  const openProject = (project) => {
    setCurrentProject(project);
    fetchTasks(project._id);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = authMode === "login" ? "/auth/login" : "/auth/signup";
    try {
      const res = await axios.post(`${API}${endpoint}`, credentials);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) { alert(err.response?.data?.msg); }
  };

  const createProject = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/projects`, newProject);
      setProjects([res.data, ...projects]);
      setIsProjectModalOpen(false);
      setNewProject({ title: "", description: "" });
    } catch (err) { alert("Error"); }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/tasks`, { ...newTask, projectId: currentProject._id });
      setTasks([res.data, ...tasks]);
      setIsTaskModalOpen(false);
      setNewTask({ title: "", description: "", priority: "medium" });
    } catch (err) { alert("Error creating task"); }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#161B22] border border-slate-800 p-10 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <Layout className="text-blue-500" size={32} />
            <h1 className="text-2xl font-bold tracking-tight text-white">ProTasker</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "signup" && (
              <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500 text-white" 
                placeholder="Username" onChange={e => setCredentials({...credentials, username: e.target.value})} />
            )}
            <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500 text-white" 
              placeholder="Email" onChange={e => setCredentials({...credentials, email: e.target.value})} />
            <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500 text-white" 
              type="password" placeholder="Password" onChange={e => setCredentials({...credentials, password: e.target.value})} />
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold">
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
          <p onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} className="text-center text-xs text-slate-500 mt-6 cursor-pointer uppercase font-bold">
            {authMode === "login" ? "Join ProTasker" : "Back to Login"}
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
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase">{user.username.charAt(0)}</div>
            <span className="text-xs font-bold">{user.username}</span>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-slate-500 hover:text-red-400"><LogOut size={16}/></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {!currentProject ? (
          <div className="p-8">
            <header className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-bold text-white">Dashboard</h2>
                <p className="text-slate-500 text-sm mt-1">Select a workspace to start tracking.</p>
              </div>
              <button onClick={() => setIsProjectModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Plus size={20}/> New Project</button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => (
                <div key={p._id} onClick={() => openProject(p)} className="bg-[#161B22] border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all cursor-pointer group">
                  <h3 className="text-white font-bold text-xl mb-2 group-hover:text-blue-400">{p.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <header className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#161B22]/30 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentProject(null)} className="p-2 hover:bg-slate-800 rounded-lg"><ChevronLeft/></button>
                <div>
                  <h2 className="text-2xl font-bold text-white">{currentProject.title}</h2>
                  <p className="text-xs text-slate-500">Project Workspace</p>
                </div>
              </div>
              <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"><Plus size={18}/> Add Task</button>
            </header>
            
            <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-start overflow-x-auto">
              {['todo', 'in-progress', 'review', 'done'].map(status => (
                <div key={status} className="bg-[#161B22]/50 p-4 rounded-2xl border border-slate-800 min-w-[280px]">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 px-2 flex justify-between">
                    {status.replace('-', ' ')}
                    <span className="bg-slate-800 text-slate-400 px-2 rounded-md">{tasks.filter(t => t.status === status).length}</span>
                  </h3>
                  <div className="space-y-3">
                    {tasks.filter(t => t.status === status).map(task => (
                      <div key={task._id} className="bg-[#1C2128] border border-slate-800 p-4 rounded-xl hover:border-slate-600 transition-all cursor-grab active:cursor-grabbing shadow-sm">
                        <div className={`w-8 h-1 rounded-full mb-3 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                        <h4 className="text-white font-bold text-sm mb-1">{task.title}</h4>
                        <p className="text-slate-500 text-xs line-clamp-2 mb-3">{task.description}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                          <User size={12}/> {task.assignedTo?.username || 'Unassigned'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODALS (Project and Task) - Same logic as before for Project, new for Task */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Project</h2>
            <form onSubmit={createProject} className="space-y-4">
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Project Title" value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} />
              <textarea className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 h-32" placeholder="Description" value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="flex-1 bg-slate-800 p-4 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 p-4 rounded-xl font-bold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Add Task to {currentProject.title}</h2>
            <form onSubmit={createTask} className="space-y-4">
              <input required className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Task Name" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              <select className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <textarea className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl text-white outline-none h-24" placeholder="Task Details" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 bg-slate-800 p-4 rounded-xl font-bold text-white">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 p-4 rounded-xl font-bold text-white">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;