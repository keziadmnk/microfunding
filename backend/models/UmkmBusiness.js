const defineModel = require("./defineModel");

module.exports = defineModel("umkm_business", [
  "owner_id",
  "name",
  "category",
  "other_category",
  "description",
  "location",
  "logo",
  "verified",
  "year_established",
  "employee_count",
  "monthly_revenue",
  "legal_documents",
  "funding_target",
  "funding_purpose",
  "business_goals",
  "created_at",
  "updated_at",
]);
