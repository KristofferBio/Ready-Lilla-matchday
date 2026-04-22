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

function ref(teamId) {
  return doc(db, 'teams', teamId)
}

export async function loadFromCloud(teamId) {
  try {
    const snap = await getDoc(ref(teamId))
    if (snap.exists()) return snap.data()
  } catch {}
  return null
}

export async function saveToCloud(teamId, data) {
  try {
    await setDoc(ref(teamId), data, { merge: true })
  } catch (e) {
    console.warn('Cloud save failed:', e)
  }
}
