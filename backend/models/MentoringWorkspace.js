const defineModel = require("./defineModel");

module.exports = defineModel("mentoring_workspaces", [
  "request_id",
  "umkm_user_id",
  "mentor_id",
  "topic",
  "goal",
  "status",
  "start_date",
  "end_date",
  "acceptance_note",
  "cancellation_reason",
  "final_evaluation",
  "final_recommendation",
  "created_at",
  "updated_at",
]);
