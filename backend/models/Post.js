const defineModel = require("./defineModel");

module.exports = defineModel("posts", [
  "forum_id",
  "posted_by",
  "title",
  "body",
  "status",
  "created_at",
  "updated_at",
]);
