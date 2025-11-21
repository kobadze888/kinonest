import 'dotenv/config';
import { Pool } from 'pg';

async function clean() {
  console.log('🧹 ვიწყებ არასწორი ფილმების წაშლას...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // 1. წავშალოთ ყველა ფილმი, რომელსაც ჰქვია "Шрэк", მაგრამ წელი არის 2010-ზე მეტი
    // (ნამდვილი შრეკი ძველია, ამიტომ ახლებს წაშლის)
    const res = await client.query(`
      DELETE FROM media 
      WHERE title_ru = 'Шрэк' AND release_year > 2010;
    `);
    
    console.log(`✅ წაიშალა ${res.rowCount} ყალბი "Шрэк".`);

    // 2. ასევე წავშალოთ ის ფილმები, რომლებსაც სახელი არ აქვთ (თუ არის ასეთი)
    const resNoTitle = await client.query(`
        DELETE FROM media 
        WHERE title_ru = 'No Title';
      `);
      
    console.log(`✅ წაიშალა ${resNoTitle.rowCount} უსახელო ფილმი.`);

  } catch (e) {
    console.error('❌ შეცდომა:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

clean();