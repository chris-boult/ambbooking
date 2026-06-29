import Checkbox from './Checkbox'

type ColumnPickerProps = {
  columns: { key: string; label: string }[]
  visibleColumns: string[]
  onChange: (visibleColumns: string[]) => void
}

export default function ColumnPicker({ columns, visibleColumns, onChange }: ColumnPickerProps) {
  function toggleColumn(key: string) {
    if (visibleColumns.includes(key)) {
      onChange(visibleColumns.filter((column) => column !== key))
    } else {
      onChange([...visibleColumns, key])
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="mb-3 font-bold">Columns</p>
      <div className="space-y-2">
        {columns.map((column) => (
          <Checkbox
            key={column.key}
            label={column.label}
            checked={visibleColumns.includes(column.key)}
            onChange={() => toggleColumn(column.key)}
          />
        ))}
      </div>
    </div>
  )
}
