import { useEffect, useReducer } from 'react'
import { getSyncStatus, subscribeToSyncStatus, retrySync } from '../firebase'

export default function SyncStatus({ teamId }) {
  const [, refresh] = useReducer(value => value + 1, 0)
  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus(refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('offline', refresh)
    return () => {
      unsubscribe()
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', refresh)
    }
  }, [])
  const status = getSyncStatus(teamId)
  const offline = !navigator.onLine
  const text = status.localError ? 'Problemer med lokal lagring – sjekk lagringsplass og ikke slett nettleserdata'
    : status.error ? (status.pending ? 'Synkronisering feilet – endringer venter på denne enheten' : 'Kunne ikke hente data fra skyen – viser lokale data')
    : offline ? (status.pending ? 'Uten nett – endringer venter på synkronisering' : 'Uten nett – viser lokalt lagrede data')
      : status.pending ? 'Endringer lagret lokalt – venter på skyen'
        : status.confirmed ? 'Synkronisert med skyen' : 'Kobler til skyen – viser lokale data'
  return (
    <div className={`px-4 py-2 text-xs flex items-center gap-2 ${status.error || offline || status.pending ? 'text-amber-300' : 'text-gray-400'}`}>
      <span role="status" className="flex-1">{text}</span>
      {status.error && <button type="button" onClick={() => retrySync(teamId)} className="rounded bg-gray-800 px-3 py-2">Prøv igjen</button>}
    </div>
  )
}
