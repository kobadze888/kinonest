// src/lib/db.js
import { Pool } from 'pg';

// კავშირის ობიექტი იქმნება მხოლოდ ერთხელ (Next.js-ის გარემოს გათვალისწინებით)
// ეს იყენებს DATABASE_URL ცვლადს, რომელიც დაამატეთ .env.local ფაილში
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// მარტივი ფუნქცია ბაზასთან მიმართვისთვის
export const query = (text, params) => pool.query(text, params);

// ფუნქცია, რომელიც იღებს კლიენტს (ტრანზაქციებისთვის)
export const getClient = () => pool.connect();