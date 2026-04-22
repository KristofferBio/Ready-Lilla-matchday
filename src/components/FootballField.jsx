import { useRef, useState } from 'react'
import { FORMATIONS } from '../formations'

export default function FootballField({
  formation,
  positions,
  squad,
  onPositionsChange,
  onPlayerClick,
  pendingSub,
  benchDragging,  // playerId being dragged from bench
  onBenchDrop,    // (posId) => void
}) {
  const svgRef = useRef(null)
  const [dragging, setDragging] = useState(null) // { playerId, source: posId }
  const [dragOver, setDragOver] = useState(null)  // posId | 'bench'

  const formDef = FORMATIONS[formation]
  const playerById = Object.fromEntries(squad.map(p => [p.id, p]))
  const occupiedBy = { ...positions }

  function handleDrop(posId) {
    if (benchDragging) {
      onBenchDrop(posId)
      setDragOver(null)
      return
    }
    if (!dragging) return
    const { playerId, source } = dragging
    const newPos = { ...positions }
    const existing = newPos[posId]
    if (existing) {
      newPos[source] = existing
    } else {
      delete newPos[source]
    }
    newPos[posId] = playerId
    onPositionsChange(newPos)
    setDragging(null)
    setDragOver(null)
  }

  function handleDropOnBench() {
    if (!dragging) { setDragOver(null); return }
    const newPos = { ...positions }
    delete newPos[dragging.source]
    onPositionsChange(newPos)
    setDragging(null)
    setDragOver(null)
  }

  // Touch: find which position is under a point
  function findPosAtPoint(clientX, clientY) {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    const xPct = ((clientX - rect.left) / rect.width) * 100
    const yPct = ((clientY - rect.top) / rect.height) * 100
    let closest = null
    let minDist = Infinity
    for (const pos of formDef.positions) {
      const d = Math.hypot(pos.x - xPct, pos.y - yPct)
      if (d < minDist) { minDist = d; closest = pos.id }
    }
    return minDist < 9 ? closest : null
  }

  function onTouchMove(e) {
    e.preventDefault()
    const touch = e.touches[0]
    setDragOver(findPosAtPoint(touch.clientX, touch.clientY))
  }

  function onTouchEnd(e, playerId, source) {
    e.preventDefault()
    const touch = e.changedTouches[0]
    const posId = findPosAtPoint(touch.clientX, touch.clientY)
    if (posId) {
      const newPos = { ...positions }
      const existing = newPos[posId]
      if (existing && existing !== playerId) {
        newPos[source] = existing
      } else if (!existing) {
        delete newPos[source]
      }
      newPos[posId] = playerId
      onPositionsChange(newPos)
    }
    setDragging(null)
    setDragOver(null)
  }

  const W = 340
  const H = 520

  return (
    <div className="flex flex-col items-center gap-2 select-none w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border-2 border-green-800"
        style={{ background: '#2d7a2d', touchAction: 'none' }}
        onDragOver={e => e.preventDefault()}
      >
        <FieldLines W={W} H={H} />

        {formDef.positions.map(pos => {
          const playerId = occupiedBy[pos.id]
          const player = playerId ? playerById[playerId] : null
          const cx = (pos.x / 100) * W
          const cy = (pos.y / 100) * H
          const isOver = dragOver === pos.id
          const isPending = pendingSub === playerId

          return (
            <g
              key={pos.id}
              onDragOver={e => { e.preventDefault(); setDragOver(pos.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(pos.id)}
              onClick={() => {
                if (player) onPlayerClick(playerId)
              }}
            >
              {/* Drop zone / hit area */}
              <circle
                cx={cx} cy={cy} r={28}
                fill={isOver ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}
                stroke={isOver ? 'white' : 'rgba(255,255,255,0.35)'}
                strokeWidth="2"
                strokeDasharray={player ? '0' : '5,3'}
              />

              {player ? (
                <>
                  <circle
                    cx={cx} cy={cy} r={24}
                    fill={isPending ? '#dc2626' : '#1d4ed8'}
                    stroke={isPending ? '#f87171' : '#60a5fa'}
                    strokeWidth="2.5"
                    draggable
                    onDragStart={e => {
                      setDragging({ playerId, source: pos.id })
                      // ghost image
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => { setDragging(null); setDragOver(null) }}
                    onTouchStart={() => setDragging({ playerId, source: pos.id })}
                    onTouchMove={onTouchMove}
                    onTouchEnd={e => onTouchEnd(e, playerId, pos.id)}
                    style={{ cursor: 'grab' }}
                  />
                  <text x={cx} y={cy - 7} textAnchor="middle" dominantBaseline="middle"
                    fontSize="13" fontWeight="bold" fill="white" style={{ pointerEvents: 'none' }}>
                    {player.number}
                  </text>
                  <text x={cx} y={cy + 9} textAnchor="middle" dominantBaseline="middle"
                    fontSize="9.5" fill={isPending ? '#fca5a5' : '#bfdbfe'} style={{ pointerEvents: 'none' }}>
                    {player.name.length > 8 ? player.name.slice(0, 7) + '.' : player.name}
                  </text>
                </>
              ) : (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                  fontSize="10" fill="rgba(255,255,255,0.45)" style={{ pointerEvents: 'none' }}>
                  {pos.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div
        className={`w-full text-center text-xs py-2 rounded-lg transition-colors ${
          dragOver === 'bench' ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-800 text-gray-400'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver('bench') }}
        onDragLeave={() => setDragOver(null)}
        onDrop={handleDropOnBench}
      >
        Dra hit for å sende til benk
      </div>
    </div>
  )
}

function FieldLines({ W, H }) {
  const lc = 'rgba(255,255,255,0.55)'
  const lw = 1.5
  const p = 12

  return (
    <g stroke={lc} strokeWidth={lw} fill="none">
      <rect x={p} y={p} width={W - p * 2} height={H - p * 2} />
      <line x1={p} y1={H / 2} x2={W - p} y2={H / 2} />
      <circle cx={W / 2} cy={H / 2} r={42} />
      <circle cx={W / 2} cy={H / 2} r={2.5} fill={lc} stroke="none" />

      {/* Top penalty area */}
      <rect x={W * 0.27} y={p} width={W * 0.46} height={H * 0.155} />
      <rect x={W * 0.38} y={p} width={W * 0.24} height={H * 0.058} />
      <rect x={W * 0.42} y={p - 8} width={W * 0.16} height={8} />
      <circle cx={W / 2} cy={p + H * 0.1} r={2} fill={lc} stroke="none" />

      {/* Bottom penalty area */}
      <rect x={W * 0.27} y={H - p - H * 0.155} width={W * 0.46} height={H * 0.155} />
      <rect x={W * 0.38} y={H - p - H * 0.058} width={W * 0.24} height={H * 0.058} />
      <rect x={W * 0.42} y={H - p} width={W * 0.16} height={8} />
      <circle cx={W / 2} cy={H - p - H * 0.1} r={2} fill={lc} stroke="none" />
    </g>
  )
}
