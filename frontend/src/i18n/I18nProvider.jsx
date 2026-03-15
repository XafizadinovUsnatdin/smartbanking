import React, { createContext, useContext, useMemo, useState } from "react";
import { translations } from "./translations";

const I18nContext = createContext({
  lang: "uz",
  setLang: () => {},
  t: (key) => key
});

function getNested(obj, key) {
  return key.split(".").reduce((acc, part) => (acc && acc[part] != null ? acc[part] : null), obj);
}

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("lang") || "uz");

  const setLang = (next) => {
    const safe = next === "en" ? "en" : "uz";
    setLangState(safe);
    localStorage.setItem("lang", safe);
  };

  const value = useMemo(() => {
    const dict = translations[lang] || translations.uz;
    const fallback = translations.uz;
    const t = (key, params) => {
      const raw = getNested(dict, key) ?? getNested(fallback, key) ?? key;
      return typeof raw === "string" ? interpolate(raw, params) : String(raw);
    };
    return { lang, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

