const defineModel = require("./defineModel");

module.exports = defineModel("job_batches", [
  "id",
  "name",
  "total_jobs",
  "pending_jobs",
  "failed_jobs",
  "failed_job_ids",
  "options",
  "cancelled_at",
  "created_at",
  "finished_at",
], "id");
