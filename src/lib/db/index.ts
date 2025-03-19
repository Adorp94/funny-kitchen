import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Database connection string
const connectionString = process.env.DATABASE_URL;

// Client for database operations
let client: ReturnType<typeof postgres> | undefined;

// Function to get the database client
export function getDbClient() {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  if (!client) {
    client = postgres(connectionString);
  }

  return client;
}

// Create and export the database instance
export function getDb() {
  const client = getDbClient();
  return drizzle(client, { schema });
}

// Function to close the database connection
export async function closeDbConnection() {
  if (client) {
    await client.end();
    client = undefined;
  }
}