const defineModel = require("./defineModel");

module.exports = defineModel("verification_logs", [
  "verified_by",
  "verified_entity_type",
  "verified_entity_id",
  "status",
  "notes",
  "created_at",
]);
