export function searchRows<T extends Record<string, any>>(rows: T[], query: string, keys?: (keyof T)[]) {
  const cleanQuery = query.trim().toLowerCase()

  if (!cleanQuery) return rows

  return rows.filter((row) => {
    const values = keys?.length ? keys.map((key) => row[key]) : Object.values(row)

    return values.some((value) =>
      String(value ?? '').toLowerCase().includes(cleanQuery)
    )
  })
}

export function exportRowsToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return

  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((field) => JSON.stringify(row[field] ?? '')).join(',')
    ),
  ].join('\\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
