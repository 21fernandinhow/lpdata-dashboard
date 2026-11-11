type ErrorStateProps = {
  title: string
  message: string
  action?: { label: string; onClick: () => void }
}

export function ErrorState({ title, message, action }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <div className="error-state__box">
        <h1 className="error-state__title">{title}</h1>
        <p className="error-state__message">{message}</p>
        {action && (
          <button type="button" className="error-state__action" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
