import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeMenu } from "@/components/ThemeMenu"

function systemPrefersDark(dark: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: dark,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )
}

async function openMenu() {
  await userEvent.click(screen.getByRole("button", { name: "Mudar o tema" }))
}

describe("ThemeMenu", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = "light"
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("começa em System quando não há escolha salva", async () => {
    render(<ThemeMenu />)
    await openMenu()

    expect(screen.getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "true")
    expect(localStorage.getItem("lpdata-theme")).toBeNull()
  })

  it("escolher Dark aplica o tema escuro e salva a escolha", async () => {
    render(<ThemeMenu />)
    await openMenu()

    await userEvent.click(screen.getByRole("button", { name: "Dark" }))

    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(localStorage.getItem("lpdata-theme")).toBe("dark")
    await openMenu()
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true")
  })

  it("voltar para System apaga a escolha e segue o sistema", async () => {
    localStorage.setItem("lpdata-theme", "light")
    systemPrefersDark(true)
    render(<ThemeMenu />)
    await openMenu()

    await userEvent.click(screen.getByRole("button", { name: "System" }))

    expect(localStorage.getItem("lpdata-theme")).toBeNull()
    expect(document.documentElement.dataset.theme).toBe("dark")
  })
})
