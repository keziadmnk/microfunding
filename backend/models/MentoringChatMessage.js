const defineModel = require("./defineModel");

module.exports = defineModel("mentoring_chat_messages", [
  "workspace_id",
  "sender_user_id",
  "sender_role",
  "message",
  "created_at",
]);
