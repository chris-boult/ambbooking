export interface NotificationRequest{
 businessId:string
 title:string
 message:string
 type:string
 link?:string
 data?:Record<string,unknown>
}
