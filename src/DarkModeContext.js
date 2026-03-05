import React, { createContext, useContext, useState, useEffect } from 'react';

const DarkModeContext = createContext();

export const useDarkMode = () => useContext(DarkModeContext);

export const DarkModeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      // Force update all text colors
      setTimeout(() => {
        document.querySelectorAll('[style*="color: #1c1c1e"], [style*="color: rgb(28, 28, 30)"]').forEach(el => {
          el.style.color = '#ffffff';
        });
        document.querySelectorAll('[style*="color: #8e8e93"], [style*="color: rgb(142, 142, 147)"]').forEach(el => {
          el.style.color = '#98989d';
        });
      }, 100);
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};
