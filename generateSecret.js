const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('hex');

console.log("-------------------------------");
console.log("COPY THIS TO YOUR .env FILE:");
console.log("-------------------------------");
console.log(`JWT_SECRET=${secret}`);
console.log("-------------------------------");