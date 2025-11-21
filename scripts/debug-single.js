// scripts/debug-single.js
// ტესტირება კონკრეტულ ფილმზე: სად იკარგება კავშირი?

import 'dotenv/config';

const KINOBD_API_URL = 'https://kinobd.net/api/films';
const KP_UNOFFICIAL_KEY = 'e3b79230-6f92-42d6-854a-06530a68e352'; 

// 👇 შეცვალეთ ეს მონაცემები იმ ფილმით, რომელსაც ტესტავთ
const TEST_DATA = {
    imdb_id: "tt26345738",      // მაგ: "The Black Phone 2" (ან რაც გინდათ)
    known_kp_id: 5445185,       // ID, რომელიც იცით რომ Kinobd-ზეა (თუ იცით)
    title_ru: "Чёрный телефон 2",
    year: 2025
};

async function test() {
    console.log(`\n🔍 დიაგნოსტიკა იწყება: "${TEST_DATA.title_ru}" (${TEST_DATA.year})`);
    console.log(`   IMDb ID: ${TEST_DATA.imdb_id}`);
    console.log(`   Known KP ID: ${TEST_DATA.known_kp_id}`);
    console.log('-'.repeat(50));

    // 1. ვეძებთ Kinobd-ზე IMDb ID-ით
    console.log(`\n1️⃣  Kinobd ძებნა IMDb ID-ით (${TEST_DATA.imdb_id})...`);
    try {
        const res = await fetch(`${KINOBD_API_URL}?imdb_id=${TEST_DATA.imdb_id}`);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            console.log(`   ✅ ნაპოვნია! Kinopoisk ID: ${data.data[0].kinopoisk_id}`);
        } else {
            console.log(`   ❌ ვერ მოიძებნა.`);
        }
    } catch (e) { console.log(`   ❌ Error: ${e.message}`); }


    // 2. ვეძებთ Kinobd-ზე KP ID-ით (თუ ვიცით)
    if (TEST_DATA.known_kp_id) {
        console.log(`\n2️⃣  Kinobd ძებნა KP ID-ით (${TEST_DATA.known_kp_id})...`);
        try {
            const res = await fetch(`${KINOBD_API_URL}?kinopoisk_id=${TEST_DATA.known_kp_id}`);
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                console.log(`   ✅ ნაპოვნია! (სახელი: ${data.data[0].name_russian})`);
            } else {
                console.log(`   ❌ ვერ მოიძებნა (API-ში არ ჩანს, თუმცა პლეერი შეიძლება მუშაობდეს).`);
            }
        } catch (e) { console.log(`   ❌ Error: ${e.message}`); }
    }

    // 3. ვეძებთ Kinobd-ზე სახელით
    console.log(`\n3️⃣  Kinobd ძებნა სახელით ("${TEST_DATA.title_ru}")...`);
    try {
        const res = await fetch(`${KINOBD_API_URL}?name_russian=${encodeURIComponent(TEST_DATA.title_ru)}`);
        const data = await res.json();
        const match = data.data?.find(d => parseInt(d.year) === TEST_DATA.year);
        
        if (match) {
            console.log(`   ✅ ნაპოვნია! KP ID: ${match.kinopoisk_id}`);
        } else {
            console.log(`   ❌ ვერ მოიძებნა (სხვა წლები: ${data.data?.map(d => d.year).join(', ') || 'არ არის'})`);
        }
    } catch (e) { console.log(`   ❌ Error: ${e.message}`); }


    // 4. ვამოწმებთ გარე API-ს (Kinopoisk Unofficial)
    console.log(`\n4️⃣  KP Unofficial API (IMDb -> KP ID კონვერტაცია)...`);
    try {
        const url = `https://kinopoiskapiunofficial.tech/api/v2.2/films?imdbId=${TEST_DATA.imdb_id}`;
        const res = await fetch(url, { 
            headers: { 'X-API-KEY': KP_UNOFFICIAL_KEY, 'Content-Type': 'application/json' } 
        });
        
        if (res.status === 402 || res.status === 429) {
            console.log(`   ⚠️ ლიმიტი ამოწურულია (402/429).`);
        } else {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                console.log(`   ✅ API-მ დააბრუნა KP ID: ${data.items[0].kinopoiskId}`);
            } else {
                console.log(`   ❌ API-მ ვერ იპოვა KP ID ამ IMDb-ისთვის.`);
            }
        }
    } catch (e) { console.log(`   ❌ Error: ${e.message}`); }

    console.log('\n🏁 ტესტი დასრულდა.');
}

test();