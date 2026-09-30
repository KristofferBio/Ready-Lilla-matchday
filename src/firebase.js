import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator, doc, setDoc, onSnapshot } from 'firebase/firestore'
import { createSyncQueue } from './syncQueue'

const testing = import.meta.env.MODE === 'e2e'
if (testing && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  throw new Error('Testbygget kan bare kjøres lokalt.')
}
const firebaseConfig = testing ? {
  apiKey: 'demo-kampstotte',
  projectId: 'demo-kampstotte',
  appId: 'demo-kampstotte',
} : {
  apiKey: "AIzaSyCCm2Yc39pEoqV7-W9BSt-_dS1XBTw2t74",
  authDomain: "ready-lilla---matchday.firebaseapp.com",
  projectId: "ready-lilla---matchday",
  storageBucket: "ready-lilla---matchday.firebasestorage.app",
  messagingSenderId: "435910495532",
  appId: "1:435910495532:web:3a872ed3b0eec331a13089",
  measurementId: "G-GC6ET90J6F"
}

const app = initializeApp(firebaseConfig)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
if (testing) connectFirestoreEmulator(db, '127.0.0.1', 8085)

const listeners = new Set()
const serverSeen = new Set()
const subscriptionErrors = new Map()
const subscriptionRetries = new Map()
function notify() { listeners.forEach(listener => listener()) }
export const syncQueue = createSyncQueue({
  storage: {
    getItem: key => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  },
  write: (key, data) => setDoc(doc(db, ...key.split('/')), data, { mergeFields: Object.keys(data) }),
  onChange: notify,
})
window.addEventListener('storage', event => {
  if (event.key?.startsWith('kampstotte_pending_')) {
    syncQueue.externalChange(event.key.slice('kampstotte_pending_'.length))
  }
})

export function subscribeToSyncStatus(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function getSyncStatus(teamId) {
  const keys = [`teams/${teamId}`, `clock/${teamId}`]
  return {
    pending: keys.some(key => !!syncQueue.pending(key)),
    error: keys.map(key => syncQueue.error(key) || subscriptionErrors.get(key)).find(Boolean),
    localError: keys.map(key => syncQueue.localError(key)).find(Boolean),
    confirmed: keys.every(key => serverSeen.has(key)),
  }
}

export function retrySync(teamId) {
  for (const key of [`teams/${teamId}`, `clock/${teamId}`]) {
    if (subscriptionErrors.has(key)) subscriptionRetries.get(key)?.forEach(retry => retry())
  }
  void syncQueue.flush(`teams/${teamId}`)
  void syncQueue.flush(`clock/${teamId}`)
}

function ref(teamId)      { return doc(db, 'teams', teamId) }
function clockRef(teamId) { return doc(db, 'clock', teamId) }

export function saveToCloud(teamId, data, baseline) {
  syncQueue.enqueue(`teams/${teamId}`, data, baseline)
}

export function subscribeToClockFromCloud(teamId, callback) {
  return subscribe(`clock/${teamId}`, clockRef(teamId), callback)
}

export function saveClockToCloud(teamId, clockState) {
  syncQueue.enqueue(`clock/${teamId}`, clockState)
}

export function subscribeToTeamFromCloud(teamId, callback) {
  return subscribe(`teams/${teamId}`, ref(teamId), callback)
}

function subscribe(key, reference, callback) {
  let unsubscribe = () => {}
  function start() {
    unsubscribe()
    unsubscribe = onSnapshot(reference, { includeMetadataChanges: true }, snap => {
      if (!snap.metadata.fromCache) {
        serverSeen.add(key)
        subscriptionErrors.delete(key)
        if (!snap.metadata.hasPendingWrites && snap.exists()) {
          syncQueue.acknowledge(key, snap.data()._syncWriteId)
        }
      } else serverSeen.delete(key)
      notify()
      // Local edits are authoritative until the server confirms their write.
      // Ignore optimistic Firestore snapshots: the UI already has those edits.
      if (syncQueue.pending(key) || snap.metadata.hasPendingWrites) return
      const version = syncQueue.version(key)
      callback(snap.exists() ? snap.data() : null, () => syncQueue.canApply(key, version))
    }, error => {
      subscriptionErrors.set(key, error.message)
      serverSeen.delete(key)
      notify()
    })
  }
  const retries = subscriptionRetries.get(key) ?? new Set()
  retries.add(start)
  subscriptionRetries.set(key, retries)
  start()
  return () => {
    unsubscribe()
    retries.delete(start)
    if (!retries.size) {
      subscriptionRetries.delete(key)
      serverSeen.delete(key)
      subscriptionErrors.delete(key)
    }
  }
}
