const defineModel = require("./defineModel");

module.exports = defineModel("pictures", [
  "related_id",
  "type",
  "caption",
  "filepath",
  "mime_type",
  "alt_text",
  "created_at",
  "updated_at",
]);
