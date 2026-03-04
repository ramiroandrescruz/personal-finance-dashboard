import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getFirebaseFirestore } from '../lib/firebase'
import type { PersistedDashboard } from './storage'
import { parsePersistedDashboard, serializePersistedDashboard } from './storage'

const DASHBOARD_DOC_ID = 'main'

const getDashboardDocRef = (userId: string) => {
  const firestore = getFirebaseFirestore()

  if (!firestore) {
    throw new Error('Firebase Firestore no está configurado.')
  }

  return doc(firestore, 'users', userId, 'dashboard', DASHBOARD_DOC_ID)
}

export const loadCloudDashboardData = async (userId: string): Promise<PersistedDashboard | null> => {
  const snapshot = await getDoc(getDashboardDocRef(userId))

  if (!snapshot.exists()) {
    return null
  }

  const parsed = parsePersistedDashboard(snapshot.data())

  if (!parsed) {
    throw new Error('El documento remoto tiene un formato inválido.')
  }

  return parsed
}

export const saveCloudDashboardData = async (userId: string, data: PersistedDashboard): Promise<void> => {
  const payload = serializePersistedDashboard({
    ...data,
    updatedAt: data.updatedAt ?? Date.now()
  })

  await setDoc(getDashboardDocRef(userId), payload, { merge: false })
}
