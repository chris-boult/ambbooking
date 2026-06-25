import type { Metadata } from 'next'

type Props = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  return {
    manifest: `/api/manifest?slug=${encodeURIComponent(slug)}`,
    themeColor: '#020617',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Booking',
    },
  }
}

export default function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  return children
}
