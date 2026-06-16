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
        <h1 className="text-4xl font-bold">
          Business not found
        </h1>
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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">

        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-3">
            {business.business_name}
          </h1>

          <p className="text-slate-400 text-xl">
            Book your appointment online
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-6">
              Services
            </h2>

            <div className="space-y-4">
              {services?.map((service) => (
                <div
                  key={service.id}
                  className="border border-slate-800 rounded-xl p-5"
                >
                  <h3 className="text-xl font-semibold">
                    {service.name}
                  </h3>

                  <p className="text-slate-400 mt-2">
                    {service.description}
                  </p>

                  <div className="flex gap-4 mt-4 text-slate-300">
                    <span>
                      {service.duration_minutes} mins
                    </span>

                    <span>
                      £{service.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-6">
              Team Members
            </h2>

            <div className="space-y-4">
              {teamMembers?.map((member) => (
                <div
                  key={member.id}
                  className="border border-slate-800 rounded-xl p-5"
                >
                  <h3 className="text-xl font-semibold">
                    {member.full_name}
                  </h3>

                  <p className="text-slate-400">
                    {member.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

<div className="mt-10">
  <BookingForm
  businessId={business.id}
  services={services || []}
  teamMembers={teamMembers || []}
/>
</div>

</div>
</main>
  )
}