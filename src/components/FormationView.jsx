import { useRef, useState, useEffect } from 'react'
import { FORMATIONS } from '../formations'

export default function FormationView({
  formation,
  positions,
  squad,
  onPositionsChange,
  onSubstitution,
}) {
  const svgRef = useRef(null)

  // Always-current refs so event handlers never use stale closures
  const positionsRef       = useRef(positions)
  positionsRef.current     = positions
  const formationRef       = useRef(formation)
  formationRef.current     = formation
  const onPosChangeRef     = useRef(onPositionsChange)
  onPosChangeRef.current   = onPositionsChange
  const onSubRef           = useRef(onSubstitution)
  onSubRef.current         = onSubstitution

  const [fieldDragging, setFieldDragging] = useState(null) // { playerId, source: posId }
  const [benchDragging, setBenchDragging] = useState(null) // playerId
  const [dragOver, setDragOver]           = useState(null) // posId | 'bench'

  const fieldDraggingRef   = useRef(null)
  fieldDraggingRef.current = fieldDragging
  const benchDraggingRef   = useRef(null)
  benchDraggingRef.current = benchDragging

  const formDef    = FORMATIONS[formation]
  const playerById = Object.fromEntries(squad.map(p => [p.id, p]))
  const onField    = new Set(Object.values(positions))
  const bench      = squad.filter(p => !onField.has(p.id)).sort((a, b) => a.number - b.number)

  // ── Coordinate helpers ─────────────────────────────────────────

  function findPosAtPoint(clientX, clientY) {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    const xPct = ((clientX - rect.left) / rect.width) * 100
    const yPct = ((clientY - rect.top)  / rect.height) * 100
    const fd   = FORMATIONS[formationRef.current]
    let closest = null, minDist = Infinity
    for (const pos of fd.positions) {
      const d = Math.hypot(pos.x - xPct, pos.y - yPct)
      if (d < minDist) { minDist = d; closest = pos.id }
    }
    return minDist < 9 ? closest : null
  }

  function isBelowField(clientY) {
    if (!svgRef.current) return false
    return clientY > svgRef.current.getBoundingClientRect().bottom
  }

  // ── Shared apply functions (use refs → always current) ─────────

  function applyBenchDrop(posId, inId) {
    const pos   = positionsRef.current
    const outId = pos[posId]
    const newPos = { ...pos, [posId]: inId }
    onPosChangeRef.current(newPos)
    if (outId) onSubRef.current(inId, outId)
    setBenchDragging(null)
    setDragOver(null)
  }

  function applyFieldDrop(posId, drag) {
    if (posId === drag.source) { setFieldDragging(null); setDragOver(null); return }
    const newPos   = { ...positionsRef.current }
    const existing = newPos[posId]
    if (existing) { newPos[drag.source] = existing } else { delete newPos[drag.source] }
    newPos[posId] = drag.playerId
    onPosChangeRef.current(newPos)
    setFieldDragging(null)
    setDragOver(null)
  }

  function applyFieldToBench(source) {
    const newPos = { ...positionsRef.current }
    delete newPos[source]
    onPosChangeRef.current(newPos)
    setFieldDragging(null)
    setDragOver(null)
  }

  // ── Non-passive document touch listeners for BENCH drag ────────
  useEffect(() => {
    if (!benchDragging) return

    function onMove(e) {
      e.preventDefault()
      const { clientX, clientY } = e.touches[0]
      setDragOver(findPosAtPoint(clientX, clientY))
    }

    function onEnd(e) {
      const { clientX, clientY } = e.changedTouches[0]
      const posId = findPosAtPoint(clientX, clientY)
      if (posId) {
        applyBenchDrop(posId, benchDraggingRef.current)
      } else {
        setBenchDragging(null)
        setDragOver(null)
      }
    }

    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend',  onEnd)
    return () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend',  onEnd)
    }
  }, [benchDragging])

  // ── Non-passive document touch listeners for FIELD drag ────────
  useEffect(() => {
    if (!fieldDragging) return

    function onMove(e) {
      e.preventDefault()
      const { clientX, clientY } = e.touches[0]
      setDragOver(isBelowField(clientY) ? 'bench' : findPosAtPoint(clientX, clientY))
    }

    function onEnd(e) {
      const { clientX, clientY } = e.changedTouches[0]
      const drag = fieldDraggingRef.current
      if (!drag) return
      if (isBelowField(clientY)) {
        applyFieldToBench(drag.source)
      } else {
        const posId = findPosAtPoint(clientX, clientY)
        if (posId) applyFieldDrop(posId, drag)
        else { setFieldDragging(null); setDragOver(null) }
      }
    }

    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend',  onEnd)
    return () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend',  onEnd)
    }
  }, [fieldDragging?.playerId, fieldDragging?.source])

  // ── Mouse drop handlers ────────────────────────────────────────

  function onFieldMouseDrop(posId) {
    if (benchDragging) { applyBenchDrop(posId, benchDragging); return }
    if (fieldDragging)   applyFieldDrop(posId, fieldDragging)
  }

  function onBenchZoneDrop() {
    if (fieldDragging) applyFieldToBench(fieldDragging.source)
    else { setBenchDragging(null); setDragOver(null) }
  }

  // ── Render ─────────────────────────────────────────────────────

  const W = 340, H = 520

  return (
    <div className="flex flex-col items-center gap-3 select-none w-full">

      {/* ── Football field SVG ── */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border-2 border-green-800"
        style={{ background: '#2d7a2d' }}
        onDragOver={e => e.preventDefault()}
      >
        <FieldLines W={W} H={H} />

        {formDef.positions.map(pos => {
          const playerId = positions[pos.id]
          const player   = playerId ? playerById[playerId] : null
          const cx       = (pos.x / 100) * W
          const cy       = (pos.y / 100) * H
          const isOver   = dragOver === pos.id

          return (
            <g
              key={pos.id}
              onDragOver={e => { e.preventDefault(); setDragOver(pos.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => onFieldMouseDrop(pos.id)}
            >
              {/* Drop zone */}
              <circle
                cx={cx} cy={cy} r={28}
                fill={isOver ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)'}
                stroke={isOver ? 'white' : 'rgba(255,255,255,0.35)'}
                strokeWidth="2"
                strokeDasharray={player ? '0' : '5,3'}
              />

              {player ? (
                <>
                  <circle
                    cx={cx} cy={cy} r={24}
                    fill="#1d4ed8"
                    stroke="#60a5fa"
                    strokeWidth="2.5"
                    draggable
                    onDragStart={e => {
                      setFieldDragging({ playerId, source: pos.id })
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => { setFieldDragging(null); setDragOver(null) }}
                    onTouchStart={() => setFieldDragging({ playerId, source: pos.id })}
                    style={{ cursor: 'grab' }}
                  />
                  <text x={cx} y={cy - 7} textAnchor="middle" dominantBaseline="middle"
                    fontSize="13" fontWeight="bold" fill="white" style={{ pointerEvents: 'none' }}>
                    {player.number}
                  </text>
                  <text x={cx} y={cy + 9} textAnchor="middle" dominantBaseline="middle"
                    fontSize="9.5" fill="#bfdbfe" style={{ pointerEvents: 'none' }}>
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

      {/* ── Send-til-benk drop zone ── */}
      <div
        className={`w-full text-center text-xs py-2 rounded-lg transition-colors ${
          dragOver === 'bench'
            ? 'bg-yellow-400 text-black font-bold'
            : 'bg-gray-800 text-gray-400'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver('bench') }}
        onDragLeave={() => setDragOver(null)}
        onDrop={onBenchZoneDrop}
      >
        Dra hit for å sende til benk
      </div>

      {/* ── Bench strip ── */}
      <div className="w-full">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">
          Benk ({bench.length})
        </p>
        {bench.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-2">Alle er på banen</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bench.map(player => (
              <div
                key={player.id}
                draggable
                onDragStart={e => {
                  setBenchDragging(player.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => { setBenchDragging(null); setDragOver(null) }}
                onTouchStart={() => setBenchDragging(player.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing bg-gray-800 border border-gray-700 text-white"
              >
                <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                  {player.number}
                </span>
                <span className="font-medium text-sm">{player.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FieldLines({ W, H }) {
  const lc = 'rgba(255,255,255,0.55)', lw = 1.5, p = 12
  return (
    <g stroke={lc} strokeWidth={lw} fill="none">
      <rect x={p} y={p} width={W - p * 2} height={H - p * 2} />
      <line x1={p} y1={H / 2} x2={W - p} y2={H / 2} />
      <circle cx={W / 2} cy={H / 2} r={42} />
      <circle cx={W / 2} cy={H / 2} r={2.5} fill={lc} stroke="none" />
      <rect x={W * 0.27} y={p} width={W * 0.46} height={H * 0.155} />
      <rect x={W * 0.38} y={p} width={W * 0.24} height={H * 0.058} />
      <rect x={W * 0.42} y={p - 8} width={W * 0.16} height={8} />
      <circle cx={W / 2} cy={p + H * 0.1} r={2} fill={lc} stroke="none" />
      <rect x={W * 0.27} y={H - p - H * 0.155} width={W * 0.46} height={H * 0.155} />
      <rect x={W * 0.38} y={H - p - H * 0.058} width={W * 0.24} height={H * 0.058} />
      <rect x={W * 0.42} y={H - p} width={W * 0.16} height={8} />
      <circle cx={W / 2} cy={H - p - H * 0.1} r={2} fill={lc} stroke="none" />
    </g>
  )
}
