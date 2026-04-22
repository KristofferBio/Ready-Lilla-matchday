export default function SubLog({ log, squad }) {
  const playerById = Object.fromEntries(squad.map(p => [p.id, p]))

  if (log.length === 0) return null

  return (
    <div className="w-full">
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">
        Byttelogg
      </p>
      <div className="space-y-2">
        {log.map((entry, i) => {
          const inn = playerById[entry.inId]
          const ut  = playerById[entry.outId]
          return (
            <div key={i} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-green-400 font-mono font-bold text-base min-w-[44px]">
                {entry.minute}'
              </span>
              <div className="flex flex-col gap-0.5 text-sm">
                <span className="text-green-400">
                  ↓ Inn: #{inn?.number} {inn?.name}
                </span>
                <span className="text-red-400">
                  ↑ Ut: #{ut?.number} {ut?.name}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
