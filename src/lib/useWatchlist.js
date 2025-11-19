// src/lib/useWatchlist.js (სრული სინქრონიზაციით)
import { useState, useEffect, useCallback } from 'react';

const WATCHLIST_KEY = 'kinonest_watchlist';

// სპეციალური ივენთის სახელი, რომლითაც კომპონენტები ერთმანეთს დაელაპარაკებიან
const EVENT_NAME = 'watchlist_updated';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState([]);

  // დამხმარე ფუნქცია მონაცემების წასაკითხად
  const loadWatchlist = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      } else {
        setWatchlist([]); // თუ ცარიელია, გასუფთავდეს
      }
    } catch (error) {
      console.error("Error loading watchlist:", error);
    }
  }, []);

  // 1. ინიციალიზაცია და მოსმენა (Listen)
  useEffect(() => {
    loadWatchlist(); // პირველი ჩატვირთვა

    // ვუსმენთ ჩვენს ივენთს (როცა სხვა კომპონენტი ცვლის სიას)
    const handleLocalUpdate = () => loadWatchlist();
    
    // ვუსმენთ "storage" ივენთს (როცა სხვა ტაბში იცვლება სია)
    const handleStorageUpdate = (e) => {
      if (e.key === WATCHLIST_KEY) loadWatchlist();
    };

    window.addEventListener(EVENT_NAME, handleLocalUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleLocalUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [loadWatchlist]);

  // 2. დამატება/წაშლა (პირდაპირ LocalStorage-თან მუშაობს)
  const toggleItem = useCallback((tmdbId) => {
    if (typeof window === 'undefined') return;

    const itemId = String(tmdbId);
    
    // მნიშვნელოვანი: ყოველთვის ვიღებთ ახალ სიას პირდაპირ საცავიდან
    // (რათა სწრაფად დაჭერისას ძველი მონაცემები არ გადაეწეროს)
    let currentList = [];
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) currentList = JSON.parse(stored);
    } catch (e) {}

    const isCurrentlyInList = currentList.includes(itemId);
    let newList;

    if (isCurrentlyInList) {
      newList = currentList.filter(id => id !== itemId);
    } else {
      newList = [...currentList, itemId];
    }
    
    // ვინახავთ განახლებულს
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newList));
    
    // ვატყობინებთ ყველა კომპონენტს (Header-ს, სხვა Card-ებს)
    window.dispatchEvent(new Event(EVENT_NAME));
    
  }, []);

  // 3. სტატუსის შემოწმება
  const isInWatchlist = useCallback((tmdbId) => {
    return watchlist.includes(String(tmdbId));
  }, [watchlist]);

  return { watchlist, toggleItem, isInWatchlist };
}