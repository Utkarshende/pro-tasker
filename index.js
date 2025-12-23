const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const auth = require('./middleware/auth');
const Project = require('./models/Project');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ ProTasker DB Connected"))
  .catch(err => console.error("❌ Connection Error:", err));

// --- ROUTES ---

// 1. Test Route
app.get('/', (req, res) => res.send("ProTasker API is Live"));

// 2. Protected Route Example: Create a Project
// Note: 'auth' middleware is placed before the (req, res) logic
app.post('/api/projects', auth, async (req, res) => {
  try {
    const { title, description } = req.body;
    
    const newProject = new Project({
      title,
      description,
      owner: req.user.id, // Comes from the 'auth' middleware
      members: [req.user.id] // Owner is the first member
    });

    const project = await newProject.save();
    res.json(project);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 ProTasker Server on Port ${PORT}`));