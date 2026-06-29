import Select from './Select'
import type { FilterOption } from '@/types/table'

type FilterBarProps = {
  label?: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

export default function FilterBar({ label = 'Filter', value, options, onChange }: FilterBarProps) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-500">{label}</label>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
