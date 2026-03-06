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
      // Dark mode - change to white
      document.querySelectorAll('[style*="color: #1c1c1e"], [style*="color: rgb(28, 28, 30)"]').forEach(el => {
        el.setAttribute('data-original-color', el.style.color);
        el.style.color = '#ffffff';
      });
      document.querySelectorAll('[style*="color: #8e8e93"], [style*="color: rgb(142, 142, 147)"]').forEach(el => {
        el.setAttribute('data-original-color', el.style.color);
        el.style.color = '#98989d';
      });
      // Fix grid cards and destination modal
      document.querySelectorAll('div[style*="fontSize: \'13px\'"]').forEach(el => {
        if (el.style.color === 'rgb(28, 28, 30)' || el.style.color === '#1c1c1e') {
          el.setAttribute('data-original-color', el.style.color);
          el.style.color = '#ffffff';
        }
      });
      document.querySelectorAll('div[style*="fontSize: \'15px\'"]').forEach(el => {
        if (el.style.color === 'rgb(28, 28, 30)' || el.style.color === '#1c1c1e') {
          el.setAttribute('data-original-color', el.style.color);
          el.style.color = '#ffffff';
        }
      });
    } else {
      // Light mode - restore original colors
      document.querySelectorAll('[data-original-color]').forEach(el => {
        const original = el.getAttribute('data-original-color');
        if (original) {
          el.style.color = original;
        }
        el.removeAttribute('data-original-color');
      });
    }
  };

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    // Update colors immediately and after delays
    updateTextColors();
    setTimeout(updateTextColors, 100);
    setTimeout(updateTextColors, 500);
  }, [isDarkMode]);

  // Run on mount and watch for dynamic content
  useEffect(() => {
    updateTextColors();
    const observer = new MutationObserver(() => {
      updateTextColors();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};
