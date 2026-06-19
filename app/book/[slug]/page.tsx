import { supabase } from '@/lib/supabase'
import BookingForm from '@/components/BookingForm'

type Theme = {
  page: string
  card: string
  innerCard: string
  text: string
  muted: string
}

const themes: Record<string, Theme> = {
  classic_dark: {
    page: 'bg-[#020617] text-white',
    card: 'border-white/10 bg-white/[0.05]',
    innerCard: 'border-white/10 bg-black/20',
    text: 'text-slate-300',
    muted: 'text-slate-500',
  },
  clean_light: {
    page: 'bg-slate-50 text-slate-950',
    card: 'border-slate-200 bg-white',
    innerCard: 'border-slate-200 bg-slate-50',
    text: 'text-slate-600',
    muted: 'text-slate-400',
  },
  luxury_gold: {
    page: 'bg-black text-white',
    card: 'border-yellow-700/30 bg-yellow-950/10',
    innerCard: 'border-yellow-700/30 bg-black/30',
    text: 'text-yellow-100/80',
    muted: 'text-yellow-600',
  },
  clinic_rose: {
    page: 'bg-rose-50 text-rose-950',
    card: 'border-rose-200 bg-white',
    innerCard: 'border-rose-200 bg-rose-50',
    text: 'text-rose-700',
    muted: 'text-rose-400',
  },
  electric_blue: {
    page: 'bg-slate-950 text-white',
    card: 'border-blue-500/20 bg-blue-950/20',
    innerCard: 'border-blue-500/20 bg-black/20',
    text: 'text-blue-100/80',
    muted: 'text-blue-400',
  },
  forest_green: {
    page: 'bg-emerald-950 text-white',
    card: 'border-emerald-500/20 bg-emerald-900/20',
    innerCard: 'border-emerald-500/20 bg-black/20',
    text: 'text-emerald-100/80',
    muted: 'text-emerald-400',
  },
  monochrome: {
    page: 'bg-neutral-950 text-white',
    card: 'border-neutral-700 bg-neutral-900',
    innerCard: 'border-neutral-700 bg-black/20',
    text: 'text-neutral-300',
    muted: 'text-neutral-500',
  },
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <h1 className="text-4xl font-bold">Business not found</h1>
      </main>
    )
  }

  const { data: services } = await supabase
    .from('services')
    .select(`
      id,
      name,
      description,
      price,
      duration_minutes,
      category,
      service_type,
      is_add_on,
      parent_service_id,
      recommended_service_ids,
      requires_service_id,
      bundle_price,
      bundle_discount_type,
      bundle_discount_value,
      sort_order,
      is_active
    `)
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('*')
    .eq('business_id', business.id)
    .order('full_name')

  const theme = themes[business.brand_theme || 'classic_dark'] || themes.classic_dark
  const primaryColour = business.primary_colour || '#7c3aed'
  const secondaryColour = business.secondary_colour || '#2563eb'

  const description =
    business.business_description ||
    'Book your appointment online in just a few steps.'

  return (
    <main className={`relative min-h-screen overflow-hidden ${theme.page}`}>
      <div
        className="absolute inset-0 opacity-35"
        style={{
          background: `radial-gradient(circle at top left, ${primaryColour}55 0%, transparent 30%), radial-gradient(circle at bottom right, ${secondaryColour}55 0%, transparent 34%)`,
        }}
      />

      {business.hero_image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${business.hero_image_url})` }}
        />
      )}

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <header className="mb-5">
          <div className={`rounded-[28px] border p-5 backdrop-blur-2xl md:p-6 ${theme.card}`}>
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                {business.logo_url && (
                  <img
                    src={business.logo_url}
                    alt={business.business_name}
                    className="mb-4 max-h-14 max-w-44 object-contain"
                  />
                )}

                <div
                  className="mb-3 inline-flex rounded-full px-3 py-1.5 text-xs font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
                  }}
                >
                  Online booking
                </div>

                <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                  {business.business_name}
                </h1>

                <p className={`mt-3 max-w-2xl text-base leading-7 ${theme.text}`}>
                  {description}
                </p>
              </div>

              <div className={`rounded-2xl border px-4 py-3 text-sm ${theme.innerCard}`}>
                <p className={`font-bold ${theme.muted}`}>Book online</p>
                <p className={theme.text}>Choose services, time and confirm.</p>
              </div>
            </div>
          </div>
        </header>

        <BookingForm
          businessId={business.id}
          services={services || []}
          teamMembers={teamMembers || []}
          primaryColour={primaryColour}
          secondaryColour={secondaryColour}
          cardClassName={theme.card}
          innerCardClassName={theme.innerCard}
          textClassName={theme.text}
          mutedClassName={theme.muted}
        />

        <footer className={`mt-8 text-center text-sm ${theme.muted}`}>
          Powered by AMB Booking
        </footer>
      </div>
    </main>
  )
}
