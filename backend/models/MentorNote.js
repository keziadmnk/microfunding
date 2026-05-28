const defineModel = require("./defineModel");

module.exports = defineModel("mentor_notes", [
  "workspace_id",
  "session_id",
  "evaluation",
  "obstacle_found",
  "advice",
  "next_recommendation",
  "created_at",
  "updated_at",
]);
