const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');  // Import middleware

// Dummy product list
const products = [
  { id: 1, name: 'Zambian Maize', price: 100 },
  { id: 2, name: 'Cassava Flour', price: 85 },
  { id: 3, name: 'Dry Fish', price: 200 }
];

// GET all products - protected route
router.get('/', verifyToken, (req, res) => {
  res.json(products);
});

module.exports = router;

