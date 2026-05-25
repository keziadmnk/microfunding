const { getPool } = require("../src/config/db");

class BaseModel {
  constructor({ table, primaryKey = "id", fillable = [] }) {
    this.table = table;
    this.primaryKey = primaryKey;
    this.fillable = fillable;
  }

  async all() {
    const [rows] = await getPool().query(`SELECT * FROM ${this.table}`);
    return rows;
  }

  async findById(id) {
    const [rows] = await getPool().query(
      `SELECT * FROM ${this.table} WHERE ${this.primaryKey} = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async create(payload) {
    const data = this.#sanitize(payload);
    const keys = Object.keys(data);

    if (!keys.length) {
      throw new Error(`No insertable fields provided for ${this.table}`);
    }

    const placeholders = keys.map(() => "?").join(", ");
    const values = keys.map((key) => data[key]);

    const [result] = await getPool().query(
      `INSERT INTO ${this.table} (${keys.join(", ")}) VALUES (${placeholders})`,
      values
    );

    return this.findById(result.insertId);
  }

  async updateById(id, payload) {
    const data = this.#sanitize(payload);
    const keys = Object.keys(data);

    if (!keys.length) {
      return this.findById(id);
    }

    const assignments = keys.map((key) => `${key} = ?`).join(", ");
    const values = keys.map((key) => data[key]);

    await getPool().query(
      `UPDATE ${this.table} SET ${assignments} WHERE ${this.primaryKey} = ?`,
      [...values, id]
    );

    return this.findById(id);
  }

  async deleteById(id) {
    const [result] = await getPool().query(
      `DELETE FROM ${this.table} WHERE ${this.primaryKey} = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }

  #sanitize(payload = {}) {
    return Object.fromEntries(
      Object.entries(payload).filter(([key]) => this.fillable.includes(key))
    );
  }
}

module.exports = BaseModel;
