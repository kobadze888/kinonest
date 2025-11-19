import React from 'react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
        start = 2;
      }
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex justify-center items-center gap-2 mt-12 select-none flex-wrap">
       {/* ღილაკი უკან */}
       <button
         disabled={currentPage === 1}
         onClick={() => onPageChange(currentPage - 1)}
         className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors border border-gray-700 ${
           currentPage === 1 
             ? 'text-gray-600 cursor-not-allowed border-gray-800' 
             : 'text-white hover:bg-gray-800 hover:border-gray-600'
         }`}
       >
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
         </svg>
       </button>

       {/* ციფრები */}
       {pages.map((p, idx) => (
         p === '...' ? (
           <span key={`dots-${idx}`} className="text-gray-500 px-1">...</span>
         ) : (
           <button
             key={idx}
             onClick={() => onPageChange(p)}
             className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
               currentPage === p
                 ? 'bg-brand-red text-white border border-brand-red shadow-lg shadow-brand-red/20'
                 : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
             }`}
           >
             {p}
           </button>
         )
       ))}

       {/* ღილაკი წინ */}
       <button
         disabled={currentPage === totalPages}
         onClick={() => onPageChange(currentPage + 1)}
         className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors border border-gray-700 ${
            currentPage === totalPages 
             ? 'text-gray-600 cursor-not-allowed border-gray-800' 
             : 'text-white hover:bg-gray-800 hover:border-gray-600'
         }`}
       >
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
         </svg>
       </button>
    </div>
  );
}