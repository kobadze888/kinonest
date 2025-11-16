// src/lib/db.js (გაძლიერებული კავშირის პარამეტრები)
import { Pool } from 'pg';

// კავშირის ობიექტი იქმნება მხოლოდ ერთხელ
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // --- უსაფრთხოების (SSL) და სტაბილურობის პარამეტრები ---
  ssl: {
    // ეს აუცილებელია Supabase-თან კავშირისთვის, როდესაც კლიენტი არასერტიფიცირებულია
    rejectUnauthorized: false, 
  },
  // დროის ლიმიტები
  connectionTimeoutMillis: 10000, // 10 წამი კავშირის დასამყარებლად
  idleTimeoutMillis: 30000,     // 30 წამი უსაქმური კავშირის გათიშვამდე
  // --- დასასრული ---
});

// მარტივი ფუნქცია ბაზასთან მიმართვისთვის
export const query = (text, params) => pool.query(text, params);

// ფუნქცია, რომელიც იღებს კლიენტს (ტრანზაქციებისთვის)
export const getClient = () => pool.connect();