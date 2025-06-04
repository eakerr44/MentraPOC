const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const config = {
  development: {
    username: process.env.POSTGRES_USER || 'mentra_user',
    password: process.env.POSTGRES_PASSWORD || 'mentra_dev_password',
    database: process.env.POSTGRES_DB || 'mentra_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true, // Soft deletes for data protection
      charset: 'utf8',
      dialectOptions: {
        collate: 'utf8_general_ci'
      }
    }
  },
  test: {
    username: process.env.POSTGRES_USER || 'mentra_user',
    password: process.env.POSTGRES_PASSWORD || 'mentra_dev_password',
    database: process.env.POSTGRES_DB + '_test' || 'mentra_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    ssl: true,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  }
};

// Initialize Sequelize instance
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let sequelize;
if (dbConfig.use_env_variable) {
  sequelize = new Sequelize(process.env[dbConfig.use_env_variable], dbConfig);
} else {
  sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);
}

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

// Initialize database (run migrations, sync models)
const initializeDatabase = async () => {
  try {
    await testConnection();
    
    // Sync all defined models to the DB (for development only)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized.');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  config,
  testConnection,
  initializeDatabase
};
 