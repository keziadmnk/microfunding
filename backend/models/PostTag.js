const defineModel = require("./defineModel");

module.exports = defineModel("post_tags", [
  "post_id",
  "tag",
  "created_at",
  "updated_at",
]);
