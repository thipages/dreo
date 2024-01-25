import {Parser} from 'expr-eval'
const parser = new Parser()
const commandList = {
    z: {validate: [isExpression, isExpression]},
    a: {min: 1, validate: [isExpression, isExpression]},
    t: {validate: isExpression},
    r: {validate: isExpression},
    d: {validate: inList(['0','1'])}
}
const castArray = a => Array.isArray(a) ? a : [a]
// https://stackoverflow.com/questions/175739/how-can-i-check-if-a-string-is-a-valid-number
function isNumeric(str) {
    if (typeof str !== "string") return false 
    return !isNaN(str) && !isNaN(parseFloat(str))
}
function isExpression(str) {
    try {
        parser.parse(str)
    } catch (e) {
        throw 'Error : expression can not be parsed'
    }
    return true
}
function inList(items) {
    return function (str) {
        return items.indexOf(str) !== -1
    }
}
export function textToCommands(text) {
    const drawingCommands = []
    let error = false
    try {
        const commands = text.split('\n')
        const loops = []
        let drawingMode = true
        for (const [index, command] of commands.entries()) {
            if (command !== '') {
                drawingMode = parseLine(command, index, loops, drawingCommands, drawingMode)
            }
        }
    } catch (e) {
        error = e
    }
    return {commands: drawingCommands, error}
}
function getTokens(line, index) {
    const rCom = Object.keys(commandList).join('|')
    const re = new RegExp(`\\s*(-*)\\s*([${rCom}])\\s*(.+)`, 'g')
    const matches = [...line.matchAll(re)]
    if (matches.length === 0) throwError(index, 'unknown command')
    const [, dash, verb, arg] = matches[0]
    const args = arg.replace(/\s/g, '').split(',')
    return { dash, verb, args }
}
function validateArguments(verb, args) {
    const commandArgs = castArray(commandList[verb].validate)
    const min = commandList[verb].min
    const diff = commandArgs.length - args.length
    if ( diff < 0 ) throw `Error : to many arguments for command ${verb}`
    if (args.length < min) throw `Error : Not enough arguments for command ${verb}`
    for (const [index, cArg] of commandArgs.entries()) {
        if (!cArg(args[index])) throw `Error: invalid argument type`
        if (index === args.length - 1) break
    }
    return true
}
function parseLine(command, index, loops, drawingCommands, mode) {
    const { dash, verb, args } = getTokens(command, index)
    validateArguments(verb, args)
    const arg = args//[0]
    const dashNum = dash.length
    const loopsNum = loops.length
    if (verb === 'r') {
        parser1(index, verb, arg, loopsNum, dashNum, loops, drawingCommands, mode, true)
    } else {
        // No need to register 'd' mode command
        if (verb === 'd') {
            const newMode = arg[0] === '0' ? false : true
            return newMode
        }
        parser1(index, verb, arg, loopsNum, dashNum, loops, drawingCommands, mode, false)
    }
    return mode
}
function throwError (lineIndex, message = '') {
    const m = message === '' ? '' : ':' + message
    throw `Error at line ${lineIndex + 1} ${m}`
}
function parser1(index, verb, arg, loopsNum, dashNum, loops, drawingCommands, mode, isRepeat) {
    const newCommand = {verb, arg, children: [], mode}
    if (loopsNum === 0) {
        drawingCommands.push(newCommand)
        if (isRepeat) loops.push(newCommand.children)
    } else {
        const diff = loopsNum - dashNum
        if (diff === 0) {
            const lastChildren = loops[loopsNum - 1]
            lastChildren.push(newCommand)
            if (isRepeat) loops.push(newCommand.children)
        } else if (diff > 0) {
            parser2(diff, newCommand, loops, drawingCommands, isRepeat)
        } else {
            throwError(index, 'mismatch on loops')
        }
    }   
}
function parser2(diff, newCommand, loops, drawingCommands, isRepeat) {
    for (let i = 0; i < diff; i++){
        loops.pop()
    }
    const lastChildren = loops.length !==0
        ? loops[loops.length - 1]
        : null
    if (lastChildren === null ) {
        drawingCommands.push(newCommand)
        if (isRepeat) loops.push(newCommand.children)
    } else {
        lastChildren.push(newCommand)
    }
}