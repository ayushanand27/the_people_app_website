/** Interest overlap score 0–100 between two profile interest arrays */
export function interestMatchScore(myInterests = [], theirInterests = []) {
  if (!myInterests?.length || !theirInterests?.length) return 0
  const common = myInterests.filter(i => theirInterests.includes(i))
  return Math.round((common.length / Math.max(myInterests.length, 1)) * 100)
}

export function commonInterests(myInterests = [], theirInterests = []) {
  if (!myInterests?.length || !theirInterests?.length) return []
  return myInterests.filter(i => theirInterests.includes(i))
}

export function sortByMatchScore(people, myInterests) {
  return [...people].sort(
    (a, b) => interestMatchScore(myInterests, b.interests) - interestMatchScore(myInterests, a.interests)
  )
}
