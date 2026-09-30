import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const clientTranslationCache = {};

export default function TranslatedText({ title, description, children }) {
  const { language } = useAuth();
  const [translated, setTranslated] = useState({ title, description });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!language || language === 'English') {
      setTranslated({ title, description });
      return;
    }

    const cacheKey = `${title}||${description}||${language}`;
    if (clientTranslationCache[cacheKey]) {
      setTranslated(clientTranslationCache[cacheKey]);
      return;
    }

    let isMounted = true;
    const performTranslation = async () => {
      setLoading(true);
      try {
        const response = await api.post('/api/public/translate', {
          title,
          description,
          targetLanguage: language
        });
        if (isMounted && response.data) {
          const result = {
            title: response.data.title || title,
            description: response.data.description || description
          };
          clientTranslationCache[cacheKey] = result;
          setTranslated(result);
        }
      } catch (err) {
        console.error('Translation failed:', err);
        if (isMounted) {
          setTranslated({ title, description });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    performTranslation();

    return () => {
      isMounted = false;
    };
  }, [title, description, language]);

  return children(translated, loading);
}
