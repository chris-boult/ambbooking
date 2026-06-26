import type {NotificationRequest} from './types'

export async function notify(req:NotificationRequest){
  return fetch('/api/events/publish',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(req)
  })
}
