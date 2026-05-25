const defineModel = require("./defineModel");

module.exports = defineModel("failed_jobs", [
  "uuid",
  "connection",
  "queue",
  "payload",
  "exception",
  "failed_at",
]);
