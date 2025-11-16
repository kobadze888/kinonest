// --- НОВЫЙ ФАЙЛ ---
import React, { useEffect } from 'react';

export default function TrailerModal({ isOpen, onClose, videoHtml, isLoading }) {
  // Добавляем эффект для закрытия модала по клавише Escape
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  // Функция для закрытия модала при клике на фон
  const handleBackdropClick = (e) => {
    // Закрываем, только если клик был именно по фону (а не по контенту)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      id="trailer-modal" 
      onClick={handleBackdropClick}
      className="modal-backdrop" // Стили из _app.js
    >
      {/* Кнопка закрытия */}
      <button 
        id="modal-close-btn" 
        onClick={onClose} 
        className="absolute top-4 right-6 text-white text-5xl font-bold hover:text-brand-red transition-colors z-[120]"
      >
        &times;
      </button>
      
      {/* Контейнер для плеера */}
      <div className="w-full max-w-4xl bg-black rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div id="video-container" className="aspect-video relative">
          {isLoading ? (
            // Спиннер (загрузка)
            <div className="flex items-center justify-center w-full h-full absolute inset-0">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-red"></div>
            </div>
          ) : (
            // Контент плеера (вставляется как HTML)
            // Мы используем div с aspect-video, чтобы YouTube iframe растянулся
            <div 
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: videoHtml }} 
            />
          )}
        </div>
      </div>
    </div>
  );
};