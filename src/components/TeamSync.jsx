import { useEffect } from 'react'
import { cacheTeamFromCloud, saveClockLocal } from '../storage'
import { subscribeToClockFromCloud, subscribeToTeamFromCloud, retrySync } from '../firebase'

// Each team owns its subscription, so adding/removing another team does not
// reload or overwrite a match already in progress.
export default function TeamSync({ teamId, setTeamData }) {
  useEffect(() => {
    let cancelled = false
    const unsubscribeTeam = subscribeToTeamFromCloud(teamId, (data, isCurrent) => {
      if (cancelled || !data || !isCurrent()) return
      const patch = cacheTeamFromCloud(teamId, data)
      setTeamData(prev => cancelled || !isCurrent() ? prev :
        { ...prev, [teamId]: { ...prev[teamId], ...patch } })
    })
    const unsubscribe = subscribeToClockFromCloud(teamId, (clockData, isCurrent) => {
      if (cancelled || !clockData || !isCurrent()) return
      saveClockLocal(teamId, clockData)
      setTeamData(prev => cancelled || !isCurrent() ? prev : ({
        ...prev,
        [teamId]: {
          ...prev[teamId],
          clockRunning: clockData.running ?? false,
          clockVirtualStart: clockData.virtualStart ?? null,
          clockElapsed: clockData.elapsed ?? 0,
        },
      }))
    })
    const retry = () => retrySync(teamId)
    retry()
    window.addEventListener('online', retry)
    return () => {
      cancelled = true
      unsubscribe()
      unsubscribeTeam()
      window.removeEventListener('online', retry)
    }
  }, [teamId, setTeamData])
  return null
}
