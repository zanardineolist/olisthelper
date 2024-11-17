import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/get-user');
        if (!res.ok) {
          throw new Error(`Erro ao buscar usuário: ${res.status} ${res.statusText}`);
        }
        const userData = await res.json();
        setUser(userData);
      } catch (err) {
        console.error('Erro ao buscar usuário:', err.message);
        setUser(null); // Definir usuário como null em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};
