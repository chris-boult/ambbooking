import type { StaffColour } from './calendarTypes'

export const STAFF_COLOURS: StaffColour[] = [
  {
    accent: 'cyan',
    border: 'border-cyan-300/40',
    bg: 'bg-cyan-400/10',
    bgStrong: 'bg-cyan-400',
    text: 'text-cyan-200',
    dot: 'bg-cyan-300',
    gradient: 'from-cyan-400/20 to-cyan-400/5',
  },
  {
    accent: 'violet',
    border: 'border-violet-300/40',
    bg: 'bg-violet-400/10',
    bgStrong: 'bg-violet-400',
    text: 'text-violet-200',
    dot: 'bg-violet-300',
    gradient: 'from-violet-400/20 to-violet-400/5',
  },
  {
    accent: 'emerald',
    border: 'border-emerald-300/40',
    bg: 'bg-emerald-400/10',
    bgStrong: 'bg-emerald-400',
    text: 'text-emerald-200',
    dot: 'bg-emerald-300',
    gradient: 'from-emerald-400/20 to-emerald-400/5',
  },
  {
    accent: 'amber',
    border: 'border-amber-300/40',
    bg: 'bg-amber-400/10',
    bgStrong: 'bg-amber-400',
    text: 'text-amber-200',
    dot: 'bg-amber-300',
    gradient: 'from-amber-400/20 to-amber-400/5',
  },
  {
    accent: 'rose',
    border: 'border-rose-300/40',
    bg: 'bg-rose-400/10',
    bgStrong: 'bg-rose-400',
    text: 'text-rose-200',
    dot: 'bg-rose-300',
    gradient: 'from-rose-400/20 to-rose-400/5',
  },
  {
    accent: 'blue',
    border: 'border-blue-300/40',
    bg: 'bg-blue-400/10',
    bgStrong: 'bg-blue-400',
    text: 'text-blue-200',
    dot: 'bg-blue-300',
    gradient: 'from-blue-400/20 to-blue-400/5',
  },
]

export const UNASSIGNED_COLOUR: StaffColour = {
  accent: 'slate',
  border: 'border-slate-400/40',
  bg: 'bg-slate-400/10',
  bgStrong: 'bg-slate-400',
  text: 'text-slate-200',
  dot: 'bg-slate-300',
  gradient: 'from-slate-400/20 to-slate-400/5',
}

export function colourForStaff(index: number) {
  return STAFF_COLOURS[index % STAFF_COLOURS.length]
}
