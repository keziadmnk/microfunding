const defineModel = require("./defineModel");

module.exports = defineModel("jobs", [
  "queue",
  "payload",
  "attempts",
  "reserved_at",
  "available_at",
  "created_at",
]);
