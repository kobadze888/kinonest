import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ru">
      <Head>
        {/* 1. SVG - მთავარი ხატულა (სკალირებადი, საუკეთესოა ხარისხისთვის) */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
        
        {/* 2. PNG - სარეზერვო (Google-ისთვის და ძველი ბრაუზერებისთვის) */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        
        {/* 3. Apple Devices - აუცილებელია iOS-ისთვის (Home Screen-ზე დამატებისას) */}
        <link rel="apple-touch-icon" href="/favicon.png" />
        
        {/* Google Fonts - შესწორებული crossOrigin */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <body className="bg-[#10141A] text-white font-sans">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}