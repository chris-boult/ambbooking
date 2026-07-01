type DashboardHeroProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
  children?: React.ReactNode
}

export default function DashboardHero({
  eyebrow,
  title,
  description,
  actions,
  children,
}: DashboardHeroProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111f] p-5 shadow-[0_40px_140px_rgba(0,0,0,.35)] sm:rounded-[3rem] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300 sm:px-5 sm:text-xs">
              {eyebrow}
            </div>
          )}

          <h1 className="max-w-5xl text-3xl font-black leading-[1.05] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          {description && (
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:mt-6 sm:text-lg sm:leading-8">
              {description}
            </p>
          )}

          {children}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </section>
  )
}