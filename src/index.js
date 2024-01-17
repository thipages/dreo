import { textToCommands } from "./text-to-commands.js"
import { drawer } from "./commands-to-drawing.js"
export { run }

const VERSION = "1.0"
function run() {
    input.value = 'r36\n-a20\n-t10\na400'
    input.value = 'r10\n-r36\n--a20\n--t10\n-t36\nd0\na300\nd1\na40'
    input.value = 'r10\n-r36\n--a20\n--t10\n-t36\nr100\n-a1000\n-a-1000\n-t3.6'
    // https://stackoverflow.com/questions/30229536/how-to-make-a-html5-canvas-fit-dynamic-parent-flex-box-container
    const {width, height} = canvas.parentNode.getBoundingClientRect()
    canvas.width = width
    canvas.height = height 
    const ctx = canvas.getContext('2d')
    let onGoingdrawing = false
    dessine.addEventListener('click', async () => {
        if (onGoingdrawing) return
        onGoingdrawing = true
        textError.innerText = ''
        ctx.clearRect(0, 0, width, height)
        try {
            const commands = textToCommands(input.value)
            await drawer({ctx, width, height, commands, timeout: getTimeout()})
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