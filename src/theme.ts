import { useState } from "react"

export type Theme = "light" | "dark"

// A mesma chave que o script do index.html lê antes da primeira pintura.
const STORAGE_KEY = "lpdata-theme"

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light"
}

// O tema inicial vem do script do index.html: a preferência salva ou, sem ela, a do sistema.
// Só a escolha explícita do usuário é salva, para que quem nunca escolheu continue seguindo o sistema.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Sem armazenamento disponível, o tema vale só até recarregar a página.
    }
    setTheme(next)
  }

  return { theme, toggleTheme }
}
