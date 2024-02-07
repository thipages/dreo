import { textToCommands } from "./text-to-commands.js"
import { drawer } from "./commands-to-drawing.js"
import { canvasLayers } from './canvas-layers.js'
import {helpFunctions, sample} from './utils.js'
import {dialogHTML} from './storage-dialog.js'
import { createNewStorageEntry, loadStorageEntry, getAllEntries, updatStorageEntry } from "./local-storage.js"
import {render} from 'uhtml'
//
const DEBUG = false
if (DEBUG) {
    localStorage.clear()
    console.log('DEBUG MODE', DEBUG)
}
//
run()
export function run() {
    input.value = sample
    // unfinished function implementation
    //input.value = 'fi,100*sin(5*i+10),0,1'
    const layers = canvasLayers(cLayers, 2)
    let onGoingdrawing = false
    updateDrawing()
    input.addEventListener('keyup', () => {
        updatStorageEntry(input.value, sample)
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
        createNewStorageEntry(input.value)
        input.value = ''
        layers.clearAll()
    })
    function loadDrawing(v) {
        input.value = loadStorageEntry(v)
        updateDrawing()
    }
    function updateListView() {
        render (
            dialog_list,
            dialogHTML(getAllEntries(),loadDrawing)
        )
    }
    function updateDrawing() {
        if (onGoingdrawing) return
        onGoingdrawing = true
        textError.innerText = ''
        layers.clearAll()
        const {error} = draw(layers, input.value)
        onGoingdrawing = false
        if (error) {
            textError.innerText = error
        }
    }
}
function draw(layers, code) {
    try {
        const {commands, error} = textToCommands(code)
        if (error) return {error}
        drawer({layers, commands})
        return {error: null}
    } catch (e) {
        console.log(e)
        return {error : e}
    }
}