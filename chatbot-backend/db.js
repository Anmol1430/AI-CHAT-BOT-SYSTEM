// db.js (Corrected for ES Module support and .env integration)

import mysql from 'mysql2';
import 'dotenv/config'; // Ensure environment variables are loaded if db.js is run separately

const pool = mysql.createPool({
    // Use environment variables for connection security and flexibility
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Anmol@9336',
    database: process.env.DB_NAME || 'chatbot_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// CRITICAL FIX: Change module.exports to export default for ES Modules
export default pool.promise();