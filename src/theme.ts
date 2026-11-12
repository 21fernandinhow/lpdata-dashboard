import { useEffect, useState } from "react"

export type ThemePreference = "system" | "light" | "dark"
type Theme = "light" | "dark"

// A mesma chave que o script do index.html lê antes da primeira pintura.
// Sem valor salvo, a preferência é "system".
const STORAGE_KEY = "lpdata-theme"
const DARK_QUERY = "(prefers-color-scheme: dark)"

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark") return stored
  } catch {
    // Sem armazenamento disponível, vale o sistema.
  }
  return "system"
}

function applyTheme(preference: ThemePreference) {
  const theme: Theme =
    preference === "system"
      ? window.matchMedia(DARK_QUERY).matches
        ? "dark"
        : "light"
      : preference
  document.documentElement.dataset.theme = theme
}

function savePreference(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Sem armazenamento disponível, a escolha vale só até recarregar a página.
  }
}

export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference)

  // Em "system", o tema acompanha a mudança do sistema com a página aberta.
  useEffect(() => {
    if (preference !== "system") return
    const query = window.matchMedia(DARK_QUERY)
    const follow = () => applyTheme("system")
    query.addEventListener("change", follow)
    return () => query.removeEventListener("change", follow)
  }, [preference])

  function setPreference(next: ThemePreference) {
    applyTheme(next)
    savePreference(next)
    setPreferenceState(next)
  }

  return { preference, setPreference }
}
