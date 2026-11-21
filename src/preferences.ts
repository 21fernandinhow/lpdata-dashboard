import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

// Uma escolha de visualização que vale para as próximas visitas, como a visão dos arquivos ou o
// modo de edição. O endereço manda quando traz o parâmetro, e a escolha feita por ele fica salva
// no navegador. Sem o parâmetro, vale a última escolha salva; sem ela, o padrão.
export function useStoredChoice<T extends string>(
  param: string,
  storageKey: string,
  values: readonly T[],
  fallback: T,
): T {
  const [searchParams] = useSearchParams()
  const raw = searchParams.get(param)
  const fromUrl = values.find((value) => value === raw) ?? null
  // Lido uma vez por montagem: na mesma tela, quem muda a escolha é o endereço.
  const [stored] = useState(() => readStored(storageKey, values))

  useEffect(() => {
    if (fromUrl) writeStored(storageKey, fromUrl)
  }, [fromUrl, storageKey])

  return fromUrl ?? stored ?? fallback
}

// O armazenamento pode faltar, como numa janela privada: aí vale só o endereço e o padrão.
function readStored<T extends string>(key: string, values: readonly T[]): T | null {
  try {
    const stored = localStorage.getItem(key)
    return values.find((value) => value === stored) ?? null
  } catch {
    return null
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Sem armazenamento, a escolha vale só enquanto estiver no endereço.
  }
}
