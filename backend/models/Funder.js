const defineModel = require("./defineModel");

module.exports = defineModel("funders", [
  "user_id",
  "organization_name",
  "verified",
  "created_at",
  "updated_at",
]);
