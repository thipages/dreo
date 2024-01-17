import { textToCommands } from "./text-to-commands.js"
import { drawer } from "./commands-to-drawing.js"
import { canvasLayers } from './canvas-layers.js'
export { run }

const VERSION = "1.0"
function run() {
    input.value = 'r36\n-a20\n-t10\na400'
    input.value = 'r10\n-r36\n--a20\n--t10\n-t36\nd0\na300\nd1\na40'
    input.value = 'r10\n-r36\n--a20\n--t10\n-t36\nr100\n-a1000\n-a-1000\n-t3.6'
    input.value = test3()
    // https://stackoverflow.com/questions/30229536/how-to-make-a-html5-canvas-fit-dynamic-parent-flex-box-container
    /*const {width, height} = canvas.parentNode.getBoundingClientRect()
    canvas.width = width
    canvas.height = height 
    const ctx = canvas.getContext('2d')*/
    const layers = canvasLayers(cLayers, 2)
    /*
    const {width, height } = layers.getDimension()
    const ctx = layers.getContext(0)
    */
    let onGoingdrawing = false
    dessine.addEventListener('click', async () => {
        if (onGoingdrawing) return
        onGoingdrawing = true
        textError.innerText = ''
        //ctx.clearRect(0, 0, width, height)
        layers.clearAll()
        try {
            const commands = textToCommands(input.value)
            //await drawer({layers, width, height, commands, timeout: getTimeout()})
            await drawer({layers, commands, timeout: getTimeout()})
        } catch (e) {
            textError.innerText = e
            console.log(e)
        } finally {
            onGoingdrawing = false
        }
    })
    return VERSION
}
function getTimeout() {
  return 0//  motion.checked ? 0 : 50
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