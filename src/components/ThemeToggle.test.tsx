import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeToggle } from "@/components/ThemeToggle"

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = "light"
  })

  it("troca o tema e salva a escolha", async () => {
    render(<ThemeToggle />)

    await userEvent.click(screen.getByRole("button", { name: "Usar tema escuro" }))

    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(localStorage.getItem("lpdata-theme")).toBe("dark")
    expect(screen.getByRole("button", { name: "Usar tema claro" })).toBeInTheDocument()
  })

  it("não salva nada enquanto o usuário não escolhe", () => {
    render(<ThemeToggle />)

    expect(localStorage.getItem("lpdata-theme")).toBeNull()
  })
})
