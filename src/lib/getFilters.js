import { query } from './db';

const countryEnToRuMap = {
  "United States of America": "США",
  "Russian Federation": "Россия", 
  "Russia": "Россия",
  "United Kingdom": "Великобритания",
  "France": "Франция",
  "Japan": "Япония",
  "South Korea": "Южная Корея",
  "Germany": "Германия",
  "China": "Китай",
  "Canada": "Канада",
  "Australia": "Австралия",
  "India": "Индия",
  "Spain": "Испания",
  "Italy": "Италия",
  "Mexico": "Мексика",
  "Brazil": "Бразилия",
  "Turkey": "Турция",
  "Sweden": "Швеция",
  "Denmark": "Дания",
  "Norway": "Норвегия",
  "Ukraine": "Украина",
  "Belarus": "Беларусь",
  "Kazakhstan": "Казахстан"
};

// ეს ფუნქცია აბრუნებს უნიკალურ ჟანრებს და ქვეყნებს ბაზიდან
export async function getDynamicFilters() {
  try {
    const [dbCountriesRes, dbGenresRes] = await Promise.all([
      query(`SELECT DISTINCT UNNEST(countries) AS country FROM media WHERE countries IS NOT NULL AND countries <> '{}' ORDER BY country`),
      query(`SELECT DISTINCT UNNEST(genres_names) AS genre FROM media WHERE genres_names IS NOT NULL AND genres_names <> '{}' ORDER BY genre`)
    ]);

    const genres = dbGenresRes.rows.map(row => {
      const g = row.genre;
      return g.charAt(0).toUpperCase() + g.slice(1); 
    });

    // 💡 ქვეყნების დუბლიკატების გასწორება (Map-ის გამოყენებით)
    const uniqueCountriesMap = new Map();

    dbCountriesRes.rows.forEach(row => {
        const enName = row.country;
        const ruName = countryEnToRuMap[enName] || enName; 
        
        // ვინახავთ მხოლოდ ერთხელ თითოეულ რუსულ სახელზე
        if (!uniqueCountriesMap.has(ruName)) {
            uniqueCountriesMap.set(ruName, { en: enName, ru: ruName });
        }
    });

    // Map-იდან გადაგვყავს მასივში და ვალაგებთ ანბანის მიხედვით
    const countries = Array.from(uniqueCountriesMap.values());
    countries.sort((a, b) => a.ru.localeCompare(b.ru));

    return { genres, countries };

  } catch (error) {
    console.error("Error fetching filters:", error);
    return { genres: [], countries: [] };
  }
}