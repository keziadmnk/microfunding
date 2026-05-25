const defineModel = require("./defineModel");

module.exports = defineModel("fundings", [
  "funder_id",
  "business_id",
  "amount",
  "description",
  "proof_of_transfer",
  "status",
  "created_at",
  "updated_at",
]);
