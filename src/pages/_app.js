// --- ОБНОВЛЕННЫЙ ФАЙЛ ---
import '../styles/globals.css';

// --- ИЗМЕНЕНИЕ ЗДЕСЬ: ---
// ვაბრუნებთ Swiper-ის სრულ სტილებს
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
// --- ---

import Head from 'next/head';

// გლობალური სტილები (без изменений)
const GlobalStyles = () => (
  <style jsx global>{`
    /* Swiper სლაიდერისთვის სიმაღლის დაყენება */
    .hero-slider {
      height: 70vh; /* ეკრანის სიმაღლის 70% */
      min-height: 500px;
    }

    /* გრადიენტი სლაიდერის სურათებზე */
    .slider-gradient::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0;
      height: 100%;
      background: linear-gradient(to top, rgba(16, 20, 26, 1) 20%, rgba(16, 20, 26, 0.5) 50%, rgba(16, 20, 26, 0) 100%);
    }

    /* --- Swiper-ის ისრების სტილები --- */
    :root {
      --swiper-theme-color: #e50914; /* ბრენდის წითელი */
      --swiper-navigation-size: 30px; 
    }
    
    .hero-slider .swiper-button-next,
    .hero-slider .swiper-button-prev {
      color: white;
      background-color: rgba(0, 0, 0, 0.3);
      width: 50px;
      height: 50px;
      border-radius: 50%;
      transition: all 0.3s ease;
      transform: translateY(-50px);
    }
    .hero-slider .swiper-button-next:hover,
    .hero-slider .swiper-button-prev:hover {
      background-color: rgba(229, 9, 20, 0.8);
    }
    .hero-slider .swiper-button-next::after,
    .hero-slider .swiper-button-prev::after {
      font-size: 20px;
      font-weight: 900;
    }
    .hero-slider .swiper-button-next { right: 20px; }
    .hero-slider .swiper-button-prev { left: 20px; }

    .sub-swiper {
      position: relative;
      padding: 0 10px;
    }
    .sub-swiper .swiper-button-next,
    .sub-swiper .swiper-button-prev {
      color: white;
      background-color: rgba(0, 0, 0, 0.5);
      border-radius: 50%;
      width: 40px; 
      height: 40px;
      top: 50%;
      transform: translateY(-70%); 
      transition: all 0.3s ease;
    }
    .sub-swiper .swiper-button-next:hover,
    .sub-swiper .swiper-button-prev:hover {
      background-color: #e50914;
    }
    .sub-swiper .swiper-button-next::after,
    .sub-swiper .swiper-button-prev::after {
      font-size: 16px; 
      font-weight: 900;
    }
    .sub-swiper .swiper-button-next { right: 0; }
    .sub-swiper .swiper-button-prev { left: 0; }
    
    .swiper-slide {
      width: auto; /* აუცილებელია slidesPerView: 'auto'-სთვის */
    }
    
    /* ასპექტის თანაფარდობა */
     .aspect-2-3 {
        position: relative;
        padding-bottom: 150%; /* 2:3 */
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
    .aspect-square { {/* <-- Добавили для актеров */}
        position: relative;
        padding-bottom: 100%; /* 1:1 */
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
    
    /* ხაზების შეზღუდვა */
    .line-clamp-3 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
    }

    {/* --- НОВЫЕ СТИЛИ ДЛЯ МОДАЛА --- */}
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
    
    /* Класс для aspect-video (если Tailwind v2) */
    .aspect-video {
        position: relative;
        padding-bottom: 56.25%; /* 16:9 */
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