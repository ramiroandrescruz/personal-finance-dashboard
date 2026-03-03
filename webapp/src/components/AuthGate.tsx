import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

interface AuthGateProps {
  children: (auth: { email: string; logout: () => void }) => ReactNode
}

interface GoogleJwtPayload {
  email?: string
  email_verified?: boolean
  exp?: number
}

interface StoredSession {
  email: string
  exp: number
}

type AuthStatus = 'loading' | 'ready' | 'authorized' | 'denied' | 'misconfigured' | 'error'

const STORAGE_KEY = 'pfd-auth-session-v1'

const loadGoogleIdentityScript = async (): Promise<void> => {
  if (window.google?.accounts?.id) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]')

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services')), {
        once: true
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'))
    document.head.appendChild(script)
  })
}

const decodeJwtPayload = (token: string): GoogleJwtPayload | null => {
  try {
    const [, payload] = token.split('.')

    if (!payload) {
      return null
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
    const encodedPayload = normalized + padding
    const decoded = window.atob(encodedPayload)
    const parsed = JSON.parse(decoded) as GoogleJwtPayload

    return parsed
  } catch {
    return null
  }
}

const readSession = (): StoredSession | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession

    if (typeof parsed.email !== 'string' || typeof parsed.exp !== 'number') {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

const saveSession = (session: StoredSession): void => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

const clearSession = (): void => {
  sessionStorage.removeItem(STORAGE_KEY)
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL?.trim().toLowerCase() ?? ''
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
  const isLocalHost =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname.toLowerCase())
  const bypassAuth = import.meta.env.DEV || isLocalHost

  const [status, setStatus] = useState<AuthStatus>(bypassAuth ? 'authorized' : 'loading')
  const [currentEmail, setCurrentEmail] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const isGoogleInitializedRef = useRef(false)

  const logout = useCallback(() => {
    clearSession()
    setCurrentEmail('')
    setErrorMessage('')
    setStatus('ready')

    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect()
      window.google.accounts.id.prompt()
    }
  }, [])

  const authorize = useCallback((email: string, exp: number) => {
    setCurrentEmail(email)
    setErrorMessage('')
    saveSession({ email, exp })
    setStatus('authorized')
  }, [])

  const deny = useCallback((message: string) => {
    clearSession()
    setCurrentEmail('')
    setErrorMessage(message)
    setStatus('denied')
  }, [])

  useEffect(() => {
    let disposed = false

    const initialize = async () => {
      if (bypassAuth) {
        setStatus('authorized')
        return
      }

      if (!clientId || !allowedEmail) {
        setStatus('misconfigured')
        return
      }

      const session = readSession()

      if (session && session.email.toLowerCase() === allowedEmail && session.exp * 1000 > Date.now()) {
        authorize(session.email, session.exp)
        return
      }

      try {
        await loadGoogleIdentityScript()

        if (disposed) {
          return
        }

        const googleId = window.google?.accounts?.id

        if (!googleId) {
          setStatus('error')
          setErrorMessage('Google Sign-In no está disponible en este navegador.')
          return
        }

        googleId.initialize({
          client_id: clientId,
          callback: (response) => {
            const payload = decodeJwtPayload(response.credential)

            if (!payload?.email || !payload.email_verified) {
              deny('No se pudo verificar el email de la cuenta de Google.')
              return
            }

            const normalizedEmail = payload.email.toLowerCase()

            if (normalizedEmail !== allowedEmail) {
              deny(`Acceso denegado para ${payload.email}. Esta app permite solo una cuenta.`)
              return
            }

            authorize(payload.email, payload.exp ?? Math.floor(Date.now() / 1000) + 3600)
          }
        })

        isGoogleInitializedRef.current = true
        setStatus('ready')
      } catch (error) {
        if (disposed) {
          return
        }

        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Error desconocido al inicializar Google Sign-In')
      }
    }

    void initialize()

    return () => {
      disposed = true
    }
  }, [allowedEmail, authorize, bypassAuth, clientId, deny])

  useEffect(() => {
    if (!isGoogleInitializedRef.current || !buttonContainerRef.current) {
      return
    }

    if (status === 'authorized' || status === 'misconfigured' || status === 'error') {
      return
    }

    const googleId = window.google?.accounts?.id

    if (!googleId) {
      return
    }

    buttonContainerRef.current.innerHTML = ''

    googleId.renderButton(buttonContainerRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      width: 280
    })

    googleId.prompt()
  }, [status])

  if (status === 'authorized') {
    return <>{children({ email: currentEmail, logout })}</>
  }

  if (status === 'misconfigured') {
    return (
      <main className="auth-screen">
        <section className="auth-card" aria-live="polite">
          <h1>Configuración incompleta de login</h1>
          <p>Definí `VITE_GOOGLE_CLIENT_ID` y `VITE_ALLOWED_EMAIL` para habilitar el acceso.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-live="polite">
        <h1>Ingresar al dashboard</h1>
        <p>Acceso restringido al email autorizado.</p>
        <div ref={buttonContainerRef} className="google-signin-slot" />

        {status === 'loading' ? <p className="muted-text">Cargando Google Sign-In...</p> : null}
        {status === 'denied' || status === 'error' ? <p className="error-text">{errorMessage}</p> : null}
      </section>
    </main>
  )
}
