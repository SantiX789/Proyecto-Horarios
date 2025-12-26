import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // 1. Buscamos si el usuario ya tenía una preferencia guardada
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('appTheme') || 'light';
  });

  // 2. Cada vez que 'theme' cambia, actualizamos el <body> y guardamos
  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  // 3. Función para cambiar entre modos
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizado para usarlo fácil en cualquier componente
export const useTheme = () => useContext(ThemeContext);