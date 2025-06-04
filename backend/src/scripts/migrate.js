const fs = require('fs').promises;
const path = require('path');
const { sequelize } = require('../config/database');
require('dotenv').config();

// Migration tracking table
const createMigrationTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await sequelize.query(query);
    console.log('✅ Migration tracking table ready.');
  } catch (error) {
    console.error('❌ Failed to create migration table:', error);
    throw error;
  }
};

// Get executed migrations
const getExecutedMigrations = async () => {
  try {
    const [results] = await sequelize.query(
      'SELECT filename FROM migrations ORDER BY id ASC'
    );
    return results.map(row => row.filename);
  } catch (error) {
    console.error('❌ Failed to get executed migrations:', error);
    return [];
  }
};

// Mark migration as executed
const markMigrationExecuted = async (filename) => {
  try {
    await sequelize.query(
      'INSERT INTO migrations (filename) VALUES (?)',
      { replacements: [filename] }
    );
    console.log(`✅ Marked migration ${filename} as executed.`);
  } catch (error) {
    console.error(`❌ Failed to mark migration ${filename} as executed:`, error);
    throw error;
  }
};

// Execute a single migration file
const executeMigration = async (filename, filepath) => {
  try {
    console.log(`🔄 Executing migration: ${filename}`);
    
    const sql = await fs.readFile(filepath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      await sequelize.query(statement);
    }
    
    await markMigrationExecuted(filename);
    console.log(`✅ Migration ${filename} completed successfully.`);
  } catch (error) {
    console.error(`❌ Migration ${filename} failed:`, error);
    throw error;
  }
};

// Main migration function
const runMigrations = async () => {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Initialize migration tracking
    await createMigrationTable();
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`📋 Previously executed migrations: ${executedMigrations.length}`);
    
    // Get migration files from database directory
    const migrationsDir = path.join(__dirname, '../../../database/migrations');
    
    let migrationFiles;
    try {
      migrationFiles = await fs.readdir(migrationsDir);
    } catch (error) {
      console.error('❌ Migration directory not found:', migrationsDir);
      throw error;
    }
    
    // Filter and sort migration files
    const sqlFiles = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort(); // Alphabetical sort ensures 001_, 002_, 003_ order
    
    console.log(`📁 Found ${sqlFiles.length} migration files.`);
    
    // Execute pending migrations
    let executed = 0;
    for (const filename of sqlFiles) {
      if (!executedMigrations.includes(filename)) {
        const filepath = path.join(migrationsDir, filename);
        await executeMigration(filename, filepath);
        executed++;
      } else {
        console.log(`⏭️  Skipping already executed migration: ${filename}`);
      }
    }
    
    if (executed === 0) {
      console.log('✅ All migrations are up to date!');
    } else {
      console.log(`✅ Successfully executed ${executed} new migrations.`);
    }
    
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run migrations if script is called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 Migration process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
  createMigrationTable,
  getExecutedMigrations,
  executeMigration
}; 