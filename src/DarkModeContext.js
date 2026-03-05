import React, { createContext, useContext, useState, useEffect } from 'react';

const DarkModeContext = createContext();

export const useDarkMode = () => useContext(DarkModeContext);

export const DarkModeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const updateTextColors = () => {
    if (document.body.classList.contains('dark-mode')) {
      document.querySelectorAll('[style*="color: #1c1c1e"], [style*="color: rgb(28, 28, 30)"]').forEach(el => {
        el.style.color = '#ffffff';
      });
      document.querySelectorAll('[style*="color: #8e8e93"], [style*="color: rgb(142, 142, 147)"]').forEach(el => {
        el.style.color = '#98989d';
      });
    }
  };

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      // Update colors immediately and after a delay for dynamic content
      updateTextColors();
      setTimeout(updateTextColors, 100);
      setTimeout(updateTextColors, 500);
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Run on mount if dark mode is already enabled
  useEffect(() => {
    if (isDarkMode) {
      updateTextColors();
      // Set up observer for dynamic content
      const observer = new MutationObserver(() => {
        updateTextColors();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};
