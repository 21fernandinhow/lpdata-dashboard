import { Component, type ErrorInfo, type ReactNode } from "react"
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
      return (
        <ErrorState
          title="Algo deu errado"
          message="O dashboard encontrou um erro inesperado. Recarregue a página para tentar de novo."
          action={{ label: "Recarregar a página", onClick: () => window.location.reload() }}
        />
      )
    }
    return this.props.children
  }
}
