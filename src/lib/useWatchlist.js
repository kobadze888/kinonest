// src/lib/useWatchlist.js
import { useState, useEffect, useCallback } from 'react';

const WATCHLIST_KEY = 'kinonest_watchlist';

export function useWatchlist() {
  // 1. იტვირთება ლოკალური მონაცემები
  const [watchlist, setWatchlist] = useState([]);

  // 2. useEffect: იტვირთება ლოკალური მონაცემები საიტის გახსნისას
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        // ვინახავთ მხოლოდ ID-ებს
        setWatchlist(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading watchlist from localStorage", error);
    }
  }, []);

  // 3. useCallback: ფილმის დამატება/წაშლა
  const toggleItem = useCallback((tmdbId) => {
    setWatchlist(prevList => {
      const itemId = String(tmdbId); // ვამუშავებთ როგორც სტრინგს
      const isCurrentlyInList = prevList.includes(itemId);
      let newList;

      if (isCurrentlyInList) {
        newList = prevList.filter(id => id !== itemId);
      } else {
        newList = [...prevList, itemId];
      }
      
      // ლოკალურად ვინახავთ განახლებულ სიას
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newList));
      return newList;
    });
  }, []);

  // 4. სტატუსის შემოწმება
  const isInWatchlist = useCallback((tmdbId) => {
    return watchlist.includes(String(tmdbId));
  }, [watchlist]);

  return { watchlist, toggleItem, isInWatchlist };
}