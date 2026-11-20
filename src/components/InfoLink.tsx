import { Icon } from "@/components/Icon"
import { Tooltip } from "@/components/Tooltip"

type InfoLinkProps = {
  // O nome do link, como "Sobre os hosts permitidos".
  label: string
  // A explicação, no tooltip. O aviso de que o clique abre a documentação é acrescentado aqui.
  text: string
  href: string
}

// Ícone de informação: explica no tooltip e, ao clicar, abre a documentação em nova aba.
export function InfoLink({ label, text, href }: InfoLinkProps) {
  return (
    <Tooltip label={`${text} Clique para ver na documentação.`}>
      {(tooltipId) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="button button--ghost button--icon info-link"
          aria-label={label}
          aria-describedby={tooltipId}
        >
          <Icon>
            <circle cx="9" cy="9" r="7.25" />
            <path d="M9 12.25V8.5" />
            <path d="M9 5.75H9.01" />
          </Icon>
        </a>
      )}
    </Tooltip>
  )
}
