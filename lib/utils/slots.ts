import { addMinutes, format, isBefore } from 'date-fns'

export interface TimeSlot {
  start: string        // ISO 8601 string (TIMESTAMPTZ for DB storage)
  end: string          // ISO 8601 string
  startDisplay: string // "10:00 AM" for UI
  endDisplay: string   // "10:30 AM" for UI
}

type ScheduleInput = {
  start_time: string           // "HH:MM" format
  end_time: string             // "HH:MM" format
  slot_duration_minutes: number
} | null

type AppointmentInput = {
  scheduled_start: string
  scheduled_end: string
  status: string
}

type HolidayInput = {
  holiday_date: string // "YYYY-MM-DD" format
}

/**
 * Pure function to generate available time slots for a given date.
 *
 * Takes doctor schedule, existing appointments, and holidays as input.
 * Returns only slots that are:
 * - Not on a holiday
 * - Within the doctor's working hours for that day
 * - Not overlapping any active (non-cancelled) appointment
 * - Not in the past (when the target date is today)
 */
export function generateAvailableSlots(
  date: Date,
  schedule: ScheduleInput,
  existingAppointments: AppointmentInput[],
  holidays: HolidayInput[]
): TimeSlot[] {
  // Format date as 'yyyy-MM-dd' for comparison
  const dateStr = format(date, 'yyyy-MM-dd')

  // Check if this date is a holiday
  const isHoliday = holidays.some(h => h.holiday_date === dateStr)
  if (isHoliday) return []

  // If no schedule (doctor doesn't work this day), return empty
  if (schedule === null) return []

  // Parse start_time and end_time ("HH:MM" format)
  const [startHours, startMinutes] = schedule.start_time.split(':').map(Number)
  const [endHours, endMinutes] = schedule.end_time.split(':').map(Number)

  // Create dayStart using local year/month/date to avoid UTC midnight offset
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHours, startMinutes, 0, 0)

  // Create dayEnd using local year/month/date
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHours, endMinutes, 0, 0)

  // Determine now threshold for filtering past slots (only relevant if today)
  const today = new Date()
  const isToday =
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth() &&
    today.getDate() === date.getDate()

  const nowThreshold = isToday ? today : null

  // Filter to only active (non-cancelled) appointments
  const activeAppointments = existingAppointments.filter(
    appt => appt.status !== 'cancelled'
  )

  const slots: TimeSlot[] = []

  // Loop through slots from dayStart, incrementing by slot_duration_minutes
  let current = new Date(dayStart)

  while (true) {
    const slotEnd = addMinutes(current, schedule.slot_duration_minutes)

    // If slot end exceeds day end, no more slots fit
    if (slotEnd > dayEnd) break

    // If today and this slot start is in the past, skip it
    if (nowThreshold !== null && isBefore(current, nowThreshold)) {
      current = addMinutes(current, schedule.slot_duration_minutes)
      continue
    }

    // Check overlap with any active appointment
    // Overlap condition: slotStart < apptEnd AND apptStart < slotEnd
    const slotStart = current
    const hasOverlap = activeAppointments.some(appt => {
      const apptStart = new Date(appt.scheduled_start)
      const apptEnd = new Date(appt.scheduled_end)
      return slotStart < apptEnd && apptStart < slotEnd
    })

    if (!hasOverlap) {
      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
        startDisplay: format(current, 'h:mm a'),
        endDisplay: format(slotEnd, 'h:mm a'),
      })
    }

    current = addMinutes(current, schedule.slot_duration_minutes)
  }

  return slots
}
