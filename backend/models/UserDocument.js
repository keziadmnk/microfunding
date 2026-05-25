const defineModel = require("./defineModel");

module.exports = defineModel("user_documents", [
  "user_id",
  "related_type",
  "document_type",
  "file_path",
  "status",
  "notes",
  "created_at",
  "updated_at",
]);
