const defineModel = require("./defineModel");

module.exports = defineModel("funders", [
  "user_id",
  "organization_name",
  "funding_min",
  "funding_max",
  "investment_interests",
  "expertise_areas",
  "verified",
  "created_at",
  "updated_at",
]);
