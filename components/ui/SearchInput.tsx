import { InputHTMLAttributes } from 'react'
import Input from './Input'

type SearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  value: string
  onValueChange: (value: string) => void
}

export default function SearchInput({ value, onValueChange, placeholder = 'Search...', ...props }: SearchInputProps) {
  return (
    <Input
      {...props}
      type="search"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onValueChange(event.target.value)}
    />
  )
}
