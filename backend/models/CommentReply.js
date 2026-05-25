const defineModel = require("./defineModel");

module.exports = defineModel("comment_replies", [
  "comment_id",
  "user_id",
  "body",
  "created_at",
  "updated_at",
]);
