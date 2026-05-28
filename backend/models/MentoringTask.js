const defineModel = require("./defineModel");

module.exports = defineModel("mentoring_tasks", [
  "workspace_id",
  "title",
  "instruction",
  "deadline",
  "priority",
  "status",
  "mentor_comment",
  "created_by",
  "created_at",
  "updated_at",
]);
