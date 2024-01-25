import { textToCommands } from "./text-to-commands.js"
import { drawer } from "./commands-to-drawing.js"
import { canvasLayers } from './canvas-layers.js'
export { run }
/*
todo
- moveTo
- coordinate varaibles (X, Y) with loop integration
*/
const VERSION = "1.0"
input.value = 'r36\n-a20\n-t10\na400'
input.value = 'r10\n-r36\n--a20\n--t10\n-t36\nd0\na300\nd1\na40'
input.value = 'r10\n-r36\n--a20\n--t10\n-t36\nr100\n-a1000\n-a-1000\n-t3.6'
input.value = test3()
const layers = canvasLayers(cLayers, 2)
let onGoingdrawing = false
run()
function run() {
    onclick()
    input.addEventListener('keyup', onclick)
    btn_info.addEventListener('click', () => {
        console.log('open')
        dialog.showModal()
    })
    return VERSION
}
function onclick() {
    if (onGoingdrawing) return
    onGoingdrawing = true
    textError.innerText = ''
    layers.clearAll()
    try {
        const {commands, error} = textToCommands(input.value)
        drawer({layers, commands})
        if (error) throw error
    } catch (e) {
        textError.innerText = e
        console.log(e)
    } finally {
        onGoingdrawing = false
    }
}

function test3() {
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