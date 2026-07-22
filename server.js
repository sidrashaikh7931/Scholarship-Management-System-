const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./server/config/db');
const errorHandler = require('./server/middleware/errorHandler');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'client')));
app.use('/uploads', express.static(path.join(__dirname, 'server', 'uploads')));

// API Routes
app.use('/api/auth', require('./server/routes/authRoutes'));
app.use('/api/students', require('./server/routes/studentRoutes'));
app.use('/api/scholarships', require('./server/routes/scholarshipRoutes'));
app.use('/api/applications', require('./server/routes/applicationRoutes'));

// Serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'pages', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'pages', 'register.html'));
});

app.get('/student-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'pages', 'student-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'pages', 'admin-dashboard.html'));
});

app.get('/scholarships', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'pages', 'scholarships.html'));
});

app.get('/apply/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'pages', 'apply.html'));
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
