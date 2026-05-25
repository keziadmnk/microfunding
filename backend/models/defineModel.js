const BaseModel = require("./BaseModel");

function defineModel(table, fillable, primaryKey = "id") {
  return new BaseModel({ table, primaryKey, fillable });
}

module.exports = defineModel;
