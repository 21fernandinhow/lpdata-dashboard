import { Component, useEffect, type ErrorInfo, type ReactNode } from "react"
import { useRouteError } from "react-router-dom"
import { ErrorState } from "@/components/ErrorState"

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { hasError: boolean }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return <UnexpectedError />
    }
    return this.props.children
  }
}

// O mesmo aviso para os erros que o data router captura dentro das rotas.
export function RouteError() {
  const error = useRouteError()
  useEffect(() => console.error(error), [error])
  return <UnexpectedError />
}

function UnexpectedError() {
  return (
    <ErrorState
      title="Algo deu errado"
      message="O dashboard encontrou um erro inesperado. Recarregue a página para tentar de novo."
      action={{ label: "Recarregar a página", onClick: () => window.location.reload() }}
    />
  )
}
