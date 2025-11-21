// src/pages/_app.js
import '../styles/globals.css';

// Swiper-ის სრული სტილები
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

import Head from 'next/head';

const GlobalStyles = () => (
  <style jsx global>{`
    /* Swiper სლაიდერისთვის სიმაღლის დაყენება */
    .hero-slider {
      height: 70vh;
      min-height: 500px;
    }

    /* --- 💡 Swiper Initialization Fix (შესწორებული) --- */
    /* შეცდომა გასწორდა: ვამოწმებთ არა .hero-slider-ს, არამედ მის შიგნით მყოფ .swiper-ს.
       სანამ .swiper არ ჩაიტვირთება (არ ექნება .swiper-initialized), დამალე სლაიდები.
    */
    .hero-slider .swiper:not(.swiper-initialized) .swiper-slide {
      display: none;
    }
    /* პირველი სლაიდი გამოჩნდეს, რომ სიცარიელე არ იყოს */
    .hero-slider .swiper:not(.swiper-initialized) .swiper-slide:first-child {
      display: block;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 10;
    }
    /* --------------------------------------------------------- */

    /* გრადიენტი სლაიდერის სურათებზე */
    .slider-gradient::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0;
      height: 100%;
      background: linear-gradient(to top, rgba(16, 20, 26, 1) 20%, rgba(16, 20, 26, 0.5) 50%, rgba(16, 20, 26, 0) 100%);
    }

    /* --- Hero Slider: ისრების გასწორება --- */
    :root {
      --swiper-theme-color: #e50914;
    }
    
    /* ღილაკის კონტეინერი */
    .hero-slider .swiper-button-next,
    .hero-slider .swiper-button-prev {
      background-color: rgba(0, 0, 0, 0.5);
      width: 44px !important;  
      height: 44px !important; 
      border-radius: 50%;
      transition: all 0.3s ease;
      top: 50%;
      transform: translateY(-50%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white; 
    }

    .hero-slider .swiper-button-next:hover,
    .hero-slider .swiper-button-prev:hover {
      background-color: #e50914;
      border-color: #e50914;
    }

    /* ვმალავთ დეფოლტ ფსევდო-ელემენტებს */
    .hero-slider .swiper-button-next::after,
    .hero-slider .swiper-button-prev::after {
      display: none !important;
      content: '' !important;
    }

    /* ვასწორებთ SVG ზომას */
    .hero-slider .swiper-button-next svg,
    .hero-slider .swiper-button-prev svg {
      width: 18px !important;
      height: 18px !important;
      color: white !important;
      fill: white !important;
    }

    .hero-slider .swiper-button-next { right: 20px; }
    .hero-slider .swiper-button-prev { left: 20px; }


    /* --- Sub Swiper (ქვედა კარუსელების) ისრები --- */
    .sub-swiper {
      position: relative;
      padding: 0 10px;
    }
    .sub-swiper .swiper-button-next,
    .sub-swiper .swiper-button-prev {
      background-color: rgba(20, 20, 20, 0.8);
      border-radius: 50%;
      width: 36px !important;
      height: 36px !important;
      top: 50%;
      transform: translateY(-70%); 
      transition: all 0.3s ease;
      border: 1px solid rgba(255,255,255,0.1);
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .sub-swiper .swiper-button-next:hover,
    .sub-swiper .swiper-button-prev:hover {
      background-color: #e50914;
      border-color: #e50914;
    }

    .sub-swiper .swiper-button-next::after,
    .sub-swiper .swiper-button-prev::after {
      display: none !important;
    }
    .sub-swiper .swiper-button-next svg,
    .sub-swiper .swiper-button-prev svg {
      width: 14px !important;
      height: 14px !important;
      color: white !important;
      fill: white !important;
    }

    .sub-swiper .swiper-button-next { right: 0; }
    .sub-swiper .swiper-button-prev { left: 0; }
    
    .swiper-slide {
      width: auto;
    }
    
    /* დანარჩენი სტილები */
     .aspect-2-3 {
        position: relative;
        padding-bottom: 150%;
        height: 0;
        overflow: hidden;
    }
    .aspect-2-3 img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
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
      background-color: rgba(0, 0, 0, 0.8);
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
    }
  `}</style>
);

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>KinoNest - Полный кинопортал</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <GlobalStyles />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;