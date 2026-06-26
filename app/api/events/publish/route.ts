import {NextRequest,NextResponse} from 'next/server'

export async function POST(req:NextRequest){
 const body=await req.json()
 return NextResponse.json({
   ok:true,
   message:'Event received',
   event:body
 })
}
