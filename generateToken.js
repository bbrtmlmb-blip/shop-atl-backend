const crypto = require('crypto');

const secret = crypto.randomBytes(64).toString('hex');
console.log("Generated JWT Secret:\n", secret);
