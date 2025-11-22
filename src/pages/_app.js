import '../styles/globals.css';

// Swiper-ის სრული სტილები
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

    /* --- HERO SLIDER STYLES --- */
    .hero-slider {
      height: 75vh; 
      min-height: 500px;
      max-height: 850px;
      position: relative;
    }
    
    /* სლაიდების დამალვა ინიციალიზაციამდე */
    .hero-slider .swiper:not(.swiper-initialized) .swiper-slide {
      display: none;
    }
    /* პირველი სლაიდის ჩვენება ინიციალიზაციამდე */
    .hero-slider .swiper:not(.swiper-initialized) .swiper-slide:first-child {
      display: block;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 10;
    }

    /* 💡 FIX: დოტების სტაბილური პოზიცია */
    /* ეს სტილი მუშაობს JS-ის გარეშეც */
    .hero-slider .swiper-pagination {
      position: absolute !important;
      bottom: 32px !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 30 !important;
      pointer-events: none;
      margin: 0 !important;
    }

    /* 💡 FIX: დოტების ვიზუალი */
    .swiper-pagination-bullet {
      display: block !important; /* აუცილებელია */
      width: 8px !important;
      height: 8px !important;
      background: rgba(255, 255, 255, 0.4) !important;
      opacity: 1 !important;
      margin: 0 6px !important;
      border-radius: 50%;
      transition: all 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
    }

    .swiper-pagination-bullet-active {
      background: #e50914 !important;
      width: 24px !important;
      border-radius: 4px !important;
    }

    .slider-gradient::after {
      content: ''; 
      position: absolute; 
      inset: 0;
      background: linear-gradient(
        to top, 
        #10141A 10%, 
        rgba(16, 20, 26, 0.4) 50%, 
        rgba(16, 20, 26, 0.1) 100%
      );
      pointer-events: none;
    }

    /* --- CUSTOM NAVIGATION BUTTONS --- */
    .nav-btn-custom {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #d1d5db;
      transition: all 0.2s ease;
      cursor: pointer;
      z-index: 50;
    }

    .nav-btn-custom:hover:not(:disabled) {
      background-color: #e50914;
      border-color: #e50914;
      color: white;
      transform: translateY(-2px);
    }

    .nav-btn-custom:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .swiper-button-next,
    .swiper-button-prev {
      display: none !important;
    }

    /* --- UTILITY CLASSES --- */
    .aspect-square { 
        position: relative;
        padding-bottom: 100%;
        height: 0;
        overflow: hidden;
    }
    .aspect-square img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .line-clamp-3 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.95);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
      transition: opacity 0.3s ease;
    }
    
    .aspect-video {
        position: relative;
        padding-bottom: 56.25%;
        height: 0;
        overflow: hidden;
    }
    .aspect-video iframe,
    .aspect-video > div {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    /* --- FIX: SWIPER LAYOUT SHIFT --- */
    .swiper:not(.swiper-initialized) .swiper-slide {
      margin-right: 24px; 
      flex-shrink: 0;     
      display: block;     
    }
    
    .swiper:not(.swiper-initialized) .swiper-slide:last-child {
      margin-right: 0;
    }
    
    .swiper:not(.swiper-initialized) .swiper-wrapper {
      display: flex;
      overflow: hidden; 
    }

  `}</style>
);

function MyApp({ Component, pageProps }) {
  return (
    <main className={inter.className}>
      <Head>
        <title>KinoNest - Полный кинопортал</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <GlobalStyles />
      <Component {...pageProps} />
    </main>
  );
}

export default MyApp;