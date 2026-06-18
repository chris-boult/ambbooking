import Link from 'next/link'

export function AdminPartnerNavigationPatch() {
  return (
    <Link
      href="/admin/partners"
      className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
    >
      Partner Centre
    </Link>
  )
}

/*
Add this item to your existing master admin nav array instead if your admin layout uses navItems:

{ name: 'Partner Centre', href: '/admin/partners' }
*/
