export function textToCommands(text) {
    const commands = text.split('\n')
    const loops = []
    const drawingCommands = []
    let drawingMode = true
    for (const [index, command] of commands.entries()) {
        drawingMode = parseLine(command, index, loops, drawingCommands, drawingMode)
    }
    // const dc = drawingsCommands(drawingCommands)
    // console.log('dc', dc)
    return drawingCommands
}
function drawingsCommands(commands) {
    const res = []
    for (const command of commands) {
        res.push(repeat(command))
    }
    return res
}
function repeat(command) {
    return !command.children
        ? command
        : repeat(command)
}
function parseLine(command, index, loops, drawingCommands, mode) {
    const re = /^\s*(-*)\s*([a|t|r|d])\s*(-{0,1}\d+\.*\d*)$/g
    if (command.trim() !== '') {
        const matches = [...command.matchAll(re)]
        if (matches.length === 0) throwError(index, 'no command')
        const [, dash, verb, arg] = matches[0]
        const dashNum = dash.length
        const drawingsNum = drawingCommands.length
        const loopsNum = loops.length
        if (verb === 'r') {
            const newRepeat = {verb, arg, children: [], mode}
            if (loopsNum === 0) {
                drawingCommands.push(newRepeat)
                loops.push(newRepeat.children)
            } else {
                const diff = loopsNum - dashNum
                if (loopsNum === dashNum) {
                    const lastChildren = loops[loopsNum - 1]
                    lastChildren.push(newRepeat)
                    loops.push(newRepeat.children)
                } else if (diff > 0) {
                    for (let i = 0; i < diff; i++){
                        loops.pop()
                    }
                    
                    const lastChildren = loops.length !==0
                        ? loops[loops.length - 1]
                        : null
                    if (lastChildren === null ) {
                        drawingCommands.push(newRepeat)
                        loops.push(newRepeat.children)
                    } else {
                        lastChildren.push(newRepeat)
                    }
                } else {
                    throwError(index, 'mismatch on loops')
                    
                }
            }   
        } else {
            // No need to register 'd' drawing command
            if (verb === 'd') {
                const newMode = arg === '0' ? false : true
                return newMode
            }
            const newCommand = {verb, arg, mode }
            if (dashNum === 0) {
                loops.length = 0
                drawingCommands.push(newCommand)
            } else {
                const diff = dashNum - loopsNum
                if (diff > 0) throwError(index, 'wrong hierarchy')
                if (diff === 0) {
                    const lastChildren = loops[loopsNum - 1]
                    lastChildren.push(newCommand)
                } else {
                    for (let i = 0; i < -diff; i++){
                        loops.pop()
                    }
                    const lastChildren = loops.length !==0
                        ? loops[loops.length - 1]
                        : null
                    if (lastChildren === null ) {
                        drawingCommands.push(newCommand)
                    } else {
                        lastChildren.push(newCommand)
                    }
                }
            }
        }
    }
    return mode
}
function throwError (lineIndex, message = '') {
    const m = message === '' ? '' : ':' + message
    throw `Error at line ${lineIndex + 1} ${m}`
}