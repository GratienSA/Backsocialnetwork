

const validator = require("validator");

function validateName(name) {
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return { valid: false, error: "Name must be at least 2 characters long." };
  }
  return { valid: true };
}

function validateEmail(email) {
  if (!email || !validator.isEmail(email)) {
    return { valid: false, error: "Invalid email format." };
  }
  return { valid: true };
}

function validatePassword(password) {
  if (!password || password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters long." };
  }
  return { valid: true };
}

module.exports = {
  validateName,
  validateEmail,
  validatePassword
};
