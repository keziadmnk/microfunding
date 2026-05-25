const defineModel = require("./defineModel");

module.exports = defineModel("mentor_hours_log", [
  "mentor_id",
  "session_id",
  "hours_contributed",
  "earned_points",
  "star",
  "created_at",
  "updated_at",
]);
