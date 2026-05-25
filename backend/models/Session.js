const defineModel = require("./defineModel");

module.exports = defineModel(
  "sessions",
  ["id", "user_id", "ip_address", "user_agent", "payload", "last_activity"],
  "id"
);
