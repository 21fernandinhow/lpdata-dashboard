import { Icon } from "@/components/Icon"

// Link sublinhado para a documentação, com o ícone de informação, aberto em nova aba.
export function DocsLink({ href, children }: { href: string; children: string }) {
  return (
    <a className="docs-link" href={href} target="_blank" rel="noreferrer">
      <Icon>
        <circle cx="9" cy="9" r="7.25" />
        <path d="M9 12.25V8.5" />
        <path d="M9 5.75H9.01" />
      </Icon>
      <span>{children}</span>
    </a>
  )
}
