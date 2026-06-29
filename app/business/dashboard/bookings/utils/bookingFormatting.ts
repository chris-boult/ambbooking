export function uniqueValues(values: (string | null)[]) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

export function formatBookingDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatBookingTime(time: string | null | undefined) {
  return time?.slice(0, 5) || ''
}
