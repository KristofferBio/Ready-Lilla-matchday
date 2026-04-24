import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'

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

function ref(teamId)      { return doc(db, 'teams', teamId) }
function clockRef(teamId) { return doc(db, 'clock', teamId) }

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

export function subscribeToClockFromCloud(teamId, callback) {
  return onSnapshot(clockRef(teamId), snap => {
    callback(snap.exists() ? snap.data() : null)
  })
}

export async function saveClockToCloud(teamId, clockState) {
  try {
    await setDoc(clockRef(teamId), clockState)
  } catch (e) {
    console.warn('Clock save failed:', e)
  }
}
