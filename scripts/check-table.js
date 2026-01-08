#!/usr/bin/env node

const { Client } = require('pg');

const tableName = process.argv[2];
if (!tableName) {
  console.log('f');
  process.exit(0);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await client.connect();
    const res = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1);",
      [tableName]
    );
    console.log(res.rows[0].exists ? 't' : 'f');
  } catch (e) {
    console.log('f');
  } finally {
    await client.end();
  }
})();
