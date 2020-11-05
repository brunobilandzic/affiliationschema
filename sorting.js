var compareByLikes = (a, b) => {
  if(a.likes.length > b.likes.length){
    return -1;
  }
  else {
    return 1;
  }
}
var compareByDate = (a, b) => {
  if(a.dateAdded > b.dateAdded){
    return -1;
  }
  else {
    return 1;
  }
}

module.exports = (posts, byWhat) => {
  const key = {
    "compareByLikes" : compareByLikes,
    "compareByDate": compareByDate
  }
  return posts.slice().sort(key[byWhat]);
}
