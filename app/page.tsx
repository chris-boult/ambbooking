import Hero from '@/components/landing/Hero'
import BookingJourney from '@/components/landing/BookingJourney'
import CalendarShowcase from '@/components/landing/CalendarShowcase'
import CRMShowcase from '@/components/landing/CRMShowcase'
import MoneyCentreShowcase from '@/components/landing/MoneyCentreShowcase'
import GrowthAutomation from '@/components/landing/GrowthAutomation'
import WhiteLabelShowcase from '@/components/landing/WhiteLabelShowcase'
import EnterpriseShowcase from '@/components/landing/EnterpriseShowcase'
import PricingSection from '@/components/landing/PricingSection'
import FinalCTA from '@/components/landing/FinalCTA'

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <Hero />
      <BookingJourney />
      <CalendarShowcase />
      <CRMShowcase />
      <MoneyCentreShowcase />
      <GrowthAutomation />
      <WhiteLabelShowcase />
      <EnterpriseShowcase />
      <PricingSection />
      <FinalCTA />
    </main>
  )
}
