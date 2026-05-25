const defineModel = require("./defineModel");

module.exports = defineModel("comments", [
  "post_id",
  "user_id",
  "body",
  "created_at",
  "updated_at",
]);
