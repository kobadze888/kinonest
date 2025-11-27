import Head from 'next/head';
import { useRouter } from 'next/router';

export default function SeoHead({ 
  title, 
  description, 
  image, 
  type = 'website', 
  releaseYear,
  rating
}) {
  const router = useRouter();
  
  // 💡 შეცვალეთ ეს თქვენი რეალური დომენით (მაგ: https://kinonest.ge)
  const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://kinonest.vercel.app';
  
  const canonicalUrl = `${domain}${router.asPath.split('?')[0]}`;
  const siteName = "KinoNest";

  // 🔥 დინამიური წელი: იღებს სერვერის/ბრაუზერის მიმდინარე წელს (2025, 2026...)
  const currentYear = new Date().getFullYear();
  
  // 🚀 SEO სათაური
  // თუ კონკრეტული ფილმის წელი (releaseYear) გვაქვს, ვწერთ იმას.
  // თუ არ გვაქვს (მაგალითად ჟანრების გვერდზე), ვწერთ მიმდინარე წელს (currentYear).
  const fullTitle = title 
    ? `${title} (${releaseYear || currentYear}) смотреть онлайн бесплатно в хорошем качестве | ${siteName}`
    : `${siteName} - Фильмы и сериалы онлайн бесплатно в HD`;

  // 🚀 SEO აღწერა
  const cleanDescription = description ? description.replace(/<[^>]*>?/gm, '') : '';
  const finalDesc = description 
    ? `Смотреть ${title} онлайн в HD 1080p. ${cleanDescription.slice(0, 130)}... Бесплатно.`
    : `Онлайн кинотеатр KinoNest. Смотрите новинки кино и сериалов ${currentYear} года бесплатно в высоком качестве HD 1080p.`;

  const imageUrl = image && image.startsWith('/') ? `${domain}${image}` : image;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={finalDesc} />
      <meta name="keywords" content={`смотреть онлайн, ${title || ''}, бесплатно, в хорошем качестве, hd 1080, фильмы ${releaseYear || currentYear}`} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content="ru_RU" />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDesc} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      
      {/* Robots */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      
      <meta name="theme-color" content="#e50914" />
    </Head>
  );
}