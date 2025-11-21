// src/pages/_app.js
import '../styles/globals.css';

// Swiper-ის აუცილებელი სტილები
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

import Head from 'next/head';

const GlobalStyles = () => (
  <style jsx global>{`
    :root {
      --swiper-theme-color: #e50914;
      --swiper-pagination-bullet-inactive-color: #ffffff;
      --swiper-pagination-bullet-inactive-opacity: 0.4;
      --swiper-pagination-bullet-size: 8px;
      --swiper-pagination-bullet-horizontal-gap: 6px;
    }

    /* მთავარი გასწორება: სქროლი არ უნდა გავიდეს გვერდზე */
    body {
      background-color: #10141A;
      overflow-x: hidden;
      width: 100%;
    }

    /* =========================================
       HERO SLIDER STYLES
       ========================================= */
    .hero-slider {
      height: 80vh; /* ოპტიმალური სიმაღლე */
      min-height: 550px;
      max-height: 900px;
    }

    /* პირველი სლაიდის ციმციმის თავიდან აცილება */
    .hero-slider .swiper:not(.swiper-initialized) .swiper-slide {
      display: none;
    }
    .hero-slider .swiper:not(.swiper-initialized) .swiper-slide:first-child {
      display: block;
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
    }

    /* Hero Gradient */
    .slider-gradient::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to top, 
        #10141A 5%, 
        rgba(16, 20, 26, 0.8) 30%, 
        rgba(16, 20, 26, 0.2) 60%, 
        rgba(16, 20, 26, 0.3) 100%
      );
      pointer-events: none;
    }

    /* Pagination Dots - Active State */
    .swiper-pagination-bullet-active {
      background: #e50914 !important;
      width: 24px !important;
      border-radius: 4px !important;
      transition: width 0.3s ease;
    }

    /* =========================================
       MEDIA CAROUSEL NAVIGATION BUTTONS
       ========================================= */
    
    .nav-btn-custom {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background-color: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #9ca3af;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .nav-btn-custom:hover:not(:disabled) {
      background-color: #e50914;
      border-color: #e50914;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(229, 9, 20, 0.4);
    }

    .nav-btn-custom:active:not(:disabled) {
      transform: translateY(0);
    }

    .nav-btn-custom:disabled {
      opacity: 0.2;
      cursor: not-allowed;
      border-color: transparent;
    }

    /* ვმალავთ დეფოლტ ღილაკებს, რომ არ გამოჩნდეს */
    .swiper-button-next, 
    .swiper-button-prev {
      display: none !important;
    }

    /* =========================================
       ANIMATIONS
       ========================================= */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* =========================================
       UTILITIES
       ========================================= */
    .aspect-2-3 {
        position: relative;
        padding-bottom: 150%;
        height: 0;
        overflow: hidden;
    }
    .aspect-square { 
        position: relative;
        padding-bottom: 100%;
        height: 0;
        overflow: hidden;
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
    }
    .aspect-video {
        position: relative;
        padding-bottom: 56.25%;
        height: 0;
        overflow: hidden;
    }
    .aspect-video iframe {
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
        <title>KinoNest - ონლაინ კინოთეატრი</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <GlobalStyles />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;