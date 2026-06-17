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
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <h1 className="text-4xl font-bold">Business not found</h1>
      </main>
    )
  }

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .order('name')

  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('*')
    .eq('business_id', business.id)
    .order('full_name')

  const theme =
    themes[business.brand_theme || 'classic_dark'] || themes.classic_dark

  const primaryColour = business.primary_colour || '#7c3aed'
  const secondaryColour = business.secondary_colour || '#2563eb'

  const description =
    business.business_description ||
    'Choose a service, select a team member and book your appointment online.'

  return (
    <main className={`min-h-screen relative overflow-hidden ${theme.page}`}>
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at top left, ${primaryColour}66 0%, transparent 32%), radial-gradient(circle at bottom right, ${secondaryColour}66 0%, transparent 34%)`,
        }}
      />

      {business.hero_image_url && (
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{
            backgroundImage: `url(${business.hero_image_url})`,
          }}
        />
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <header className="mb-14">
          <div
            className={`rounded-[32px] border backdrop-blur-2xl p-8 md:p-10 ${theme.card}`}
          >
            {business.logo_url && (
              <div className="mb-8">
                <img
                  src={business.logo_url}
                  alt={business.business_name}
                  className="max-h-20 max-w-56 object-contain"
                />
              </div>
            )}

            <div
              className="inline-flex rounded-full px-4 py-2 text-sm font-bold mb-6 text-white"
              style={{
                background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
              }}
            >
              Online booking
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
              {business.business_name}
            </h1>

            <p className={`text-xl leading-8 max-w-3xl ${theme.text}`}>
              {description}
            </p>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          <section
            className={`rounded-[28px] border backdrop-blur-xl p-8 ${theme.card}`}
          >
            <p className={`text-sm font-bold uppercase tracking-[0.25em] mb-2 ${theme.muted}`}>
              Step one
            </p>

            <h2 className="text-3xl font-bold mb-8">Choose a service</h2>

            <div className="space-y-4">
              {(services || []).map((service) => (
                <div
                  key={service.id}
                  className={`border rounded-2xl p-5 ${theme.innerCard}`}
                >
                  <h3 className="text-xl font-bold">{service.name}</h3>

                  {service.description && (
                    <p className={`mt-2 leading-6 ${theme.text}`}>
                      {service.description}
                    </p>
                  )}

                  <div className={`flex flex-wrap gap-3 mt-4 text-sm ${theme.text}`}>
                    <span>{service.duration_minutes} mins</span>
                    <span>£{service.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            className={`rounded-[28px] border backdrop-blur-xl p-8 ${theme.card}`}
          >
            <p className={`text-sm font-bold uppercase tracking-[0.25em] mb-2 ${theme.muted}`}>
              Step two
            </p>

            <h2 className="text-3xl font-bold mb-8">Choose your specialist</h2>

            <div className="space-y-4">
              {(teamMembers || []).map((member) => (
                <div
                  key={member.id}
                  className={`border rounded-2xl p-5 ${theme.innerCard}`}
                >
                  <h3 className="text-xl font-bold">{member.full_name}</h3>

                  {member.role && (
                    <p className={`mt-1 ${theme.text}`}>{member.role}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <section
          className={`rounded-[32px] border backdrop-blur-2xl p-8 md:p-10 ${theme.card}`}
        >
          <p className={`text-sm font-bold uppercase tracking-[0.25em] mb-2 ${theme.muted}`}>
            Step three
          </p>

          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Book your appointment
          </h2>

          <p className={`mb-8 ${theme.text}`}>
            Select your service, team member, date and time to confirm your booking.
          </p>

          <BookingForm
            businessId={business.id}
            services={services || []}
            teamMembers={teamMembers || []}
          />
        </section>

        <footer className={`text-center text-sm mt-10 ${theme.muted}`}>
          Powered by AMB Booking
        </footer>
      </div>
    </main>
  )
}