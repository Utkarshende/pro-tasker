const crypto = require('crypto');

// Generates a 256-bit (32-byte) secret
const secret = crypto.randomBytes(32).toString('hex');

console.log("-------------------------------");
console.log("COPY THIS TO YOUR .env FILE:");
console.log("-------------------------------");
console.log(`JWT_SECRET=${secret}`);
console.log("-------------------------------");