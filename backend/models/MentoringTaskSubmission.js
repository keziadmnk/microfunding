const defineModel = require("./defineModel");

module.exports = defineModel("mentoring_task_submissions", [
  "task_id",
  "workspace_id",
  "submitted_by",
  "note",
  "file_name",
  "file_path",
  "file_mime",
  "file_size",
  "submission_status",
  "submitted_at",
  "cancelled_at",
  "created_at",
  "updated_at",
]);
