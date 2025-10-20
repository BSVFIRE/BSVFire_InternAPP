export function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    utkast: { label: 'Utkast', className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
    sendt: { label: 'Sendt', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    godkjent: { label: 'Godkjent', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    avvist: { label: 'Avvist', className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.utkast

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}
