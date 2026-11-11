export function Loader() {
  return (
    <div className="loader" role="status">
      <span className="loader__spinner" aria-hidden="true" />
      <span className="visually-hidden">Carregando…</span>
    </div>
  )
}
