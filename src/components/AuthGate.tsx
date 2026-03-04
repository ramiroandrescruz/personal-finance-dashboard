import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase'

interface AuthGateProps {
  children: (auth: { email?: string; uid?: string; logout?: () => void; cloudSyncEnabled: boolean }) => ReactNode
}

type AuthStatus = 'loading' | 'ready' | 'authorized' | 'denied' | 'misconfigured' | 'error'

const toAuthErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'No se pudo completar el login con Google.'
  }

  if (error.message.includes('auth/popup-closed-by-user')) {
    return 'Se cerró la ventana de login antes de completar la autenticación.'
  }

  if (error.message.includes('auth/popup-blocked')) {
    return 'El navegador bloqueó la ventana de login. Permití popups y reintentá.'
  }

  return error.message
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL?.trim().toLowerCase() ?? ''
  const isLocalHost =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname.toLowerCase())
  const bypassAuth = import.meta.env.DEV || isLocalHost
  const firebaseAuth = useMemo(() => getFirebaseAuth(), [])

  const [status, setStatus] = useState<AuthStatus>(bypassAuth ? 'authorized' : 'loading')
  const [currentEmail, setCurrentEmail] = useState<string>('')
  const [currentUid, setCurrentUid] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isSigningIn, setIsSigningIn] = useState(false)

  const logout = useCallback(() => {
    if (!firebaseAuth) {
      setStatus('ready')
      return
    }

    void signOut(firebaseAuth).finally(() => {
      setCurrentEmail('')
      setCurrentUid('')
      setErrorMessage('')
      setStatus('ready')
    })
  }, [firebaseAuth])

  useEffect(() => {
    if (bypassAuth) {
      setStatus('authorized')
      return
    }

    if (!allowedEmail || !isFirebaseConfigured() || !firebaseAuth) {
      setStatus('misconfigured')
      return
    }

    let isDisposed = false

    void setPersistence(firebaseAuth, browserSessionPersistence).catch(() => {
      // Session persistence best-effort.
    })

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (user) => {
        if (isDisposed) {
          return
        }

        if (!user) {
          setCurrentEmail('')
          setCurrentUid('')
          setStatus('ready')
          return
        }

        const normalizedEmail = user.email?.toLowerCase()

        if (!normalizedEmail || !user.emailVerified) {
          await signOut(firebaseAuth)
          if (!isDisposed) {
            setErrorMessage('No se pudo verificar el email de la cuenta autenticada.')
            setStatus('denied')
          }
          return
        }

        if (normalizedEmail !== allowedEmail) {
          await signOut(firebaseAuth)
          if (!isDisposed) {
            setErrorMessage(`Acceso denegado para ${user.email}. Esta app permite solo una cuenta.`)
            setStatus('denied')
          }
          return
        }

        setCurrentEmail(user.email ?? normalizedEmail)
        setCurrentUid(user.uid)
        setErrorMessage('')
        setStatus('authorized')
      },
      (error) => {
        if (isDisposed) {
          return
        }

        setStatus('error')
        setErrorMessage(toAuthErrorMessage(error))
      }
    )

    return () => {
      isDisposed = true
      unsubscribe()
    }
  }, [allowedEmail, bypassAuth, firebaseAuth])

  const handleSignIn = useCallback(async () => {
    if (!firebaseAuth) {
      setStatus('misconfigured')
      return
    }

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    setIsSigningIn(true)
    setErrorMessage('')

    try {
      await signInWithPopup(firebaseAuth, provider)
      setStatus('loading')
    } catch (error) {
      setStatus('ready')
      setErrorMessage(toAuthErrorMessage(error))
    } finally {
      setIsSigningIn(false)
    }
  }, [firebaseAuth])

  if (status === 'authorized') {
    return (
      <>
        {children({
          email: bypassAuth ? undefined : currentEmail,
          uid: bypassAuth ? undefined : currentUid,
          logout: bypassAuth ? undefined : logout,
          cloudSyncEnabled: !bypassAuth
        })}
      </>
    )
  }

  if (status === 'misconfigured') {
    return (
      <main className="auth-screen">
        <section className="auth-card" aria-live="polite">
          <h1>Configuración incompleta de Firebase</h1>
          <p>Definí `VITE_ALLOWED_EMAIL` y todas las variables `VITE_FIREBASE_*` para habilitar acceso en deploy.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-live="polite">
        <h1>Ingresar al dashboard</h1>
        <p>Acceso restringido al email autorizado.</p>
        <button type="button" className="btn btn-primary" onClick={handleSignIn} disabled={isSigningIn || status === 'loading'}>
          {isSigningIn ? 'Abriendo Google...' : 'Ingresar con Google'}
        </button>
        {status === 'loading' ? <p className="muted-text">Inicializando autenticación...</p> : null}
        {errorMessage ? <p className="warning-banner">{errorMessage}</p> : null}
      </section>
    </main>
  )
}
