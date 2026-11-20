// Como um asset aparece na lista: tamanho legível, rótulo do tipo e o tipo de miniatura.

type AssetFile = { filename: string; content_type: string }

const UNITS = ["B", "KB", "MB", "GB"]
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

export function formatBytes(bytes: number) {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${number.format(value)} ${UNITS[unit]}`
}

// A extensão do arquivo, em maiúsculas. Sem extensão, o subtipo do content_type.
export function typeLabel({ filename, content_type }: AssetFile) {
  const extension = /\.([^./]+)$/.exec(filename)?.[1]
  if (extension) return extension.toUpperCase()
  const subtype = content_type.split("/")[1]
  return subtype ? subtype.toUpperCase() : "ARQUIVO"
}

const IMAGE_EXTENSION = /\.(?:png|jpe?g|gif|webp|avif)$/i

// image vira miniatura. SVG não: o Rails o serve como binário, e ele não aparece em img. Sem
// content_type, como numa URL digitada, vale a extensão do nome.
export function previewKind({ filename, content_type }: AssetFile): "image" | "svg" | "file" {
  if (content_type === "image/svg+xml" || /\.svg$/i.test(filename)) return "svg"
  if (content_type.startsWith("image/") || IMAGE_EXTENSION.test(filename)) return "image"
  return "file"
}

// O nome do arquivo no fim de uma URL, como a public_url de um asset termina. Vazio quando a URL
// não tem nome de arquivo ou não é URL.
export function filenameFromUrl(url: string) {
  try {
    const last = new URL(url).pathname.split("/").pop() ?? ""
    return decodeURIComponent(last)
  } catch {
    return ""
  }
}
