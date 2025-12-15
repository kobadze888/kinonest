import { useEffect } from 'react';
import Script from 'next/script';
import { SessionProvider } from "next-auth/react"; // <--- აუცილებელია!
import '../styles/globals.css';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

import Head from 'next/head';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
});

const GlobalStyles = () => (
  <style jsx global>{`
    :root {
      --font-inter: ${inter.style.fontFamily};
      --swiper-theme-color: #e50914;
      --swiper-pagination-bullet-inactive-color: #ffffff;
      --swiper-pagination-bullet-inactive-opacity: 0.4;
      --swiper-pagination-bullet-size: 8px;
      --swiper-pagination-bullet-horizontal-gap: 6px;
    }

    body {
      font-family: var(--font-inter), sans-serif;
      background-color: #10141A;
      overflow-x: hidden;
    }

    /* [აქ გრძელდება CSS სტილები] */
    .hero-slider {
      height: 60vh;
      min-height: 400px;
      position: relative;
    }
    @media (min-width: 768px) {
      .hero-slider {
        height: 85vh;
        max-height: 850px;
      }
    }
    .hero-slider .swiper:not(.swiper-initialized) .swiper-slide { display: none; }
    .hero-slider .swiper:not(.swiper-initialized) .swiper-slide:first-child { display: block; width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 10; }
    .hero-slider .swiper-pagination { position: absolute !important; bottom: 20px !important; left: 0 !important; right: 0 !important; width: 100% !important; display: flex !important; justify-content: center !important; align-items: center !important; z-index: 30 !important; pointer-events: none; margin: 0 !important; }
    @media (min-width: 768px) { .hero-slider .swiper-pagination { bottom: 32px !important; } }
    .swiper-pagination-bullet { display: block !important; width: 6px !important; height: 6px !important; background: rgba(255, 255, 255, 0.4) !important; opacity: 1 !important; margin: 0 4px !important; border-radius: 50%; transition: all 0.3s ease; pointer-events: auto; cursor: pointer; }
    @media (min-width: 768px) { .swiper-pagination-bullet { width: 8px !important; height: 8px !important; margin: 0 6px !important; } }
    .swiper-pagination-bullet-active { background: #e50914 !important; width: 20px !important; border-radius: 4px !important; }
    @media (min-width: 768px) { .swiper-pagination-bullet-active { width: 24px !important; border-radius: 4px !important; } }
    .slider-gradient::after { content: ''; position: absolute; inset: 0; background: linear-gradient( to top, #10141A 10%, rgba(16, 20, 26, 0.4) 50%, rgba(16, 20, 26, 0.1) 100% ); pointer-events: none; }
    .nav-btn-custom { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #d1d5db; transition: all 0.2s ease; cursor: pointer; z-index: 50; }
    @media (min-width: 768px) { .nav-btn-custom { width: 40px; height: 40px; } }
    .nav-btn-custom:hover:not(:disabled) { background-color: #e50914; border-color: #e50914; color: white; transform: translateY(-2px); }
    .nav-btn-custom:disabled { opacity: 0.3; cursor: not-allowed; }
    .swiper-button-next, .swiper-button-prev { display: none !important; }
    .aspect-square { position: relative; padding-bottom: 100%; height: 0; overflow: hidden; }
    .aspect-square img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
    .line-clamp-3 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
    .modal-backdrop { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.95); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; transition: opacity 0.3s ease; }
    .aspect-video { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; }
    .aspect-video iframe, .aspect-video > div { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
    .swiper:not(.swiper-initialized) .swiper-slide { margin-right: 16px; flex-shrink: 0; display: block; }
    @media (min-width: 768px) { .swiper:not(.swiper-initialized) .swiper-slide { margin-right: 24px; } }
    .swiper:not(.swiper-initialized) .swiper-slide:last-child { margin-right: 0; }
    .swiper:not(.swiper-initialized) .swiper-wrapper { display: flex; overflow: hidden; }
  `}</style>
);

function MyApp({ Component, pageProps: { session, ...pageProps } }) { // 💡 session დამატებულია
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      const isTV = /smart-tv|tizen|web0s|tv|viera|netcast|bravia|hisense|vidaa/.test(ua);

      if (isTV) {
        document.body.classList.add('is-smart-tv');
        console.log('📺 Smart TV Detected: Performance mode ON (Lite Version)');
      }
    }
  }, []);

  return (
    // 💡 SessionProvider აუცილებელია ადმინკისთვის!
    <SessionProvider session={session}>
      <main className={inter.className}>
        <Head>
          <title>KinoNest - Полный кинопортал</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        </Head>

        {/* --- GOOGLE ANALYTICS START --- */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}');
          `}
        </Script>
        {/* --- GOOGLE ANALYTICS END --- */}

        {/* --- YANDEX METRICA START --- */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
             (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
             m[i].l=1*new Date();
             for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
             k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
             (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

             ym(${process.env.NEXT_PUBLIC_YANDEX_METRICA}, "init", {
                  clickmap:true,
                  trackLinks:true,
                  accurateTrackBounce:true,
                  webvisor:true
             });
          `}
        </Script>
        {/* --- YANDEX METRICA END --- */}

        <GlobalStyles />
        <Component {...pageProps} />
      </main>
    </SessionProvider>
  );
}

export default MyApp;