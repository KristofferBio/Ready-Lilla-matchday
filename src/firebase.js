import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCCm2Yc39pEoqV7-W9BSt-_dS1XBTw2t74",
  authDomain: "ready-lilla---matchday.firebaseapp.com",
  projectId: "ready-lilla---matchday",
  storageBucket: "ready-lilla---matchday.firebasestorage.app",
  messagingSenderId: "435910495532",
  appId: "1:435910495532:web:3a872ed3b0eec331a13089",
  measurementId: "G-GC6ET90J6F"
}

const app = initializeApp(firebaseConfig)
const db  = getFirestore(app)
const REF = doc(db, 'teams', 'ready-lilla')

export async function loadSquadFromCloud() {
  try {
    const snap = await getDoc(REF)
    if (snap.exists()) return snap.data().squad ?? []
  } catch {}
  return null
}

export async function saveSquadToCloud(squad) {
  try {
    await setDoc(REF, { squad }, { merge: true })
  } catch (e) {
    console.warn('Cloud save failed:', e)
  }
}
