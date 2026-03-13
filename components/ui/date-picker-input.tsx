'use client'

import { useState, useRef } from 'react'
import { format, parse, isValid } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// ─── DatePickerInput ──────────────────────────────────────────────────────────
// Replaces <input type="date"> with a text input + calendar popover.
// Displays and accepts typing in dd-MM-yyyy format.
// Internally stores the date as yyyy-MM-dd for form submission / DB queries.
//
// Usage (uncontrolled / FormData):
//   <DatePickerInput name="visit_date" defaultValue={todayStr} required />
//
// Usage (controlled state):
//   <DatePickerInput value={dateStr} onChange={(v) => setDate(v)} />
//
// Usage (react-hook-form via Controller):
//   <Controller name="lmp_date" control={form.control}
//     render={({ field }) => (
//       <DatePickerInput value={field.value} onChange={field.onChange} />
//     )} />

interface DatePickerInputProps {
  id?: string
  name?: string
  /** Value in yyyy-MM-dd format (controlled mode) */
  value?: string
  /** Default value in yyyy-MM-dd format (uncontrolled mode) */
  defaultValue?: string
  /** Called with the selected date in yyyy-MM-dd format */
  onChange?: (value: string) => void
  required?: boolean
  disabled?: boolean
  /** Min selectable date in yyyy-MM-dd format */
  min?: string
  /** Max selectable date in yyyy-MM-dd format */
  max?: string
  placeholder?: string
  className?: string
}

export function DatePickerInput({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  min,
  max,
  placeholder = 'DD-MM-YYYY',
  className,
}: DatePickerInputProps) {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? '')
  const [open, setOpen] = useState(false)
  // Text shown in the input (dd-MM-yyyy)
  const [typedText, setTypedText] = useState<string>(() => {
    const initial = defaultValue ?? value ?? ''
    return initial ? formatDisplay(initial) : ''
  })
  const inputRef = useRef<HTMLInputElement>(null)

  const currentValue = isControlled ? value : internalValue

  // Parse yyyy-MM-dd to a Date object for the calendar
  function parseYMD(str: string | undefined): Date | undefined {
    if (!str) return undefined
    const d = parse(str, 'yyyy-MM-dd', new Date())
    return isValid(d) ? d : undefined
  }

  function formatDisplay(ymd: string): string {
    const d = parseYMD(ymd)
    return d ? format(d, 'dd-MM-yyyy') : ''
  }

  const selectedDate = parseYMD(currentValue)
  const minDate = parseYMD(min)
  const maxDate = parseYMD(max)

  function commit(ymd: string) {
    if (!isControlled) {
      setInternalValue(ymd)
    }
    onChange?.(ymd)
  }

  // Calendar selection
  function handleSelect(date: Date | undefined) {
    if (!date) return
    const formatted = format(date, 'yyyy-MM-dd')
    setTypedText(format(date, 'dd-MM-yyyy'))
    commit(formatted)
    setOpen(false)
  }

  // Typing handler — accepts dd-MM-yyyy input
  function handleTyping(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value
    // Auto-insert dashes
    raw = raw.replace(/[^0-9]/g, '')
    if (raw.length > 2) raw = raw.slice(0, 2) + '-' + raw.slice(2)
    if (raw.length > 5) raw = raw.slice(0, 5) + '-' + raw.slice(5)
    if (raw.length > 10) raw = raw.slice(0, 10)
    setTypedText(raw)

    // Try to parse when full date is entered (10 chars: dd-MM-yyyy)
    if (raw.length === 10) {
      const parsed = parse(raw, 'dd-MM-yyyy', new Date())
      if (isValid(parsed)) {
        // Check min/max
        if (minDate && parsed < minDate) return
        if (maxDate && parsed > maxDate) return
        commit(format(parsed, 'yyyy-MM-dd'))
      }
    } else {
      // Partial input — clear the committed value
      commit('')
    }
  }

  function handleBlur() {
    // On blur, if text doesn't match a valid date, restore display from committed value
    if (typedText.length > 0 && typedText.length < 10) {
      const restored = currentValue ? formatDisplay(currentValue) : ''
      setTypedText(restored)
    }
  }

  // Sync display text when controlled value changes externally
  const prevValueRef = useRef(currentValue)
  if (prevValueRef.current !== currentValue) {
    prevValueRef.current = currentValue
    const newDisplay = currentValue ? formatDisplay(currentValue) : ''
    if (newDisplay !== typedText) {
      setTypedText(newDisplay)
    }
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      {/* Hidden input so FormData / server actions can read the value */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentValue ?? ''}
          required={required}
        />
      )}

      {/* Text input for typing */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={typedText}
          onChange={handleTyping}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pe-9 text-sm shadow-sm transition-colors',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          dir="ltr"
          autoComplete="off"
        />

        {/* Calendar icon button */}
        <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="absolute end-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              disabled={(date) => {
                if (minDate && date < minDate) return true
                if (maxDate && date > maxDate) return true
                return false
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
