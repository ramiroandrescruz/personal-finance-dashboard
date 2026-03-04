import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() ?? ''
}

const REQUIRED_KEYS: Array<keyof FirebaseConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
]

let cachedApp: FirebaseApp | null = null

export const isFirebaseConfigured = (): boolean => {
  return REQUIRED_KEYS.every((key) => firebaseConfig[key].length > 0)
}

export const getFirebaseApp = (): FirebaseApp | null => {
  if (!isFirebaseConfigured()) {
    return null
  }

  if (cachedApp) {
    return cachedApp
  }

  cachedApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  return cachedApp
}

export const getFirebaseAuth = (): Auth | null => {
  const app = getFirebaseApp()
  return app ? getAuth(app) : null
}

export const getFirebaseFirestore = (): Firestore | null => {
  const app = getFirebaseApp()
  return app ? getFirestore(app) : null
}
