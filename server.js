const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',  // Adjust this for production, restrict origins properly
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your_jwt_secret_here';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory data for demo (replace with DB in production)
const users = [];
const products = [];

// Helper to verify token middleware for protected routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Routes

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const { fullName, mobile, password, role } = req.body;

  if (!fullName || !mobile || !password || !role) {
    return res.status(400).json({ message: 'All fields required' });
  }

  const existingUser = users.find(u => u.mobile === mobile);
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, fullName, mobile, password: hashedPassword, role };
  users.push(newUser);

  const token = jwt.sign({ id: newUser.id, mobile: newUser.mobile, role: newUser.role }, JWT_SECRET, { expiresIn: '1d' });

  // Emit event for new user registration
  io.emit('newUserRegistered', { fullName: newUser.fullName, role: newUser.role });

  res.status(201).json({ token });
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ message: 'Mobile and password required' });
  }

  const user = users.find(u => u.mobile === mobile);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, mobile: user.mobile, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

  res.json({ token });
});

// Get all products (protected)
app.get('/api/products', authenticateToken, (req, res) => {
  res.json(products);
});

// Add a product (protected)
app.post('/api/products', authenticateToken, (req, res) => {
  const { name, price, description } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ message: 'Name and price required' });
  }

  const product = {
    id: products.length + 1,
    name,
    price,
    description: description || '',
    userId: req.user.id,
    createdAt: new Date()
  };
  products.push(product);

  // Emit event for new product uploaded
  io.emit('newProductUploaded', product);

  res.status(201).json(product);
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
