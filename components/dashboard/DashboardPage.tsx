type DashboardPageProps = {
  children: React.ReactNode
  className?: string
}

export default function DashboardPage({
  children,
  className = '',
}: DashboardPageProps) {
  return (
    <main
      className={[
        'mx-auto w-full max-w-7xl space-y-6 sm:space-y-8',
        className,
      ].join(' ')}
    >
      {children}
    </main>
  )
}