const defineModel = require("./defineModel");

module.exports = defineModel("mentoring_files", [
  "workspace_id",
  "uploaded_by",
  "title",
  "description",
  "file_name",
  "file_path",
  "file_mime",
  "file_size",
  "created_at",
  "updated_at",
]);
