Failed to load resource: the server responded with a status of 401(Unauthorized)
api / db - status: 1  Failed to load resource: the server responded with a status of 401(Unauthorized)const { Client } = require('pg');

async function run() {
  console.log('Connecting to PostgreSQL using local trust authentication...');

  // We can connect to 'postgres' default database
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    // 1. Change password of 'postgres' user to 'postgres'
    console.log("Setting postgres password to 'postgres'...");
    await client.query("ALTER USER postgres PASSWORD 'postgres';");
    console.log('Password set successfully.');

    // 2. Check if virtual_cfo database exists, create if not
    console.log("Checking if 'virtual_cfo' database exists...");
    const dbCheck = await client.query("SELECT 1 FROM pg_database WHERE datname = 'virtual_cfo'");
    if (dbCheck.rows.length === 0) {
      console.log("Creating database 'virtual_cfo'...");
      // database creation cannot be run inside a transaction, but standard query is fine
      await client.query("CREATE DATABASE virtual_cfo");
      console.log("Database 'virtual_cfo' created successfully.");
    } else {
      console.log("Database 'virtual_cfo' already exists.");
    }

    await client.end();
    console.log('Configuration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during configuration:', err.message);
    try { await client.end(); } catch (e) { }
    process.exit(1);
  }
}

run();
