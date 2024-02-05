let currentItem = getNewId()
export function loadStorageEntry(time) {
    const item =  localStorage.getItem(time)
    if (!item) throw ('ERROR malformed local storage')
    const {code, time: rightTime} = JSON.parse(item)
    currentItem = rightTime
    return code
}
export function createNew(code) {
    if (!isEmpty(code)) {
        updatStorageEntry(code)
    }
    currentItem = getNewId()
}
function getNewId() {
    const unixTime  = (new Date).getTime()
    return unixTime
}
function isEmpty(string) {
    return string.replace(/\s/g, '') === ''
}
export function updatStorageEntry(code, sample) {
    if (isEmpty(code) || code === sample) return false
    localStorage.setItem(currentItem, JSON.stringify({code, time:currentItem}))
    return true
}
export function getAllItems() {
    let res = []
    for (const [key, value] of Object.entries(localStorage)) {
        const {code, time} = JSON.parse(value)
        const  text = formatDate(time)
        res.push( {id: time, text})
    }
    return res
}

function formatDate(time){    
    const date = new Date(time)
    var options = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    };
    return new Intl.DateTimeFormat('fr-FR', options).format(date)
}