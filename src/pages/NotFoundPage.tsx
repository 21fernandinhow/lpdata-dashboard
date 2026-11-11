import { Link } from "react-router-dom"

export default function NotFoundPage() {
  return (
    <section className="status-page">
      <div className="status-page__box">
        <p className="status-page__eyebrow">404</p>
        <h1 className="status-page__title">Página não encontrada</h1>
        <p className="status-page__text">O endereço que você abriu não existe no dashboard.</p>
        <p>
          <Link to="/">Voltar ao início</Link>
        </p>
      </div>
    </section>
  )
}
