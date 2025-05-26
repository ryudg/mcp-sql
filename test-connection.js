import { config } from 'dotenv';
import sql from 'mssql';

// Load environment variables
config();

async function testConnection() {
  console.log('🔍 Starting MCP MSSQL server connection test...\n');

  const dbConfig = {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_DATABASE || 'master',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      useUTC: false, // sql local time
    },
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000'),
  };

  console.log('📋 Connection settings:');
  console.log(`  Server: ${dbConfig.server}:${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}`);
  console.log(`  Encryption: ${dbConfig.options.encrypt ? '✅' : '❌'}`);
  console.log(`  Trust Certificate: ${dbConfig.options.trustServerCertificate ? '✅' : '❌'}\n`);

  try {
    console.log('🔌 Connecting to database...');
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    console.log('✅ Connection successful!\n');

    // Execute simple test query
    console.log('🧪 Running test query...');
    const result = await pool
      .request()
      .query('SELECT @@VERSION as ServerVersion, GETDATE() as CurrentTime');

    console.log('📊 Query results:');
    console.log(`  SQL Server Version: ${result.recordset[0].ServerVersion.split('\n')[0]}`);
    console.log(`  Current Time: ${result.recordset[0].CurrentTime}`);

    // Connection pool information
    console.log('\n🔗 Connection pool status:');
    console.log(`  Total connections: ${pool.connected ? 'Connected' : 'Disconnected'}`);
    console.log(`  Configured max connections: ${dbConfig.pool?.max || 'Default'}`);

    await pool.close();
    console.log('\n🎉 Connection test completed! Everything is working properly.');
  } catch (error) {
    console.error('\n❌ Connection failed:');
    console.error(`  Error: ${error.message}`);

    if (error.code) {
      console.error(`  Error code: ${error.code}`);
    }

    console.log('\n💡 Troubleshooting steps:');
    console.log('  1. Check database information in .env file');
    console.log('  2. Verify SQL Server is running');
    console.log('  3. Ensure port 1433 is open in firewall');
    console.log('  4. Verify username and password are correct');

    process.exit(1);
  }
}

testConnection();
