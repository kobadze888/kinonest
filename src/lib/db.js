// src/lib/db.js (Стабильная версия для Neon)
import { Pool } from 'pg';

// 'globalThis' - это универсальный способ получить доступ к 'global'
const globalForPool = globalThis;

let pool;

// 1. Проверяем, существует ли уже пул в 'global'
if (!globalForPool.pgPool) {
  // 2. Если нет - создаем новый
  console.log("Creating NEW PostgreSQL connection pool (Neon)...");
  globalForPool.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // 💡 'sslmode=require' уже находится в process.env.DATABASE_URL
    
    // 💡 Возвращаем нормальный лимит
    max: 10, 
    connectionTimeoutMillis: 30000, // 30 секунд
    idleTimeoutMillis: 30000,
  });
} else {
  // 3. Если пул уже существует, используем его
  console.log("Reusing EXISTING PostgreSQL connection pool (Neon).");
}

// 4. Экспортируем ОДИН ЕДИНСТВЕННЫЙ пул
pool = globalForPool.pgPool;

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();