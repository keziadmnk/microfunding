const defineModel = require("./defineModel");

module.exports = defineModel("mentors", [
  "user_id",
  "current_job",
  "experience",
  "about",
  "reputation_score",
  "verified",
  "created_at",
  "updated_at",
]);
