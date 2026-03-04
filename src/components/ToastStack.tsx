interface ToastMessage {
  id: string
  message: string
  tone?: 'info' | 'success' | 'error'
}

interface ToastStackProps {
  toasts: ToastMessage[]
}

export const ToastStack = ({ toasts }: ToastStackProps) => {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast-item ${toast.tone ? `is-${toast.tone}` : ''}`}>
          {toast.message}
        </article>
      ))}
    </div>
  )
}
