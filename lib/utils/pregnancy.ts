/**
 * Pregnancy utility functions for gestational age calculation and due date alerts.
 * All functions are pure (no side effects, no Supabase dependency).
 */

/**
 * Calculate the current gestational week from the Last Menstrual Period (LMP) date.
 *
 * @param lmpDate - ISO date string (e.g. "2024-06-01")
 * @returns Gestational week number, or null if the result is out of range (< 0 or > 42)
 */
export function getGestationalWeek(lmpDate: string): number | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lmp = new Date(lmpDate)
  lmp.setHours(0, 0, 0, 0)

  const diffMs = today.getTime() - lmp.getTime()
  const weeks = Math.floor(diffMs / (7 * 86400000))

  if (weeks < 0 || weeks > 42) return null
  return weeks
}

/**
 * Calculate the number of days from today until the expected due date.
 * Negative values indicate the due date has passed (overdue).
 *
 * @param expectedDueDateStr - ISO date string (e.g. "2025-03-01")
 * @returns Number of days until due date (negative = overdue)
 */
export function getDaysUntilDue(expectedDueDateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(expectedDueDateStr)
  dueDate.setHours(0, 0, 0, 0)

  const diffMs = dueDate.getTime() - today.getTime()
  return Math.floor(diffMs / 86400000)
}

/**
 * Determine whether a pregnancy is approaching its due date (within 14 days).
 *
 * @param pregnancy - Object with status and expected_due_date fields
 * @returns true only if status === 'active' AND due date is 0–14 days away (inclusive)
 */
export function isApproachingDueDate(pregnancy: {
  status: string
  expected_due_date: string
}): boolean {
  if (pregnancy.status !== 'active') return false

  const daysUntilDue = getDaysUntilDue(pregnancy.expected_due_date)
  return daysUntilDue >= 0 && daysUntilDue <= 14
}
