import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(localStorage.getItem('urbaneye_lang') || 'English');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setEmailVerified(user?.emailVerified || false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshVerification = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setEmailVerified(auth.currentUser.emailVerified);
    }
  };

  const changeLanguage = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('urbaneye_lang', newLang);
  };

  const value = {
    currentUser,
    loading,
    isEmailVerified: emailVerified,
    refreshVerification,
    language,
    changeLanguage,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
