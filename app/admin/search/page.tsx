'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type SearchResults = {
  businesses: any[]
  customers: any[]
  bookings: any[]
  vouchers: any[]
  waitingList: any[]
  tickets: any[]
}

export default function AdminSearchPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const [results, setResults] = useState<SearchResults>({
    businesses: [],
    customers: [],
    bookings: [],
    vouchers: [],
    waitingList: [],
    tickets: [],
  })

  useEffect(() => {
    if (query.length < 2) return

    const timeout = setTimeout(() => {
      runSearch()
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  async function runSearch() {
    setLoading(true)

    const response = await fetch(
      `/api/admin/search?q=${encodeURIComponent(query)}`
    )

    const data = await response.json()

    setResults(data)

    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
          Platform search
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Global Search
        </h1>

        <p className="mt-3 text-slate-400">
          Search across every business, customer,
          booking, voucher and ticket.
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search businesses, customers, bookings..."
        className="w-full rounded-3xl border border-white/10 bg-black/20 px-6 py-5 text-lg text-white outline-none"
      />

      {loading && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          Searching...
        </div>
      )}

      <SearchSection
        title="Businesses"
        items={results.businesses}
        render={(item) => (
          <Link
            href={`/admin/businesses/${item.id}`}
            className="block"
          >
            {item.business_name}
          </Link>
        )}
      />

      <SearchSection
        title="Customers"
        items={results.customers}
        render={(item) => (
          <div>
            {item.first_name} {item.last_name}
          </div>
        )}
      />

      <SearchSection
        title="Bookings"
        items={results.bookings}
        render={(item) => (
          <div>
            {item.booking_date} {item.booking_time}
          </div>
        )}
      />

      <SearchSection
        title="Gift Vouchers"
        items={results.vouchers}
        render={(item) => (
          <div>
            {item.code}
          </div>
        )}
      />

      <SearchSection
        title="Waiting List"
        items={results.waitingList}
        render={(item) => (
          <div>
            {item.name}
          </div>
        )}
      />

      <SearchSection
        title="Support Tickets"
        items={results.tickets}
        render={(item) => (
          <div>
            {item.subject}
          </div>
        )}
      />
    </div>
  )
}

function SearchSection({
  title,
  items,
  render,
}: {
  title: string
  items: any[]
  render: (item: any) => React.ReactNode
}) {
  if (!items.length) return null

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h2 className="mb-4 text-xl font-black">
        {title}
      </h2>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            {render(item)}
          </div>
        ))}
      </div>
    </div>
  )
}