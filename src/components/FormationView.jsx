import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FORMATIONS } from '../formations'
import OverlayPanel from './OverlayPanel'
import SubLog from './SubLog'

function fieldPoint(position, width, height) {
  return { x: position.x / 100 * width, y: Math.min(height - 30, Math.max(44, position.y / 100 * height)) }
}

export default function FormationView({
  formation,
  positions,
  squad,
  subLog,
  minute,
  playMinutes,
  fieldStartMinute,
  onPositionsChange,
  onResetOppsett,
  onResetSpilletid,
}) {
  const svgRef = useRef(null)
  const pitchRef = useRef(null)
  const benchRef = useRef(null)
  const touchHoldTimer = useRef(null)
  const [pitchHeight, setPitchHeight] = useState(320)
  useLayoutEffect(() => {
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setPitchHeight(Math.round(height * 340 / width))
    })
    observer.observe(pitchRef.current)
    return () => observer.disconnect()
  }, [])

  // Always-current refs – event handlers never use stale closures
  const positionsRef     = useRef(positions)
  const formationRef     = useRef(formation)
  const onPosChangeRef   = useRef(onPositionsChange)
  useLayoutEffect(() => {
    positionsRef.current = positions
    formationRef.current = formation
    onPosChangeRef.current = onPositionsChange
  }, [positions, formation, onPositionsChange])

  // Touch drag tracking via refs (no async state delay)
  const activeTouchDrag  = useRef(null) // { type: 'bench'|'field', playerId, source? }
  const touchListeners   = useRef(null) // { move, end } – for cleanup
  const suppressClickUntil = useRef(0)
  const [selection, setSelection] = useState(null)

  useEffect(() => () => {
    clearTimeout(touchHoldTimer.current)
    const listeners = touchListeners.current
    if (!listeners) return
    document.removeEventListener('touchmove', listeners.move)
    document.removeEventListener('touchend', listeners.end)
    document.removeEventListener('touchcancel', listeners.cancel)
  }, [])

  // Mouse drag state (for desktop HTML5 DnD)
  const [fieldDragging, setFieldDragging] = useState(null)
  const [benchDragging, setBenchDragging] = useState(null)
  const [benchTailIds,  setBenchTailIds]  = useState(new Set())

  // Visual feedback only
  const [dragOver, setDragOver] = useState(null)
  const [panel, setPanel] = useState(null) // null | 'log' | 'actions' | 'oppsett' | 'spilletid'

  const formDef    = FORMATIONS[formation]
  const playerById = Object.fromEntries(squad.map(p => [p.id, p]))
  const onField    = new Set(Object.values(positions))
  const selected = selection && playerById[selection.playerId] && (
    selection.source == null
      ? !onField.has(selection.playerId)
      : positions[selection.source] === selection.playerId
  ) ? selection : null

  function handlePlayerClick(playerId, source = null, event) {
    if (event.timeStamp < suppressClickUntil.current) return
    if (selected?.playerId === playerId) {
      setSelection(null)
    } else if (selected && (selected.source == null) !== (source == null)) {
      applyBenchDrop(source ?? selected.source, source == null ? playerId : selected.playerId)
      setSelection(null)
    } else {
      setSelection({ playerId, source })
    }
  }

  function handlePositionClick(posId, event) {
    if (event.timeStamp < suppressClickUntil.current) return
    const playerId = positions[posId]
    if (playerId) handlePlayerClick(playerId, posId, event)
    else if (selected?.source == null && selected) {
      applyBenchDrop(posId, selected.playerId)
      setSelection(null)
    }
  }

  // Last sub-off index per player (higher = more recently benched)
  const lastSubOffIndex = {}
  ;(subLog ?? []).forEach((entry, i) => { lastSubOffIndex[entry.outId] = i })

  const bench = squad.filter(p => !onField.has(p.id)).sort((a, b) => {
    const aIsTail = benchTailIds.has(a.id)
    const bIsTail = benchTailIds.has(b.id)
    if (aIsTail && !bIsTail) return 1
    if (!aIsTail && bIsTail) return -1
    const ai = lastSubOffIndex[a.id]
    const bi = lastSubOffIndex[b.id]
    if (ai === undefined && bi === undefined) return a.number - b.number
    if (ai === undefined) return -1
    if (bi === undefined) return 1
    return ai - bi
  })
  const benchOverflow = bench.length > 8

  function playerTime(id, isOnField) {
    const acc = (playMinutes ?? {})[id] ?? 0
    if (isOnField) return acc + ((minute ?? 0) - ((fieldStartMinute ?? {})[id] ?? 0))
    return acc
  }

  function stintColor(id) {
    const start = (fieldStartMinute ?? {})[id]
    const stint = (minute ?? 0) - (start ?? 0)
    if (stint >= 20) return { bg: '#dc2626', text: 'white' }
    if (stint >= 13) return { bg: '#eab308', text: '#1f2937' }
    return { bg: '#16a34a', text: 'white' }
  }

  // ── Coordinate helpers ─────────────────────────────────────────

  function findPosAtPoint(clientX, clientY) {
    if (!svgRef.current) return null
    const matrix = svgRef.current.getScreenCTM()
    if (!matrix) return null
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
    const { width, height } = svgRef.current.viewBox.baseVal
    const fd   = FORMATIONS[formationRef.current]
    let closest = null, minDist = Infinity
    for (const pos of fd.positions) {
      const target = fieldPoint(pos, width, height)
      const d = Math.hypot(target.x - point.x, target.y - point.y)
      if (d < minDist) { minDist = d; closest = pos.id }
    }
    return minDist < 36 ? closest : null
  }

  function isInBench(clientX, clientY) {
    const rect = benchRef.current?.getBoundingClientRect()
    return rect && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  }

  // ── Apply helpers (always use refs) ───────────────────────────

  function applyBenchDrop(posId, inId) {
    setSelection(null)
    const pos    = positionsRef.current
    const outId  = pos[posId]
    const newPos = { ...pos, [posId]: inId }
    onPosChangeRef.current(newPos, outId ? { inId, outId } : null)
    setBenchTailIds(prev => { const s = new Set(prev); s.delete(inId); return s })
  }

  function applyFieldDrop(posId, playerId, source) {
    setSelection(null)
    if (posId === source) return
    const newPos   = { ...positionsRef.current }
    const existing = newPos[posId]
    if (existing) { newPos[source] = existing } else { delete newPos[source] }
    newPos[posId] = playerId
    onPosChangeRef.current(newPos)
  }

  function applyFieldToBench(source) {
    setSelection(null)
    const newPos   = { ...positionsRef.current }
    const playerId = newPos[source]
    delete newPos[source]
    onPosChangeRef.current(newPos)
    setBenchTailIds(prev => new Set([...prev, playerId]))
  }

  // ── Touch: attach non-passive listeners SYNCHRONOUSLY ─────────
  // This avoids the useEffect timing gap where touchmove fires
  // passively before React re-renders and the effect runs.

  function removeTouchListeners() {
    clearTimeout(touchHoldTimer.current)
    if (!touchListeners.current) return
    document.removeEventListener('touchmove', touchListeners.current.move)
    document.removeEventListener('touchend',  touchListeners.current.end)
    document.removeEventListener('touchcancel', touchListeners.current.cancel)
    touchListeners.current = null
  }

  function attachTouchListeners(moveHandler, endHandler) {
    removeTouchListeners()
    document.addEventListener('touchmove', moveHandler, { passive: false })
    document.addEventListener('touchend',  endHandler)
    const cancel = (event) => {
      activeTouchDrag.current = null
      setBenchDragging(null)
      setDragOver(null)
      suppressClickUntil.current = event.timeStamp + 500
      removeTouchListeners()
    }
    document.addEventListener('touchcancel', cancel)
    touchListeners.current = { move: moveHandler, end: endHandler, cancel }
  }

  function onBenchTouchStart(e, playerId) {
    const start = e.touches[0]
    let moved = false
    let allowVerticalDrag = !benchOverflow
    activeTouchDrag.current = { type: 'bench', playerId }

    function move(e) {
      if (!moved && Math.hypot(e.touches[0].clientX - start.clientX, e.touches[0].clientY - start.clientY) < 8) return
      if (!moved && !allowVerticalDrag && Math.abs(e.touches[0].clientY - start.clientY) > Math.abs(e.touches[0].clientX - start.clientX)) {
        // A quick vertical swipe scrolls a large bench. Holding first still
        // allows a touch drag; normal two-row benches need no long press.
        activeTouchDrag.current = null
        removeTouchListeners()
        return
      }
      moved = true
      setSelection(null)
      setBenchDragging(playerId)
      e.preventDefault()
      setDragOver(findPosAtPoint(e.touches[0].clientX, e.touches[0].clientY))
    }

    function end(e) {
      const { clientX, clientY } = e.changedTouches[0]
      const drag = activeTouchDrag.current
      if (drag && moved) {
        suppressClickUntil.current = e.timeStamp + 500
        const posId = findPosAtPoint(clientX, clientY)
        if (posId) applyBenchDrop(posId, drag.playerId)
      }
      activeTouchDrag.current = null
      setBenchDragging(null)
      setDragOver(null)
      removeTouchListeners()
    }

    attachTouchListeners(move, end)
    if (benchOverflow) touchHoldTimer.current = setTimeout(() => { allowVerticalDrag = true }, 220)
  }

  function onFieldTouchStart(e, playerId, source) {
    const start = e.touches[0]
    let moved = false
    activeTouchDrag.current = { type: 'field', playerId, source }

    function move(e) {
      if (!moved && Math.hypot(e.touches[0].clientX - start.clientX, e.touches[0].clientY - start.clientY) < 8) return
      moved = true
      setSelection(null)
      e.preventDefault()
      const { clientX, clientY } = e.touches[0]
      setDragOver(isInBench(clientX, clientY) ? 'bench' : findPosAtPoint(clientX, clientY))
    }

    function end(e) {
      const { clientX, clientY } = e.changedTouches[0]
      const drag = activeTouchDrag.current
      if (drag && moved) {
        suppressClickUntil.current = e.timeStamp + 500
        if (isInBench(clientX, clientY)) {
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

  const W = 340, H = pitchHeight
  const playerRadius = Math.min(24, Math.max(17, H / 14))
  const fontScale = playerRadius / 24

  return (
    <div className="match-layout select-none">
      <p className="sr-only" aria-live="polite">{selected ? `${playerById[selected.playerId].name} valgt` : ''}</p>
      <div ref={pitchRef} className="pitch-frame">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="match-pitch rounded-xl border-2 border-green-800"
        aria-label="Fotballbane"
        style={{ background: '#2d7a2d' }}
        onDragOver={e => e.preventDefault()}
      >
        <FieldLines W={W} H={H} />

        {formDef.positions.map(pos => {
          const playerId = positions[pos.id]
          const player   = playerId ? playerById[playerId] : null
          const { x: cx, y: cy } = fieldPoint(pos, W, H)
          const isOver   = dragOver === pos.id
          const isSelected = selected?.playerId === playerId && !!player

          return (
            <g
              key={pos.id}
              role="button"
              tabIndex={0}
              aria-label={player ? `${player.number} ${player.name}, ${pos.label}` : `Ledig posisjon: ${pos.label}`}
              aria-pressed={isSelected}
              onClick={e => handlePositionClick(pos.id, e)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePositionClick(pos.id, e) }
              }}
              onTouchStart={e => { if (player) onFieldTouchStart(e, playerId, pos.id) }}
              style={{ cursor: 'pointer', touchAction: 'none' }}
              onDragOver={e => { e.preventDefault(); setDragOver(pos.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => onFieldMouseDrop(pos.id)}
            >
              <circle
                cx={cx} cy={cy} r={playerRadius + 4}
                fill={isOver ? (benchDragging ? 'rgba(220,38,38,0.35)' : 'rgba(255,255,255,0.28)') : 'rgba(0,0,0,0.2)'}
                stroke={isOver ? (benchDragging ? '#ef4444' : 'white') : 'rgba(255,255,255,0.35)'}
                strokeWidth="2"
                strokeDasharray={player ? '0' : '5,3'}
              />
              {player ? (
                <>
                  <circle
                    cx={cx} cy={cy} r={playerRadius}
                    fill={isSelected ? '#ec4899' : '#1d4ed8'}
                    stroke={isSelected ? '#fbcfe8' : '#60a5fa'}
                    strokeWidth="2.5"
                    draggable
                    onDragStart={e => {
                      setSelection(null)
                      setFieldDragging({ playerId, source: pos.id })
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={e => { suppressClickUntil.current = e.timeStamp + 500; setFieldDragging(null); setDragOver(null) }}
                    style={{ cursor: 'pointer' }}
                  />
                  <text x={cx} y={cy - 7} textAnchor="middle" dominantBaseline="middle"
                    fontSize={13 * fontScale} fontWeight="bold" fill="white" style={{ pointerEvents: 'none' }}>
                    {player.number}
                  </text>
                  <text x={cx} y={cy + 9} textAnchor="middle" dominantBaseline="middle"
                    fontSize={9.5 * fontScale} fill={isSelected ? '#fff' : '#bfdbfe'} style={{ pointerEvents: 'none' }}>
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
      </div>

      <section className="bench-dock" aria-label="Benk">
        <div className="bench-heading">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Benk ({bench.length})</p>
          <div className="flex gap-2 text-[9px] text-gray-400" aria-label="Spilletidsfarger">
        {[['#16a34a','1–12m'],['#eab308','13–19m'],['#dc2626','≥20m']].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="w-5 h-3 rounded shrink-0" style={{ background: c }} />
            {l}
          </span>
        ))}
          </div>
        </div>
          <div ref={benchRef} className={`bench-grid ${dragOver === 'bench' ? 'bench-drop-active' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver('bench') }}
            onDragLeave={() => setDragOver(null)} onDrop={onBenchZoneDrop}
            tabIndex={benchOverflow ? 0 : undefined} role={benchOverflow ? 'region' : undefined}
            aria-label={benchOverflow ? 'Benkspillere, rull for flere' : undefined}>
            {bench.length === 0 && <p className="col-span-4 text-gray-500 text-sm text-center pt-4">Alle er på banen</p>}
            {bench.map(player => (
              <button
                type="button"
                key={player.id}
                aria-label={`${player.number} ${player.name}, ${playerTime(player.id, false)} minutter`}
                title={benchOverflow ? `${player.name} – hold inne for å dra, sveip for å rulle` : player.name}
                aria-pressed={selected?.playerId === player.id}
                onClick={e => handlePlayerClick(player.id, null, e)}
                draggable
                onDragStart={e => {
                  setSelection(null)
                  setBenchDragging(player.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={e => { suppressClickUntil.current = e.timeStamp + 500; setBenchDragging(null); setDragOver(null) }}
                onTouchStart={e => onBenchTouchStart(e, player.id)}
                style={{ touchAction: benchOverflow ? 'pan-y' : 'none' }}
                className={`bench-player rounded-xl cursor-pointer border text-white ${selected?.playerId === player.id ? 'bg-pink-600 border-pink-200 ring-2 ring-inset ring-pink-300' : 'bg-gray-800 border-gray-700'}`}
              >
                <span className="bench-player-meta">
                <span className={`bench-number rounded-full font-bold ${selected?.playerId === player.id ? 'bg-pink-500' : 'bg-blue-600'}`}>
                  {player.number}
                </span>
                <span className="text-[10px] font-bold text-green-400">{playerTime(player.id, false)}m</span>
                </span>
                <span className="bench-name">{player.name}</span>
              </button>
            ))}
          </div>
        <div className="match-actions">
          <button type="button" onClick={() => setPanel('log')} aria-haspopup="dialog" aria-expanded={panel === 'log'}>Byttelogg ({subLog.length})</button>
          <button type="button" onClick={() => setPanel('actions')} aria-haspopup="dialog" aria-expanded={panel !== null && panel !== 'log'}>Nullstill…</button>
        </div>
      </section>

      {panel && <OverlayPanel title={panel === 'log' ? 'Byttelogg' : panel === 'actions' ? 'Kamphandlinger' : 'Bekreft nullstilling'} onClose={() => setPanel(null)}>
        {panel === 'log' ? <SubLog log={subLog} squad={squad} /> : panel === 'actions' ? (
          <div className="grid gap-3">
            <button type="button" onClick={() => setPanel('oppsett')} className="rounded-xl bg-gray-800 p-3 text-sm">Nullstill kampoppsett</button>
            <button type="button" onClick={() => setPanel('spilletid')} className="rounded-xl bg-gray-800 p-3 text-sm">Nullstill spilletid</button>
          </div>
        ) : <div className="space-y-4">
          <p className="text-sm text-red-200">{panel === 'spilletid' ? 'Nullstill spilletid og byttelogg?' : 'Tøm kampoppsettet?'}</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => {
              setSelection(null)
              if (panel === 'spilletid') { setBenchTailIds(new Set()); onResetSpilletid() }
              else onResetOppsett()
              setPanel(null)
            }} className="bg-red-600 rounded-lg px-4 py-2 text-sm font-bold">Ja</button>
            <button type="button" onClick={() => setPanel(null)} className="bg-gray-700 rounded-lg px-4 py-2 text-sm">Avbryt</button>
          </div>
        </div>}
      </OverlayPanel>}
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
