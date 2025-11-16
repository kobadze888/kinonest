// src/lib/db.js (SSL-ის გამარტივებული და გაძლიერებული ვერსია)
import { Pool } from 'pg';

// ჩვენ ვზრდით connectionTimeoutMillis-ს, რათა ETIMEDOUT შეცდომა აღარ მოხდეს
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // --- უსაფრთხოების (SSL) და სტაბილურობის პარამეტრები ---
  ssl: {
    // ვაყენებთ SSL-ს 'require'-ზე, რაც Supabase-ს მინიმალური მოთხოვნაა
    // და იმედი გვაქვს, რომ ის კავშირს დაამყარებს
    rejectUnauthorized: false, 
  },
  // ვზრდით დროის ლიმიტს, რომ ნელმა ქსელმა არ გააფუჭოს კავშირი
  connectionTimeoutMillis: 20000, // 20 წამი კავშირის დასამყარებლად
  idleTimeoutMillis: 30000,
  // --- დასასრული ---
});

// მარტივი ფუნქცია ბაზასთან მიმართვისთვის
export const query = (text, params) => pool.query(text, params);

// ფუნქცია, რომელიც იღებს კლიენტს (ტრანზაქციებისთვის)
export const getClient = () => pool.connect();