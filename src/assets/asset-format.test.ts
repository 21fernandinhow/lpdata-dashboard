import { formatBytes, previewKind, typeLabel } from "@/assets/asset-format"

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1024, "1 KB"],
    [18432, "18 KB"],
    [1572864, "1,5 MB"],
    [3 * 1024 ** 3, "3 GB"],
  ])("%i bytes é %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text)
  })
})

describe("typeLabel", () => {
  it.each([
    [{ filename: "hero.webp", content_type: "image/webp" }, "WEBP"],
    [{ filename: "Menu Final.PDF", content_type: "application/pdf" }, "PDF"],
    [{ filename: "LEIAME", content_type: "text/plain" }, "PLAIN"],
    [{ filename: "dados", content_type: "" }, "ARQUIVO"],
  ])("%j é %s", (asset, label) => {
    expect(typeLabel(asset)).toBe(label)
  })
})

describe("previewKind", () => {
  it.each([
    [{ filename: "hero.webp", content_type: "image/webp" }, "image"],
    [{ filename: "logo.svg", content_type: "image/svg+xml" }, "svg"],
    // O Rails pode servir o SVG como binário: a extensão também conta.
    [{ filename: "logo.svg", content_type: "application/octet-stream" }, "svg"],
    [{ filename: "menu.pdf", content_type: "application/pdf" }, "file"],
    [{ filename: "intro.mp4", content_type: "video/mp4" }, "file"],
  ])("%j é %s", (asset, kind) => {
    expect(previewKind(asset)).toBe(kind)
  })
})
