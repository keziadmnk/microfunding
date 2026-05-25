const defineModel = require("./defineModel");

module.exports = defineModel("mentor_sessions", [
  "umkm_owner",
  "mentor_id",
  "topic",
  "scheduled_at",
  "duration_minutes",
  "status",
  "notes",
  "feedback",
  "rating",
  "created_at",
  "updated_at",
]);
