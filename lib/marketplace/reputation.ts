
export function calculateTrustScore(input:{
  overallRating:number
  reviewCount:number
  recommendationPercent:number
  responseRate:number
}){
  let score=0
  score+=Math.min(input.overallRating/5*40,40)
  score+=Math.min(input.reviewCount,100)/100*20
  score+=input.recommendationPercent/100*20
  score+=input.responseRate/100*20
  return Math.round(score)
}
