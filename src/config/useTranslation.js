import { useAuth } from '../context/AuthContext';
import { translations } from './translations';

export const useTranslation = () => {
  const { language } = useAuth();

  const t = (key, defaultText) => {
    const langDict = translations[language];
    if (langDict && langDict[key] !== undefined) {
      return langDict[key];
    }
    return defaultText || key;
  };

  return { t, language };
};
