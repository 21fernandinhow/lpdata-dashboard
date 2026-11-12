import "@testing-library/jest-dom/vitest"

// jsdom não implementa os métodos de <dialog>. A interface usa <dialog> nativo (ADR 0007).
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "")
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open")
  }
}

// jsdom não implementa matchMedia. O padrão simula um sistema em tema claro.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// jsdom não implementa a Popover API, mas esconde todo [popover]. A interface usa popover
// nativo (ADR 0007). Esta correção abre e fecha o popover e trata os botões com popovertarget.
if (!("showPopover" in HTMLElement.prototype)) {
  const OPEN = "data-popover-open"

  Object.assign(HTMLElement.prototype, {
    showPopover(this: HTMLElement) {
      this.setAttribute(OPEN, "")
      this.style.display = "block"
    },
    hidePopover(this: HTMLElement) {
      this.removeAttribute(OPEN)
      this.style.removeProperty("display")
    },
    togglePopover(this: HTMLElement) {
      if (this.hasAttribute(OPEN)) this.hidePopover()
      else this.showPopover()
      return this.hasAttribute(OPEN)
    },
  })

  document.addEventListener("click", (event) => {
    const invoker = (event.target as Element | null)?.closest("[popovertarget]")
    const target = invoker && document.getElementById(invoker.getAttribute("popovertarget")!)
    if (!target) return

    const action = invoker.getAttribute("popovertargetaction") ?? "toggle"
    if (action === "show") target.showPopover()
    else if (action === "hide") target.hidePopover()
    else target.togglePopover()
  })
}
