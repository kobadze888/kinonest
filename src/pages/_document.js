import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ru">
      <Head>
        {/* Favicon - SVG (თანამედროვე ბრაუზერებისთვის) */}
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        
        {/* Favicon - აი აქ ვამატებთ */}
        <link rel="icon" href="/favicon.png" sizes="any" />
        
        {/* Google Font: Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      </Head>
      <body className="bg-[#10141A] text-white font-sans">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}