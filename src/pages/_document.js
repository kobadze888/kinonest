import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ru"> {/* ენა დაყენებულია რუსულზე */}
      <Head>
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