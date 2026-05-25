const defineModel = require("./defineModel");

module.exports = defineModel("cache", ["key", "value", "expiration"], "key");
