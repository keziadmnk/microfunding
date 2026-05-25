const defineModel = require("./defineModel");

module.exports = defineModel("cache_locks", ["key", "owner", "expiration"], "key");
