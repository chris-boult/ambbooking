import type { ReactNode } from 'react'

type SectionCardProps = {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export default function SectionCard({
  title,
  description,
  actions,
  children,
  className = '',
}: SectionCardProps) {
  return (
    <section
      className={[
        'overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111f] shadow-[0_35px_120px_rgba(0,0,0,.32)]',
        className,
      ].join(' ')}
    >
      {(title || actions) && (
        <header className="border-b border-white/10 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              {title && (
                <h2 className="text-xl font-black tracking-[-0.03em] text-white">
                  {title}
                </h2>
              )}

              {description && (
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {description}
                </p>
              )}
            </div>

            {actions && (
              <div className="flex flex-wrap gap-2">
                {actions}
              </div>
            )}
          </div>
        </header>
      )}

      <div className="p-5 sm:p-7">
        {children}
      </div>
    </section>
  )
}