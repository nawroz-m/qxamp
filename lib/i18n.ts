"use client"

import i18n from "i18next"
import en from "@/locals/en.json"
import far from "@/locals/far.json"
import { initReactI18next } from "react-i18next"

const language = localStorage.getItem('lang') || 'en'

i18n
    .use(initReactI18next)
    .init({
        lng: language,
        fallbackLng: "en",

        resources: {
            en: {
                translation: en,
            },
            far: {
                translation: far,
            },
        },

        interpolation: {
            escapeValue: false,
        },
    })

export default i18n