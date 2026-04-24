import { useRef, useState } from 'react'
import { FORMATIONS } from '../formations'

export default function FormationView({
  formation,
  positions,
  squad,
  subLog,
  minute,
  playMinutes,
  fieldStartMinute,
  onPositionsChange,
  onSubstitution,
  onResetOppsett,
  onResetLogg,
  onResetSpilletid,
}) {
  const svgRef = useRef(null)

  // Always-current refs – event handlers never use stale closures
  const positionsRef     = useRef(positions)
  positionsRef.current   = positions
  const formationRef     = useRef(formation)
  formationRef.current   = formation
  const onPosChangeRef   = useRef(onPositionsChange)
  onPosChangeRef.current = onPositionsChange
  const onSubRef         = useRef(onSubstitution)
  onSubRef.current       = onSubstitution

  // Touch drag tracking via refs (no async state delay)
  const activeTouchDrag  = useRef(null) // { type: 'bench'|'field', playerId, source? }
  const touchListeners   = useRef(null) // { move, end } – for cleanup

  // Mouse drag state (for desktop HTML5 DnD)
  const [fieldDragging, setFieldDragging] = useState(null)
  const [benchDragging, setBenchDragging] = useState(null)

  // Visual feedback only
  const [dragOver, setDragOver] = useState(null)
  const [confirmReset, setConfirmReset] = useState(null) // null | 'oppsett' | 'logg'

  const formDef    = FORMATIONS[formation]
  const playerById = Object.fromEntries(squad.map(p => [p.id, p]))
  const onField    = new Set(Object.values(positions))

  // Last sub-off index per player (higher = more recently benched)
  const lastSubOffIndex = {}
  ;(subLog ?? []).forEach((entry, i) => { lastSubOffIndex[entry.outId] = i })

  const bench = squad.filter(p => !onField.has(p.id)).sort((a, b) => {
    const ai = lastSubOffIndex[a.id]
    const bi = lastSubOffIndex[b.id]
    if (ai === undefined && bi === undefined) return a.number - b.number
    if (ai === undefined) return -1
    if (bi === undefined) return 1
    return ai - bi  // earlier sub-off = been on bench longer = leftmost
  })

  function playerTime(id, isOnField) {
    const acc = (playMinutes ?? {})[id] ?? 0
    if (isOnField) return acc + ((minute ?? 0) - ((fieldStartMinute ?? {})[id] ?? 0))
    return acc
  }

  function stintColor(id) {
    const start = (fieldStartMinute ?? {})[id]
    const stint = (minute ?? 0) - (start ?? 0)
    if (stint >= 15) return { bg: '#dc2626', text: 'white' }
    if (stint >= 10) return { bg: '#eab308', text: '#1f2937' }
    return { bg: '#16a34a', text: 'white' }
  }

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

  // ── Apply helpers (always use refs) ───────────────────────────

  function applyBenchDrop(posId, inId) {
    const pos    = positionsRef.current
    const outId  = pos[posId]
    const newPos = { ...pos, [posId]: inId }
    onPosChangeRef.current(newPos)
    if (outId) onSubRef.current(inId, outId)
  }

  function applyFieldDrop(posId, playerId, source) {
    if (posId === source) return
    const newPos   = { ...positionsRef.current }
    const existing = newPos[posId]
    if (existing) { newPos[source] = existing } else { delete newPos[source] }
    newPos[posId] = playerId
    onPosChangeRef.current(newPos)
  }

  function applyFieldToBench(source) {
    const newPos = { ...positionsRef.current }
    delete newPos[source]
    onPosChangeRef.current(newPos)
  }

  // ── Touch: attach non-passive listeners SYNCHRONOUSLY ─────────
  // This avoids the useEffect timing gap where touchmove fires
  // passively before React re-renders and the effect runs.

  function removeTouchListeners() {
    if (!touchListeners.current) return
    document.removeEventListener('touchmove', touchListeners.current.move)
    document.removeEventListener('touchend',  touchListeners.current.end)
    touchListeners.current = null
  }

  function attachTouchListeners(moveHandler, endHandler) {
    removeTouchListeners()
    document.addEventListener('touchmove', moveHandler, { passive: false })
    document.addEventListener('touchend',  endHandler)
    touchListeners.current = { move: moveHandler, end: endHandler }
  }

  function onBenchTouchStart(playerId) {
    activeTouchDrag.current = { type: 'bench', playerId }
    setBenchDragging(playerId) // for visual state

    function move(e) {
      e.preventDefault()
      setDragOver(findPosAtPoint(e.touches[0].clientX, e.touches[0].clientY))
    }

    function end(e) {
      const { clientX, clientY } = e.changedTouches[0]
      const drag = activeTouchDrag.current
      if (drag) {
        const posId = findPosAtPoint(clientX, clientY)
        if (posId) applyBenchDrop(posId, drag.playerId)
      }
      activeTouchDrag.current = null
      setBenchDragging(null)
      setDragOver(null)
      removeTouchListeners()
    }

    attachTouchListeners(move, end)
  }

  function onFieldTouchStart(playerId, source) {
    activeTouchDrag.current = { type: 'field', playerId, source }

    function move(e) {
      e.preventDefault()
      const { clientX, clientY } = e.touches[0]
      setDragOver(isBelowField(clientY) ? 'bench' : findPosAtPoint(clientX, clientY))
    }

    function end(e) {
      const { clientX, clientY } = e.changedTouches[0]
      const drag = activeTouchDrag.current
      if (drag) {
        if (isBelowField(clientY)) {
          applyFieldToBench(drag.source)
        } else {
          const posId = findPosAtPoint(clientX, clientY)
          if (posId) applyFieldDrop(posId, drag.playerId, drag.source)
        }
      }
      activeTouchDrag.current = null
      setDragOver(null)
      removeTouchListeners()
    }

    attachTouchListeners(move, end)
  }

  // ── Mouse drop handlers (desktop) ─────────────────────────────

  function onFieldMouseDrop(posId) {
    if (benchDragging) { applyBenchDrop(posId, benchDragging); setBenchDragging(null) }
    else if (fieldDragging) { applyFieldDrop(posId, fieldDragging.playerId, fieldDragging.source); setFieldDragging(null) }
    setDragOver(null)
  }

  function onBenchZoneDrop() {
    if (fieldDragging) { applyFieldToBench(fieldDragging.source); setFieldDragging(null) }
    setBenchDragging(null)
    setDragOver(null)
  }

  // ── Render ─────────────────────────────────────────────────────

  const W = 340, H = 320

  const ConfirmDialog = ({ onConfirm }) => (
    <div className="bg-red-950 border border-red-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3 w-full">
      <span className="text-sm text-red-200">
        {confirmReset === 'logg' ? 'Nullstill bytteloggen?' : confirmReset === 'spilletid' ? 'Nullstill spilletid?' : 'Tøm kampoppsettet?'}
      </span>
      <div className="flex gap-2">
        <button onClick={() => { onConfirm(); setConfirmReset(null) }}
          className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-bold">Ja</button>
        <button onClick={() => setConfirmReset(null)}
          className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm">Avbryt</button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-3 select-none w-full">

      <div className="flex gap-2 w-full">
        <div
          className={`flex-1 text-center text-xs py-2 rounded-lg transition-colors cursor-pointer select-none ${
            dragOver === 'bench' ? 'bg-yellow-400 text-black font-bold' : 'bg-yellow-500 text-black hover:bg-yellow-400'
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver('bench') }}
          onDragLeave={() => setDragOver(null)}
          onDrop={onBenchZoneDrop}
          onClick={() => setConfirmReset('oppsett')}
        >
          Nullstill kampoppsett
        </div>
        <div
          className="flex-1 text-center text-xs py-2 rounded-lg transition-colors cursor-pointer select-none bg-yellow-500 text-black hover:bg-yellow-400"
          onClick={() => setConfirmReset('spilletid')}
        >
          Nullstill spilletid
        </div>
      </div>

      {(confirmReset === 'oppsett' || confirmReset === 'spilletid') && (
        <ConfirmDialog onConfirm={confirmReset === 'oppsett' ? onResetOppsett : onResetSpilletid} />
      )}

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
                    onTouchStart={() => onFieldTouchStart(playerId, pos.id)}
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
                  {(() => {
                    const t = playerTime(playerId, true)
                    if (t <= 0) return null
                    const { bg, text } = stintColor(playerId)
                    const bx = cx + 7, by = cy - 40
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect x={bx} y={by} width={30} height={17} rx={7} fill={bg} opacity={0.92} />
                        <text x={bx + 13} y={by + 9} textAnchor="middle" dominantBaseline="middle"
                          fontSize="11" fontWeight="bold" fill={text}>{t}</text>
                        <text x={bx + 24} y={by + 10} textAnchor="middle" dominantBaseline="middle"
                          fontSize="7" fill={text} opacity={0.85}>m</text>
                      </g>
                    )
                  })()}
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

      <div className="flex justify-center gap-5 text-[10px] text-gray-400">
        {[['#16a34a','1–9m'],['#eab308','10–14m'],['#dc2626','≥15m']].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="w-5 h-3 rounded shrink-0" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>

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
                onTouchStart={() => onBenchTouchStart(player.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing bg-gray-800 border border-gray-700 text-white"
              >
                <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                  {player.number}
                </span>
                <span className="font-medium text-sm">{player.name}</span>
                {(() => { const t = playerTime(player.id, false); return t > 0 && (
                  <span className="ml-auto text-xs font-bold text-green-400">{t}m</span>
                )})()}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="w-full text-center text-xs py-2 rounded-lg cursor-pointer select-none bg-yellow-500 text-black hover:bg-yellow-400 transition-colors"
        onClick={() => setConfirmReset('logg')}
      >
        Nullstill byttelogg
      </div>

      {confirmReset === 'logg' && <ConfirmDialog onConfirm={onResetLogg} />}
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
