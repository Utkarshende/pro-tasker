const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = require('./middleware/auth');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task'); // Added Task Model

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ ProTasker DB Connected"))
  .catch(err => console.error("❌ Connection Error:", err));

// --- AUTH ROUTES ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ username, email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
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
    // Find projects where the user is either the owner or a member
    const projects = await Project.find({ members: req.user.id }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) { res.status(500).send('Server Error'); }
});

// --- TASK ROUTES ---

// Create a Task
app.post('/api/tasks', auth, async (req, res) => {
  try {
    const { projectId, title, description, assignedTo, priority, dueDate } = req.body;
    
    // Safety Check: Verify user belongs to this project
    const project = await Project.findById(projectId);
    if (!project || !project.members.includes(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to add tasks to this project' });
    }

    const newTask = new Task({
      projectId, title, description, assignedTo, priority, dueDate
    });

    const task = await newTask.save();
    res.json(task);
  } catch (err) { res.status(500).send('Server Error'); }
});

// Get all tasks for a specific project
app.get('/api/tasks/:projectId', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId })
      .populate('assignedTo', 'username avatar') // This turns the ID into user details!
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).send('Server Error'); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 ProTasker Server on Port ${PORT}`));