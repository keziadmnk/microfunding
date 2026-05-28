const defineModel = require("./defineModel");

module.exports = defineModel("mentoring_sessions", [
  "workspace_id",
  "title",
  "date",
  "start_time",
  "end_time",
  "platform",
  "meeting_link",
  "agenda",
  "status",
  "cancellation_reason",
  "created_at",
  "updated_at",
]);
