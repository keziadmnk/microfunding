const defineModel = require("./defineModel");

module.exports = defineModel("users", [
  "name",
  "email",
  "email_verified_at",
  "password",
  "two_factor_secret",
  "two_factor_recovery_codes",
  "two_factor_confirmed_at",
  "phone",
  "profile_photo",
  "bio",
  "role",
  "address",
  "remember_token",
  "created_at",
  "updated_at",
]);
