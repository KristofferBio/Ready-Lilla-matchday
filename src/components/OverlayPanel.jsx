import { useId, useLayoutEffect, useRef } from 'react'

export default function OverlayPanel({ title, onClose, children }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog.contains(document.activeElement)) dialog.querySelector('button')?.focus()
  }, [title])

  return (
    <dialog ref={dialogRef} className="panel-sheet" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="panel-header">
        <h2 id={titleId} className="font-bold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-lg bg-gray-800 px-3 py-2 text-sm" aria-label={`Lukk ${title.toLocaleLowerCase('nb')}`}>Lukk</button>
      </div>
      <div className="panel-body">{children}</div>
    </dialog>
  )
}
