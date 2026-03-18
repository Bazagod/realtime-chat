const { Sequelize } = require("sequelize");
const env = require("./env");

/*
 * Single Sequelize instance shared across the app.
 * Connection pooling keeps PG efficient under high concurrency.
 */
const sequelize = new Sequelize(env.databaseUrl, {
  dialect: "postgres",
  logging: env.nodeEnv === "development" ? console.log : false,
  pool: { max: 20, min: 2, acquire: 30000, idle: 10000 },
  define: { underscored: true, timestamps: true },
});

module.exports = sequelize;
