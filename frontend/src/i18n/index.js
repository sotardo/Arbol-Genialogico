import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Español
import esCommon from "./locales/es/common.json";
import esHome from "./locales/es/home.json";
import esTree from "./locales/es/tree.json";
import esProfile from "./locales/es/profile.json";

// English
import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enTree from "./locales/en/tree.json";
import enProfile from "./locales/en/profile.json";

// Português
import ptCommon from "./locales/pt/common.json";
import ptHome from "./locales/pt/home.json";
import ptTree from "./locales/pt/tree.json";
import ptProfile from "./locales/pt/profile.json";

// Italiano
import itCommon from "./locales/it/common.json";
import itHome from "./locales/it/home.json";
import itTree from "./locales/it/tree.json";
import itProfile from "./locales/it/profile.json";

// Polski
import plCommon from "./locales/pl/common.json";
import plHome from "./locales/pl/home.json";
import plTree from "./locales/pl/tree.json";
import plProfile from "./locales/pl/profile.json";

// עברית (Hebrew)
import heCommon from "./locales/he/common.json";
import heHome from "./locales/he/home.json";
import heTree from "./locales/he/tree.json";
import heProfile from "./locales/he/profile.json";

const resources = {
  es: {
    common: esCommon,
    home: esHome,
    tree: esTree,
    profile: esProfile,
  },
  en: {
    common: enCommon,
    home: enHome,
    tree: enTree,
    profile: enProfile,
  },
  pt: {
    common: ptCommon,
    home: ptHome,
    tree: ptTree,
    profile: ptProfile,
  },
  it: {
    common: itCommon,
    home: itHome,
    tree: itTree,
    profile: itProfile,
  },
  pl: {
    common: plCommon,
    home: plHome,
    tree: plTree,
    profile: plProfile,
  },
  he: {
    common: heCommon,
    home: heHome,
    tree: heTree,
    profile: heProfile,
  },
};

// Obtener idioma guardado o usar español por defecto
const savedLanguage = localStorage.getItem("language") || "es";

// Aplicar RTL si es hebreo
if (savedLanguage === "he") {
  document.documentElement.dir = "rtl";
} else {
  document.documentElement.dir = "ltr";
}

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: "es",
  defaultNS: "common",
  ns: ["common", "home", "tree", "profile"],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;