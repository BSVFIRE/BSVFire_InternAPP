/**
 * Knapper – én stil for hele appen.
 *
 *   <Button variant="primary">Ny ordre</Button>
 *   <Button variant="outline" icon={<Edit />} kbd="E">Rediger</Button>
 *   <Button variant="ghost">Avbryt</Button>
 *   <IconButton label="Dropbox-filer" icon={<Cloud />} />
 *   <IconButtonGroup> <IconButton … /> <IconButton … /> </IconButtonGroup>
 *
 * Bare én knapp per skjermbilde bør være `primary`. Sekundære handlinger er `outline`
 * eller `ghost`, og ikon-knapper samles i en IconButtonGroup.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const BASE = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark disabled:opacity-50 disabled:pointer-events-none [&>svg]:w-4 [&>svg]:h-4 [&>svg]:flex-shrink-0'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white font-semibold hover:bg-primary-600 active:bg-primary-700',
  outline: 'border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-100',
  ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 hover:text-gray-900 dark:hover:text-white',
  danger: 'text-red-600 dark:text-red-400 hover:bg-red-500/10',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  /** Tastatursnarvei vist som liten «tast» til høyre – kun visuell, koble selv med useEffect */
  kbd?: string
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'outline', size = 'sm', icon, kbd, loading, className, children, disabled, type = 'button', ...rest }, ref
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={cn(BASE, VARIANT[variant], SIZE[size], className)} {...rest}>
      {loading ? <Loader2 className="animate-spin" /> : icon}
      {children}
      {kbd && <kbd className="hidden md:inline ml-1 px-1.5 py-px rounded border border-current/30 text-[11px] font-mono font-normal opacity-60">{kbd}</kbd>}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tilgjengelig navn og tooltip */
  label: string
  icon: ReactNode
  variant?: 'outline' | 'ghost'
  active?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'outline', active, className, type = 'button', ...rest }, ref
) {
  return (
    <button ref={ref} type={type} aria-label={label} title={label}
      className={cn(BASE, 'w-9 h-9 px-0 text-gray-500 dark:text-gray-400', VARIANT[variant], active && 'text-primary bg-primary/10', className)} {...rest}>
      {icon}
    </button>
  )
})

/** Samler ikon-knapper i én pille med skillelinjer. Barn skal være IconButton med variant="ghost". */
export function IconButtonGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="group" className={cn(
      'inline-flex rounded-lg border border-gray-300 dark:border-gray-700 divide-x divide-gray-300 dark:divide-gray-700',
      // Ikke overflow-hidden: nedtrekksmenyer inne i gruppen må kunne stikke ut. Rund derfor første/siste barn eksplisitt.
      '[&>*]:rounded-none [&>*]:h-[34px] [&>*]:border-0 [&>*:first-child]:rounded-l-[7px] [&>*:last-child]:rounded-r-[7px]',
      '[&>*:first-child>button]:rounded-l-[7px] [&>*:last-child>button]:rounded-r-[7px]',
      className)}>
      {children}
    </div>
  )
}
