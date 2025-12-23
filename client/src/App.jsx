import { useState, useEffect } from "react";
import axios from "axios";
import { Layout, Plus, Folder, CheckCircle, LogOut, X } from "lucide-react";

const API = "http://localhost:5000/api";

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [projects, setProjects] = useState([]);
  const [authMode, setAuthMode] = useState("login");
  const [credentials, setCredentials] = useState({ email: "", password: "", username: "" });
  
  // NEW STATES FOR PROJECT CREATION
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: "", description: "" });

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
    } catch (err) {
      console.error("Fetch error", err);
    }
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
    } catch (err) {
      alert("Auth Failed: " + err.response?.data?.msg);
    }
  };

  // NEW: CREATE PROJECT FUNCTION
  const createProject = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/projects`, newProject);
      setProjects([res.data, ...projects]); // Add new project to the top of the list
      setIsModalOpen(false); // Close modal
      setNewProject({ title: "", description: "" }); // Reset form
    } catch (err) {
      alert("Error creating project");
    }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#161B22] border border-slate-800 p-10 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <Layout className="text-blue-500" size={32} />
            <h1 className="text-2xl font-bold tracking-tight">ProTasker</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "signup" && (
              <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500" 
                placeholder="Username" onChange={e => setCredentials({...credentials, username: e.target.value})} />
            )}
            <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500" 
              placeholder="Email" onChange={e => setCredentials({...credentials, email: e.target.value})} />
            <input className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500" 
              type="password" placeholder="Password" onChange={e => setCredentials({...credentials, password: e.target.value})} />
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
          <p onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} 
            className="text-center text-xs text-slate-500 mt-6 cursor-pointer hover:text-slate-300 uppercase tracking-widest font-bold">
            {authMode === "login" ? "Need an account? Join" : "Have an account? Login"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-300 flex relative">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col p-6 hidden md:flex">
        <div className="flex items-center gap-2 mb-10 text-white">
          <Layout className="text-blue-500" size={24} />
          <span className="font-bold tracking-tight text-lg">ProTasker</span>
        </div>
        <nav className="space-y-2 flex-1">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl font-bold text-sm">
            <Folder size={18} /> Projects
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 rounded-xl font-bold text-sm transition-colors">
            <CheckCircle size={18} /> My Tasks
          </button>
        </nav>
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold uppercase text-white">
              {user.username.charAt(0)}
            </div>
            <span className="text-xs font-bold text-white">{user.username}</span>
          </div>
          <button onClick={logout} className="text-slate-500 hover:text-red-400"><LogOut size={16}/></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold text-white">Your Projects</h2>
            <p className="text-slate-500 text-sm mt-1">Manage and track your active workflows.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus size={20} /> New Project
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div key={project._id} className="bg-[#161B22] border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all cursor-pointer group">
              <h3 className="text-white font-bold text-xl mb-2 group-hover:text-blue-400 transition-colors">{project.title}</h3>
              <p className="text-slate-500 text-sm line-clamp-2 mb-6">{project.description}</p>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <span>{project.status}</span>
                <span className="bg-slate-800 px-3 py-1 rounded-full">{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full py-20 border-2 border-dashed border-slate-800 rounded-3xl text-center">
              <p className="text-slate-600 italic">No projects found. Create your first workspace!</p>
            </div>
          )}
        </div>
      </main>

      {/* CREATE PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg bg-[#161B22] border border-slate-800 rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Project</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
            </div>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Project Title</label>
                <input 
                  required
                  className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500 text-white" 
                  placeholder="e.g. Website Redesign" 
                  value={newProject.title}
                  onChange={e => setNewProject({...newProject, title: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Description</label>
                <textarea 
                  rows="4"
                  className="w-full bg-[#0B0E14] border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500 text-white resize-none" 
                  placeholder="What is this project about?" 
                  value={newProject.description}
                  onChange={e => setNewProject({...newProject, description: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 text-white p-4 rounded-xl font-bold hover:bg-slate-700 transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;