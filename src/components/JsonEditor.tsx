import { useImperativeHandle, useMemo, useRef, type KeyboardEvent, type Ref } from "react"
import { tokenizeJson, type JsonToken } from "@/content/json-tokens"

export type JsonEditorHandle = {
  // Leva o cursor ao começo da linha, com o foco no editor.
  goToLine: (line: number) => void
}

type JsonEditorProps = {
  ref?: Ref<JsonEditorHandle>
  value: string
  onChange: (value: string) => void
  label: string
  // Linhas com problema, contadas a partir de 1. Ficam marcadas no fundo e no número.
  markedLines: ReadonlySet<number>
  describedBy?: string
  invalid?: boolean
}

// Editor de JSON sem dependência (ADR 0007): um textarea nativo, com o texto transparente, sobre
// uma camada que repete o mesmo texto colorido. Os dois têm a mesma fonte e o mesmo espaçamento,
// e a camada acompanha a rolagem do textarea. Digitar, selecionar, desfazer e colar são do
// navegador.
export function JsonEditor({
  ref,
  value,
  onChange,
  label,
  markedLines,
  describedBy,
  invalid,
}: JsonEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  // Depois do Esc, o próximo Tab sai do editor em vez de indentar.
  const tabLeaves = useRef(false)
  const lines = useMemo(() => splitLines(tokenizeJson(value)), [value])

  useImperativeHandle(
    ref,
    () => ({
      goToLine(line) {
        const textarea = textareaRef.current
        if (!textarea) return
        const start = lineStart(textarea.value, line)
        textarea.focus()
        textarea.setSelectionRange(start, start)
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight)
        if (lineHeight) textarea.scrollTop = Math.max(0, (line - 3) * lineHeight)
      },
    }),
    [],
  )

  function syncScroll() {
    const textarea = textareaRef.current
    if (!textarea) return
    if (highlightRef.current) {
      highlightRef.current.scrollTop = textarea.scrollTop
      highlightRef.current.scrollLeft = textarea.scrollLeft
    }
    if (gutterRef.current) gutterRef.current.scrollTop = textarea.scrollTop
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      tabLeaves.current = true
      return
    }
    const leaving = tabLeaves.current
    tabLeaves.current = false
    if (event.metaKey || event.ctrlKey || event.altKey || event.nativeEvent.isComposing) return

    const textarea = event.currentTarget
    if (event.key === "Tab" && !event.shiftKey && !leaving) {
      event.preventDefault()
      insertText(textarea, "  ")
    } else if (event.key === "Enter" && !event.shiftKey) {
      // A linha nova herda a indentação, e ganha um nível depois de { ou [.
      event.preventDefault()
      const before = textarea.value.slice(0, textarea.selectionStart)
      const currentLine = before.slice(before.lastIndexOf("\n") + 1)
      const indent = /^[ \t]*/.exec(currentLine)![0]
      insertText(textarea, `\n${indent}${/[{[]\s*$/.test(before) ? "  " : ""}`)
    }
  }

  return (
    <div className="json-editor">
      <div ref={gutterRef} className="json-editor__gutter" aria-hidden="true">
        <div className="json-editor__lines">
          {lines.map((_, index) => (
            <div
              key={index}
              className={
                markedLines.has(index + 1)
                  ? "json-editor__number json-editor__number--marked"
                  : "json-editor__number"
              }
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>
      <div className="json-editor__body">
        <div ref={highlightRef} className="json-editor__highlight" aria-hidden="true">
          <div className="json-editor__lines">
            {lines.map((line, index) => (
              <div
                key={index}
                className={
                  markedLines.has(index + 1)
                    ? "json-editor__line json-editor__line--marked"
                    : "json-editor__line"
                }
              >
                {line.map((token, position) => (
                  <span key={position} className={`json-token json-token--${token.kind}`}>
                    {token.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          className="json-editor__input"
          aria-label={label}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>
    </div>
  )
}

// Os pedaços do destaque, repartidos por linha. Um pedaço que atravessa linhas vira vários.
function splitLines(tokens: JsonToken[]) {
  const lines: JsonToken[][] = [[]]
  for (const token of tokens) {
    token.text.split("\n").forEach((part, index) => {
      if (index > 0) lines.push([])
      if (part) lines[lines.length - 1].push({ kind: token.kind, text: part })
    })
  }
  return lines
}

function lineStart(text: string, line: number) {
  let offset = 0
  for (let current = 1; current < line; current += 1) {
    const next = text.indexOf("\n", offset)
    if (next === -1) return offset
    offset = next + 1
  }
  return offset
}

// Insere no cursor. O execCommand, embora obsoleto, é o único caminho que mantém o desfazer do
// navegador; onde ele não existe, setRangeText e um evento input para o React ver a mudança.
function insertText(textarea: HTMLTextAreaElement, text: string) {
  try {
    if (document.execCommand("insertText", false, text)) return
  } catch {
    // Sem execCommand: segue para setRangeText.
  }
  textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, "end")
  textarea.dispatchEvent(new Event("input", { bubbles: true }))
}
