const defineModel = require("./defineModel");

module.exports = defineModel("mentoring_requests", [
  "umkm_user_id",
  "mentor_id",
  "topic",
  "business_problem",
  "mentoring_goal",
  "duration",
  "preferred_schedule",
  "additional_message",
  "status",
  "rejection_reason",
  "requested_at",
  "responded_at",
  "created_at",
  "updated_at",
]);
