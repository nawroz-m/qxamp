"use client"

import { useEffect } from "react"
import i18n from "i18next"
import en from "@/locals/en.json"
import far from "@/locals/far.json"
import it from "@/locals/it.json"
import fr from "@/locals/fr.json"
import { initReactI18next, useTranslation } from "react-i18next"

const HTML_LANG: Record<string, string> = {
    en: "en",
    far: "fa",
    it: "it",
    fr: "fr",
}

i18n
    .use(initReactI18next)
    .init({
        lng: "en",
        fallbackLng: "en",

        resources: {
            en: {
                translation: en,
            },
            far: {
                translation: far,
            },
            it: {
                translation: it,
            },
            fr: {
                translation: fr,
            },
        },

        interpolation: {
            escapeValue: false,
        },
    })

export const languages = [
    { label: "English", value: "en" },
    { label: "فارسی/دری", value: "far" },
    { label: "Italiano", value: "it" },
    { label: "Français", value: "fr" },
]

export function applyDocumentLanguage(language: string) {
    if (typeof document === "undefined") return
    document.documentElement.lang = HTML_LANG[language] ?? "en"
}

export function I18nLanguageSync() {
    const { i18n: i18nInstance, t } = useTranslation()

    useEffect(() => {
        const saved = localStorage.getItem("lang")
        if (saved && saved !== i18nInstance.language) {
            void i18nInstance.changeLanguage(saved)
        } else {
            applyDocumentLanguage(i18nInstance.language)
        }
    }, [i18nInstance])

    useEffect(() => {
        applyDocumentLanguage(i18nInstance.language)
        document.title = t("content.pageTitle")
    }, [i18nInstance.language, t])

    return null
}

export default i18n
