// scripts/sync.js (კრიტიკული კავშირის ტესტი)
// ... (Imports remain) ...

async function runSync() {
  console.log('--- Начат процесс синхронизации базы KinoNest ---');
  
  // 1. კრიტიკული კავშირის ტესტი
  try {
      // ვამოწმებთ, შეგვიძლია თუ არა კლიენტის აღება (კავშირის დამყარება)
      const client = await getClient();
      console.log('--- ✅ УСПЕШНО: Соединение с базой установлено. ---');
      client.release(); // ვათავისუფლებთ კავშირს, რომ Pool-ს არ შეეშალოს
  } catch (e) {
      // თუ კავშირი ვერ შედგა (Firewall/Timeout), ვაჩვენებთ შეცდომას და ვწყვეტთ
      console.error('--- ❌ КРИТИЧЕСКАЯ ОШИБКА: Нет соединения с базой ---');
      console.error('Причина:', e.message);
      return; 
  }

  // 2. ვინაიდან კავშირი მუშაობს, ახლა ვიწყებთ ჩაწერას
  // ... (აქ არის თქვენი კოდი, რომელიც იღებს TMDB-ს მონაცემებს) ...
  
  // 1. Get a list of top movies from TMDB
  const tmdbList = await fetch('https://api.themoviedb.org/3/movie/popular?api_key=f44912cf0212276fe1d1c6149f14803a&language=ru-RU&page=1')
                           .then(res => res.json());

  // ... (დანარჩენი ლოგიკა უცვლელად რჩება) ...

  const tmdbMovies = tmdbList?.results || [];

  let moviesInserted = 0;
  let moviesFailed = 0;
  
  for (const tmdbMovie of tmdbMovies) {
    // ... (ჩაწერის ლოგიკა) ...
    // ... (აქ მოხდება POSTGRES INSERT FAILED შეცდომა, თუ მონაცემები არასწორია)
  }

  console.log('--- Синхронизация завершена ---');
  console.log(`Успешно добавлено: ${moviesInserted}`);
  console.log(`Пропущено (нет плеера/ошибка): ${moviesFailed}`);
}