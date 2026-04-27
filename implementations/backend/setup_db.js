const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('Executing schema...');
      await client.query(schemaSql);
      console.log('✅ Database schema initialized successfully!');
    } finally {
      client.release();
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    console.error('TIP: Make sure your DATABASE_URL in .env is the "Session Pooler" URL (port 6543) if you are on an IPv4 network.');
    process.exit(1);
  }
}

setupDatabase();
