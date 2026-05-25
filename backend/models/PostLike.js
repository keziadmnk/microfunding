const defineModel = require("./defineModel");

module.exports = defineModel("post_likes", [
  "post_id",
  "user_id",
  "created_at",
]);
