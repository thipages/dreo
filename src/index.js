import { textToCommands } from "./text-to-commands.js"
import { drawer } from "./commands-to-drawing.js"
import { canvasLayers } from './canvas-layers.js'
import {helpFunctions} from './utils.js'
import {dialogHTML} from './storage-dialog.js'
import {render} from 'uhtml'
export { run }
/*
todo
- moveTo
- coordinate varaibles (X, Y) with loop integration
*/
const VERSION = "1.0"
/*input.value = 'r36\n-a20\n-t10\na400'
input.value = 'r10\n-r36\n--a20\n--t10\n-t36\nd0\na300\nd1\na40'
input.value = 'r10\n-r36\n--a20\n--t10\n-t36\nr100\n-a1000\n-a-1000\n-t3.6'*/
input.value = test3()
// unfinished function implementation
//input.value = 'fi,100*sin(5*i+10),0,1'
const layers = canvasLayers(cLayers, 2)
let onGoingdrawing = false
t2.innerHTML = helpFunctions
//
let currentItem = getNewId()
let painter
//localStorage.clear()
function loadStorageEntry(time) {
    console.log(getAllItems())
    console.log('time',time)
    const item =  localStorage.getItem(time)
    if (!item) throw ('ERROR')
    currentItem = time
    input.value = JSON.parse(item).code
    updateDrawing()
    return true
}
function getNewId() {
    return  (new Date).getTime()
}
function updatStorageEntry(code) {
    localStorage.setItem(currentItem, JSON.stringify({code}))
}
function getAllItems() {
    let res = []
    for (const [time, {code}] of Object.entries(localStorage)) {
        const  text = formatDate((time|0)*1000)
        res.push( {id: time, text})
    }
    return res
}

function formatDate(time){    
    const date = (new Date).getTime()
    var options = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    };
    const sDate = new Intl.DateTimeFormat('fr-FR', options).format(date)
}

function updateListView() {
    render (document.getElementById('dialog_list'), dialogHTML(getAllItems(), loadStorageEntry))
}

run()
function run() {
    updateDrawing()
    input.addEventListener('keyup', updateDrawing)
    btn_info.addEventListener('click', () => {
        dialog.showModal()
    })
    btn_list.addEventListener('click', () => {
        updateListView()
        dialog_list.showModal()
    })
    btn_new.addEventListener('click', () => {
        if (!isEmpty(input.value)) {
            updatStorageEntry(input.value)
        }
        input.value = ''
        if (painter) painter.clear()
        currentItem = getNewId()
        layers.clearAll()
    })
        
    return VERSION
}
function isEmpty(string) {
    return string.replace(/\s/g, '') === ''
}
function updateDrawing() {
    if (onGoingdrawing) return
    onGoingdrawing = true
    textError.innerText = ''
    layers.clearAll()
    try {
        const {commands, error} = textToCommands(input.value)
        painter = drawer({layers, commands})
        if (error) throw error
    } catch (e) {
        console.log(e)
        textError.innerText = e
    } finally {
        onGoingdrawing = false
    }
}

function test3() {
return `
#A=1
#C=1
r2
-#C = A*2
- aC*20
- t90
- #A = A +1`
}
function test31() {
return `r20
-r36
--a20
--t10
-t18
d0
r100
-a228.6
-d1
-a1000
-a-1000
-d0
-a-228.6
-t3.6

t-90
a400
t90

a-35
d1
r36
-a69.9
-t10`
}