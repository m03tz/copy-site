import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScheduleForm } from '@/components/schedule/schedule-form'
import { HolidayForm } from '@/components/schedule/holiday-form'
import { deleteScheduleDay, deleteHoliday } from '@/lib/actions/schedule'
import { EditScheduleDayButton } from '@/components/schedule/edit-schedule-day-button'
import type { DoctorSchedule, DoctorHoliday } from '@/lib/types/database'

async function handleDeleteScheduleDay(id: string) {
  'use server'
  await deleteScheduleDay(id)
}

async function handleDeleteHoliday(id: string) {
  'use server'
  await deleteHoliday(id)
}

export default async function SecretarySchedulePage() {
  const t = await getTranslations('schedule')
  const tCommon = await getTranslations('common')

  const supabase = await createClient()

  // Use first doctor found (secretary views any doctor's schedule)
  const { data: doctorProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'doctor')
    .limit(1) as { data: { id: string }[] | null }

  const doctorId = doctorProfiles?.[0]?.id ?? null

  const { data: scheduleDays } = doctorId
    ? await supabase
        .from('doctor_schedule')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('day_of_week')
    : { data: [] }

  const { data: holidays } = doctorId
    ? await supabase
        .from('doctor_holidays')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('holiday_date')
    : { data: [] }

  const days = (scheduleDays ?? []) as DoctorSchedule[]
  const holidayList = (holidays ?? []) as DoctorHoliday[]
  const existingDays = days.map((d) => d.day_of_week)

  const dayNames: Record<string, string> = {
    '0': t('days.0'),
    '1': t('days.1'),
    '2': t('days.2'),
    '3': t('days.3'),
    '4': t('days.4'),
    '5': t('days.5'),
    '6': t('days.6'),
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <Tabs defaultValue="working-days">
        <TabsList>
          <TabsTrigger value="working-days">{t('workingDays')}</TabsTrigger>
          <TabsTrigger value="holidays">{t('holidays')}</TabsTrigger>
        </TabsList>

        <TabsContent value="working-days" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('workingDays')}</h2>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">{t('addDay')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('addDay')}</DialogTitle>
                </DialogHeader>
                <ScheduleForm existingDays={existingDays} />
              </DialogContent>
            </Dialog>
          </div>

          {days.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noSchedule')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dayOfWeek')}</TableHead>
                  <TableHead>{t('startTime')}</TableHead>
                  <TableHead>{t('endTime')}</TableHead>
                  <TableHead>{t('slotDuration')}</TableHead>
                  <TableHead>{t('active')}</TableHead>
                  <TableHead className="w-36"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((day) => {
                  const deleteDay = handleDeleteScheduleDay.bind(null, day.id)
                  return (
                    <TableRow key={day.id}>
                      <TableCell className="font-medium">
                        {dayNames[String(day.day_of_week)]}
                      </TableCell>
                      <TableCell>{day.start_time}</TableCell>
                      <TableCell>{day.end_time}</TableCell>
                      <TableCell>{day.slot_duration_minutes} min</TableCell>
                      <TableCell>
                        <Badge variant={day.is_active ? 'default' : 'secondary'}>
                          {day.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <EditScheduleDayButton day={day} />
                          <form action={deleteDay}>
                            <Button
                              type="submit"
                              variant="destructive"
                              size="sm"
                            >
                              {tCommon('delete')}
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="holidays" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('holidays')}</h2>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">{t('addHoliday')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('addHoliday')}</DialogTitle>
                </DialogHeader>
                <HolidayForm />
              </DialogContent>
            </Dialog>
          </div>

          {holidayList.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noHolidays')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('holidayDate')}</TableHead>
                  <TableHead>{t('reason')}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidayList.map((holiday) => {
                  const deleteHol = handleDeleteHoliday.bind(null, holiday.id)
                  return (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">
                        {holiday.holiday_date}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {holiday.reason ?? '—'}
                      </TableCell>
                      <TableCell>
                        <form action={deleteHol}>
                          <Button
                            type="submit"
                            variant="destructive"
                            size="sm"
                          >
                            {tCommon('delete')}
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
