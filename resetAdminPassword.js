// Run this script with: node resetAdminPassword.js
// It will print a bcrypt hash for your new password

import bcrypt from 'bcryptjs';

const newPassword = 'admin123'; // Change this if you want a different password
const saltRounds = 10;

bcrypt.hash(newPassword, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }
  console.log('Use this hash in your MongoDB admin user document:');
  console.log(hash);
});
