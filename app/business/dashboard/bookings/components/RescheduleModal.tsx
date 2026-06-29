import { Booking, Availability } from '../types'

export default function RescheduleModal({
  booking,
  dateOptions,
  newDate,
  newTime,
  availability,
  availableTimeSlots,
  message,
  setNewDate,
  setNewTime,
  clearMessage,
  onSave,
  onClose,
}: {
  booking: Booking
  dateOptions: { value: string; day: string; date: string; month: string }[]
  newDate: string
  newTime: string
  availability: Availability | null
  availableTimeSlots: string[]
  message: string
  setNewDate: (value: string) => void
  setNewTime: (value: string) => void
  clearMessage: () => void
  onSave: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h2 className="mb-2 text-2xl font-bold">Reschedule booking</h2>
        <p className="mb-6 text-slate-400">
          Choose a new available slot for {booking.customers?.[0]?.first_name} {booking.customers?.[0]?.last_name}.
        </p>

        <div className="mb-6">
          <p className="mb-3 text-slate-400">Choose a new date</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
            {dateOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setNewDate(option.value)
                  setNewTime('')
                  clearMessage()
                }}
                className={`rounded-xl border p-4 text-center ${newDate === option.value ? 'border-white bg-white text-slate-950' : 'border-slate-700 bg-slate-800 text-white'}`}
              >
                <span className="block text-sm">{option.day}</span>
                <span className="block text-2xl font-bold">{option.date}</span>
                <span className="block text-sm">{option.month}</span>
              </button>
            ))}
          </div>
        </div>

        {newDate && (
          <div className="mb-6">
            <p className="mb-3 text-slate-400">Choose a new time</p>

            {availability === null && <p className="text-slate-500">No availability has been set for this day.</p>}
            {availability && !availability.is_available && <p className="text-slate-500">This team member is not available on this day.</p>}

            {availability && availability.is_available && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {availableTimeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setNewTime(slot)
                        clearMessage()
                      }}
                      className={`rounded-lg border p-3 ${newTime === slot ? 'border-white bg-white text-slate-950' : 'border-slate-700 bg-slate-800 text-white'}`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                {availableTimeSlots.length === 0 && <p className="mt-3 text-slate-500">No available slots for this date.</p>}
              </>
            )}
          </div>
        )}

        {message && <p className="mb-4 text-slate-300">{message}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onSave} className="flex-1 rounded-lg bg-white p-3 font-bold text-slate-950">Save changes</button>
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-slate-700 p-3 font-bold hover:bg-slate-600">Close</button>
        </div>
      </div>
    </div>
  )
}
