import { supabase } from '@/lib/supabase'
import BookingForm from '@/components/BookingForm'

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

  const primaryColour = business.primary_colour || '#7c3aed'
  const secondaryColour = business.secondary_colour || '#2563eb'
  const description =
    business.business_description ||
    'Choose a service, select a team member and book your appointment online.'

  return (
    <main className="min-h-screen bg-[#020617] text-white relative overflow-hidden">
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
          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-8 md:p-10">
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
              className="inline-flex rounded-full px-4 py-2 text-sm font-bold mb-6"
              style={{
                background: `${primaryColour}22`,
                color: '#ffffff',
                border: `1px solid ${primaryColour}66`,
              }}
            >
              Online booking
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
              {business.business_name}
            </h1>

            <p className="text-slate-300 text-xl leading-8 max-w-3xl">
              {description}
            </p>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-8">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.25em] mb-2">
                  Step one
                </p>
                <h2 className="text-3xl font-bold">Choose a service</h2>
              </div>

              <div
                className="h-12 w-12 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
                }}
              />
            </div>

            <div className="space-y-4">
              {services?.map((service) => (
                <div
                  key={service.id}
                  className="border border-white/10 bg-black/20 rounded-2xl p-5"
                >
                  <h3 className="text-xl font-bold">{service.name}</h3>

                  {service.description && (
                    <p className="text-slate-400 mt-2 leading-6">
                      {service.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 mt-4 text-sm text-slate-300">
                    <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1">
                      {service.duration_minutes} mins
                    </span>

                    <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1">
                      £{service.price}
                    </span>

                    {service.payment_type === 'deposit' && (
                      <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1">
                        £{service.deposit_amount} deposit
                      </span>
                    )}

                    {service.payment_type === 'full' && (
                      <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1">
                        Pay online
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {(!services || services.length === 0) && (
                <p className="text-slate-500">No services available yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-8">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.25em] mb-2">
                  Step two
                </p>
                <h2 className="text-3xl font-bold">Choose your specialist</h2>
              </div>

              <div
                className="h-12 w-12 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${secondaryColour}, ${primaryColour})`,
                }}
              />
            </div>

            <div className="space-y-4">
              {teamMembers?.map((member) => (
                <div
                  key={member.id}
                  className="border border-white/10 bg-black/20 rounded-2xl p-5"
                >
                  <h3 className="text-xl font-bold">{member.full_name}</h3>

                  {member.role && (
                    <p className="text-slate-400 mt-1">{member.role}</p>
                  )}
                </div>
              ))}

              {(!teamMembers || teamMembers.length === 0) && (
                <p className="text-slate-500">No team members available yet.</p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl p-8 md:p-10">
          <div className="mb-8">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.25em] mb-2">
              Step three
            </p>

            <h2 className="text-3xl md:text-4xl font-bold">
              Book your appointment
            </h2>

            <p className="text-slate-400 mt-3">
              Select your service, team member, date and time to confirm your booking.
            </p>
          </div>

          <BookingForm
            businessId={business.id}
            services={services || []}
            teamMembers={teamMembers || []}
          />
        </section>

        <footer className="text-center text-slate-600 text-sm mt-10">
          Powered by AMB Booking
        </footer>
      </div>
    </main>
  )
}