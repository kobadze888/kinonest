// src/pages/api/hello.js (Database Connection Test)
import { query } from '../../lib/db'; // ვამოწმებთ ჩვენს კავშირის ფენას

export default async function handler(req, res) {
  try {
    // ვცდილობთ მარტივი SQL ბრძანების გაშვებას (Postgres-ის დროის მოთხოვნა)
    const dbTime = await query('SELECT NOW()'); 
    
    res.status(200).json({ 
      status: "Database Connection OK",
      database_time: dbTime.rows[0].now, // დროის დაბრუნება
      api_name: "John Doe" 
    });

  } catch (error) {
    // თუ კავშირი ვერ შედგა, დავაბრუნოთ ზუსტი შეცდომა
    res.status(500).json({ 
      status: "Database Connection FAILED",
      error_message: error.message, // (მაგ: ETIMEDOUT)
      error_code: error.code
    });
  }
}