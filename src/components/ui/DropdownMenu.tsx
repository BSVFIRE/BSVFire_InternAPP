/**
 * Enkel nedtrekksmeny uten avhengigheter.
 *
 *   <DropdownMenu trigger={open => <IconButton label="Mer" icon={<MoreHorizontal />} aria-expanded={open} />}>
 *     <MenuItem icon={<DollarSign />} onSelect={…}>Kontrollpriser</MenuItem>
 *     <MenuSeparator />
 *     <MenuItem href="https://…">Åpne kontrollportal</MenuItem>
 *   </DropdownMenu>
 *
 * Lukkes ved klikk utenfor, Escape, og etter valg. Piltaster flytter fokus mellom valgene.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const LukkContext = createContext<() => void>(() => {})

export function DropdownMenu({ trigger, children, align = 'right', className }: {
  trigger: (open: boolean) => ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function utenfor(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    function tast(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
      if (items.length === 0) return
      e.preventDefault()
      const i = items.indexOf(document.activeElement as HTMLElement)
      const neste = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
      items[neste].focus()
    }
    document.addEventListener('mousedown', utenfor)
    document.addEventListener('keydown', tast)
    return () => { document.removeEventListener('mousedown', utenfor); document.removeEventListener('keydown', tast) }
  }, [open])

  return (
    <div ref={ref} className={cn('relative inline-flex', className)} onClick={e => { if ((e.target as HTMLElement).closest('[data-menu-trigger]')) setOpen(o => !o) }}>
      <div data-menu-trigger className="inline-flex">{trigger(open)}</div>
      {open && (
        <LukkContext.Provider value={() => setOpen(false)}>
          <div role="menu" className={cn('absolute top-full mt-1.5 min-w-[220px] rounded-lg bg-white dark:bg-dark-50 border border-gray-200 dark:border-gray-800 shadow-xl p-1.5 z-30', align === 'right' ? 'right-0' : 'left-0')}>
            {children}
          </div>
        </LukkContext.Provider>
      )}
    </div>
  )
}

const ITEM = 'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-left text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-100 focus-visible:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-dark-100 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-gray-400 [&>svg]:flex-shrink-0'

export function MenuItem({ icon, children, onSelect, href, danger }: { icon?: ReactNode; children: ReactNode; onSelect?: () => void; href?: string; danger?: boolean }) {
  const lukk = useContext(LukkContext)
  const kl = cn(ITEM, danger && 'text-red-600 dark:text-red-400 [&>svg]:text-red-500')
  if (href) {
    return <a role="menuitem" href={href} target="_blank" rel="noopener noreferrer" className={kl} onClick={lukk}>{icon}{children}</a>
  }
  return <button role="menuitem" type="button" className={kl} onClick={() => { lukk(); onSelect?.() }}>{icon}{children}</button>
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{children}</div>
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 border-t border-gray-200 dark:border-gray-800" />
}
