const defineModel = require("./defineModel");

module.exports = defineModel("mentor_profiles", [
  "user_id",
  "name",
  "profession",
  "expertise",
  "achievements",
  "experience_years",
  "bio",
  "rating",
  "availability",
  "status",
  "created_at",
  "updated_at",
]);
