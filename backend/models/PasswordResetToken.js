const defineModel = require("./defineModel");

module.exports = defineModel(
  "password_reset_tokens",
  ["email", "token", "created_at"],
  "email"
);
