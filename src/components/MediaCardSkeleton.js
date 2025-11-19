// src/components/MediaCardSkeleton.js
import React from 'react';

export default function MediaCardSkeleton() {
  return (
    <div className="block w-full">
      <div className="rounded-lg overflow-hidden shadow-xl bg-gray-900 animate-pulse">
        
        {/* პოსტერის ადგილი (Aspect Ratio 2:3) */}
        <div className="aspect-2-3 relative bg-gray-800">
          {/* აიქონების ადგილები */}
          <div className="absolute top-2 left-2 w-12 h-6 bg-gray-700 rounded-full"></div>
          <div className="absolute top-2 right-2 w-10 h-6 bg-gray-700 rounded-md"></div>
          <div className="absolute bottom-2 left-2 w-10 h-6 bg-gray-700 rounded-md"></div>
        </div>
        
        {/* სათაურის ადგილი */}
        <div className="p-3">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        </div>

      </div>
    </div>
  );
}