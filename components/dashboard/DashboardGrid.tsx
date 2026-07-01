type DashboardGridProps = {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export default function DashboardGrid({
  children,
  columns = 4,
  className = '',
}: DashboardGridProps) {
  const desktopColumns =
    columns === 1
      ? 'lg:grid-cols-1'
      : columns === 2
        ? 'lg:grid-cols-2'
        : columns === 3
          ? 'lg:grid-cols-3'
          : 'lg:grid-cols-4'

  return (
    <section
      className={[
        'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5',
        desktopColumns,
        className,
      ].join(' ')}
    >
      {children}
    </section>
  )
}