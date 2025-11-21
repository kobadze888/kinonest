import 'dotenv/config';

const KINOBD_API_URL = 'https://kinobd.net/api/films';

// 5 "რთული" ფილმი სატესტოდ
const TEST_MOVIES = [
    { title: "Убойная суббота", original: "The Saturday Night Strangler", year: 2025, imdb_id: "tt26345738" },
    { title: "Хищник: Планета смерти", original: "Predator: Badlands", year: 2025, imdb_id: "tt30141480" },
    { title: "Охота за тенью", original: "Bu feng zhui ying", year: 2025, imdb_id: "tt30321100" },
    { title: "Stand Your Ground", original: "Stand Your Ground", year: 2025, imdb_id: "tt31465733" }, // ეს თუ იპოვა, მაგარია
    { title: "Inception", original: "Inception", year: 2010, imdb_id: "tt1375666" } // საკონტროლო (ძველი ფილმი)
];

// პარამეტრები, რომლებსაც ვტესტავთ
const SEARCH_PATTERNS = [
    (m) => `imdb_id=${m.imdb_id}`,              // ცდა 1: IMDb ID
    (m) => `title=${encodeURIComponent(m.title)}`, // ცდა 2: title (რუსული)
    (m) => `name_russian=${encodeURIComponent(m.title)}`, // ცდა 3: name_russian
    (m) => `name_original=${encodeURIComponent(m.original)}`, // ცდა 4: name_original
    (m) => `q=${encodeURIComponent(m.title)}`   // ცდა 5: q (ზოგადი ძებნა)
];

async function test() {
    console.log("🕵️‍♂️ Kinobd ენდპოინტის დიაგნოსტიკა...");
    
    for (const movie of TEST_MOVIES) {
        console.log(`\n🎬 ვტესტავთ ფილმს: "${movie.title}" (${movie.year})`);
        
        for (const patternFn of SEARCH_PATTERNS) {
            const queryString = patternFn(movie);
            const url = `${KINOBD_API_URL}?${queryString}`;
            
            try {
                // console.log(`   👉 მოთხოვნა: ?${queryString}`);
                const res = await fetch(url);
                if (!res.ok) {
                    console.log(`      ❌ HTTP Error: ${res.status}`);
                    continue;
                }

                const data = await res.json();
                const items = data.data || [];
                
                if (items.length === 0) {
                    console.log(`      🔸 [${queryString}] -> ცარიელი შედეგი.`);
                } else {
                    // ვამოწმებთ პირველ შედეგს
                    const match = items[0];
                    
                    // არის თუ არა ეს ის ფილმი რაც გვინდა?
                    const isMatchID = match.imdb_id === movie.imdb_id;
                    const isMatchYear = Math.abs(parseInt(match.year) - movie.year) <= 1;
                    
                    // შრეკის დაცვა (ID 430)
                    if (parseInt(match.kinopoisk_id) === 430 && movie.title !== "Шрэк") {
                        console.log(`      ❌ [${queryString}] -> დააბრუნა "შრეკი" (ყალბი შედეგი).`);
                    } else if (isMatchID || (match.name_russian === movie.title && isMatchYear)) {
                        console.log(`      ✅ [${queryString}] -> ნაპოვნია! (ID: ${match.kinopoisk_id})`);
                    } else {
                        console.log(`      ⚠️ [${queryString}] -> სხვა ფილმი დააბრუნა: "${match.name_russian}" (${match.year})`);
                    }
                }
            } catch (e) {
                console.log(`      ❌ Error: ${e.message}`);
            }
        }
    }
}

test();