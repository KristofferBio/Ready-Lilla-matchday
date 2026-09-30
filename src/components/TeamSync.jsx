import { useEffect } from 'react'
import { loadAllFromCloud, saveClockLocal } from '../storage'
import { subscribeToClockFromCloud } from '../firebase'

// Each team owns its subscription, so adding/removing another team does not
// reload or overwrite a match already in progress.
export default function TeamSync({ teamId, setTeamData }) {
  useEffect(() => {
    let cancelled = false
    loadAllFromCloud(teamId).then(data => {
      if (cancelled) return
      setTeamData(prev => ({ ...prev, [teamId]: { ...prev[teamId], ...data } }))
    })
    const unsubscribe = subscribeToClockFromCloud(teamId, clockData => {
      if (cancelled || !clockData) return
      saveClockLocal(teamId, clockData)
      setTeamData(prev => ({
        ...prev,
        [teamId]: {
          ...prev[teamId],
          clockRunning: clockData.running ?? false,
          clockVirtualStart: clockData.virtualStart ?? null,
          clockElapsed: clockData.elapsed ?? 0,
        },
      }))
    })
    return () => { cancelled = true; unsubscribe() }
  }, [teamId, setTeamData])
  return null
}
