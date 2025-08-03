const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const users = []; // In-memory user store, replace with DB in production
const SECRET_KEY = 'your_jwt_secret'; // Replace with env var in real projects

// Setup multer for profile picture upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// ------------------- REGISTER ROUTE -------------------
router.post('/register', upload.single('profilePic'), async (req, res) => {
  try {
    const userData = JSON.parse(req.body.userData);

    const { fullName, mobile, email, password, role, province, district, referral } = userData;

    if (!fullName || !mobile || !email || !password || !role || !province || !district) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Remove mobile format validation (we accept anything now)

    // Check if mobile already exists
    const existingUser = users.find(u => u.mobile === mobile);
    if (existingUser) {
      return res.status(400).json({ message: 'Mobile number already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    const newUser = {
      fullName,
      mobile,
      email,
      password: hashedPassword,
      role,
      province,
      district,
      referral: referral || null,
      profilePic: req.file ? req.file.filename : null,
      createdAt: new Date()
    };

    users.push(newUser);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------- LOGIN ROUTE -------------------
router.post('/login', async (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ message: 'Mobile and password are required' });
  }

  // Remove mobile format validation here too

  const user = users.find(u => u.mobile === mobile);
  if (!user) {
    return res.status(401).json({ message: 'Invalid mobile or password' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid mobile or password' });
  }

  const token = jwt.sign({ mobile: user.mobile }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
});

module.exports = router;
