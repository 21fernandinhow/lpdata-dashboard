import { hostFrom } from "@/api/hosts"

describe("hostFrom", () => {
  it.each([
    ["example.com", "example.com"],
    ["  Example.COM  ", "example.com"],
    ["localhost:5173", "localhost:5173"],
    ["https://Loja.Example.com:8443/promo?x=1", "loja.example.com:8443"],
    ["https://example.com/", "example.com"],
    ["example.com/pagina", "example.com"],
    ["http://localhost:3000", "localhost:3000"],
  ])("%s grava %s", (text, host) => {
    expect(hostFrom(text)).toBe(host)
  })

  // A porta padrão some da URL, e o host sem porta passa a valer para os subdomínios.
  it("mantém a porta padrão escrita sem esquema", () => {
    expect(hostFrom("example.com:443")).toBe("example.com:443")
  })

  it("o que não é endereço vai como digitado, em minúsculas", () => {
    expect(hostFrom("Não É Host")).toBe("não é host")
  })
})
