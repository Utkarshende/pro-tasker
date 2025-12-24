require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const auth = require('./middleware/auth');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');

const app = express();

// Safety Check for Environment Variables
if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error("❌ ERROR: Missing MONGO_URI or JWT_SECRET in .env file");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ ProTasker DB Connected"))
  .catch(err => console.error("❌ Connection Error:", err));

  app.get('/', (req, res) => {
  res.send('Backend is running successfully!');
});

// --- AUTH ROUTES ---

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ username, email, password });
    user.password = await bcrypt.hash(password, 10);
    await user.save();

    const payload = { id: user.id, username: user.username };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) { res.status(500).send('Server error'); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const payload = { id: user.id, username: user.username };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) { res.status(500).send('Server error'); }
});

// --- PROJECT ROUTES ---

app.post('/api/projects', auth, async (req, res) => {
  try {
    const { title, description } = req.body;
    const newProject = new Project({
      title, description,
      owner: req.user.id,
      members: [req.user.id]
    });
    const project = await newProject.save();
    res.json(project);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/projects', auth, async (req, res) => {
  try {
    const projects = await Project.find({ members: req.user.id }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) { res.status(500).send('Server Error'); }
});

// --- TASK ROUTES ---

// Create Task
app.post('/api/tasks', auth, async (req, res) => {
  try {
    const { projectId, title, description, priority } = req.body;
    const newTask = new Task({
      projectId, title, description, priority,
      assignedTo: req.user.id // Default assign to creator
    });
    const task = await newTask.save();
    res.json(task);
  } catch (err) { res.status(500).send('Server Error'); }
});

// Get Tasks for Project
app.get('/api/tasks/:projectId', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId })
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).send('Server Error'); }
});

// Update Task Status (Crucial for Drag & Drop)
app.patch('/api/tasks/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    res.json(task);
  } catch (err) { res.status(500).send('Server Error'); }
});

// Delete Task
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // 1. Delete the project
    await Project.findByIdAndDelete(id);
    // 2. Delete all tasks associated with this project
    await Task.deleteMany({ projectId: id });
    
    res.status(200).json({ message: "Project and associated tasks deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// Start Server//
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));