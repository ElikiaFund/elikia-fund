import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarIcon, XIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const presets = [
  { label: '7 derniers jours', days: 7 },
  { label: '30 derniers jours', days: 30 },
  { label: '90 derniers jours', days: 90 },
]

type DateRangeFilterProps = {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start text-left font-normal">
            <CalendarIcon className="size-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, 'd MMM y', { locale: fr })} – {format(value.to, 'd MMM y', { locale: fr })}
                </>
              ) : (
                format(value.from, 'd MMM y', { locale: fr })
              )
            ) : (
              <span>Choisir une période</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-col gap-1 border-b p-2 sm:border-r sm:border-b-0">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={() => onChange({ from: subDays(new Date(), preset.days), to: new Date() })}>
                  {preset.label}
                </Button>
              ))}
            </div>
            <Calendar mode="range" selected={value} onSelect={onChange} numberOfMonths={2} locale={fr} />
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button variant="ghost" size="icon" onClick={() => onChange(undefined)} aria-label="Réinitialiser la période">
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  )
}
