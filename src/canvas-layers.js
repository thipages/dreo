import { iArray } from './utils.js'
const canvasStyle = `
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
`
export function canvasLayers(containerNode, layerNum ) {
    // https://stackoverflow.com/questions/30229536/how-to-make-a-html5-canvas-fit-dynamic-parent-flex-box-container
    const {width, height} = containerNode.getBoundingClientRect()
    const array = iArray(layerNum)
    const canvases = array.map(
        () => document.createElement('canvas')
    )
    for (const canvas of canvases) {
        canvas.width = width
        canvas.height = height
        canvas.setAttribute('style',canvasStyle)
        containerNode.prepend(canvas)
    }
    return {
        getContext(layerNum) {
            return canvases[layerNum].getContext('2d')
        },
        getAll() {
            return array.map(
                index => {
                    return {
                        ctx: this.getContext(index),
                        clear: () => this.clear(index)
                    }
                }
            )
        },
        getCanvas(layerNum) {
            return canvases[layerNum].getContext('2d')
        },
        getDimension() {
            return { width, height }
        },
        clear(layerNum) {
            this.getContext(layerNum).clearRect(0, 0, width, height)
        },
        clearAll() {
            for (const index of array) {
                this.clear(index)
            }
        },
        layerNum
    }
}