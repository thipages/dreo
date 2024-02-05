import { textToCommands } from "./text-to-commands.js"
import { drawer } from "./commands-to-drawing.js"
import { canvasLayers } from './canvas-layers.js'
import {helpFunctions} from './utils.js'
import {dialogHTML} from './storage-dialog.js'
import { createNew, loadStorageEntry, getAllItems, updatStorageEntry } from "./local-storage.js"
import {render} from 'uhtml'
export { run }
const VERSION = "1.0"
input.value = sample()
// unfinished function implementation
//input.value = 'fi,100*sin(5*i+10),0,1'
const layers = canvasLayers(cLayers, 2)
let onGoingdrawing = false
t2.innerHTML = helpFunctions
let painter
//localStorage.clear()
run()

function run() {
    updateDrawing()
    input.addEventListener('keyup', () => {
        updatStorageEntry(input.value, sample())
        updateDrawing()
    })
    btn_info.addEventListener('click', () => {
        dialog.showModal()
    })
    btn_list.addEventListener('click', () => {
        updateListView()
        dialog_list.showModal()
    })
    btn_new.addEventListener('click', () => {
        createNew(input.value)
        input.value = ''
        if (painter) painter.clear()
        layers.clearAll()
    })
        
    return VERSION
}
function updateListView() {
    render (
        document.getElementById(
            'dialog_list'),
            dialogHTML(getAllItems(), v => {
                input.value = loadStorageEntry(v)
                updateDrawing()
            }
    ))
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
function sample() {
return `#L=1000
r20
-r36
--a20
--t10
-t18
d0
r100
-a228.6
-d1
-aL
-a-L
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