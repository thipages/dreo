import {Parser} from 'expr-eval'
const parser = new Parser()
const commandList = {
    a: {min: 1, validate: [isExpression, isExpression]},
    t: {validate: isExpression},
    c: {validate: isExpression},
    r: {min: 1, validate: [isExpression/*, isExpression*/]}, // not working with 2 arguments
    d: {validate: inList(['0','1'])},
    z: {validate: [isExpression, isExpression]}
}
const castArray = a => Array.isArray(a) ? a : [a]
// https://stackoverflow.com/questions/175739/how-can-i-check-if-a-string-is-a-valid-number
function isNumeric(str) {
    if (typeof str !== "string") return false 
    return !isNaN(str) && !isNaN(parseFloat(str))
}
function isExpression(str) {
    return getExpression(str) ? true : false
}
function getExpression(str) {
    let p
    try {
        p=parser.parse(str)
    } catch (e) {
        throw 'Error : expression can not be parsed'
    }
    return p
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
        // parse multilines command
        const newCommands = []
        let currentCommand = null
        for (const [index, command] of commands.entries()) {
            if (command.replace(/\s*/g,'') !== '') {
                if (isFunction(command)) {
                    if (currentCommand === null) {
                        currentCommand = {commands:[]}
                    } else {
                        const parsed = parseFunction(currentCommand)
                        newCommands.push(...parsed)
                        currentCommand = null
                    }
                } else if (currentCommand !==null) {
                    currentCommand.commands.push(command)
                } else {
                    newCommands.push(command)
                }
            }
        }
        const cleanCommands = newCommands.filter(
            v => v.replace(/\s*/g,'') !== ''
        )
        // parse regular commands
        const loops = []
        let drawingModes = {drawing: true, color: 'black'}
        for (const [index, command] of cleanCommands.entries()) {
            const { dash, verb, args } = getTokens(command, index)
            drawingModes = parseLine(
                { dash, verb, args },
                index,
                loops,
                drawingCommands,
                drawingModes
            )           
        }
    } catch (e) {
        error = e
    }
    return {commands: drawingCommands, error}
}
function isFunction(line) {
    return /\s*f\s*/g.test(line)
}
const sFunction = (color, fn, fnAt0, loopVar, values) => {
    const declarations = values 
        ? values.map (v=>`#${v[0]}=${v[1]}`).join('\n')
        : ''
    const radDeclaration = loopVar === 'irad'
        ? '-#irad=2*PI*i/360'
        : ''
    return `
        ${declarations}
        c${color}
        d0
        a0,${fnAt0}
        d1
        r360
        ${radDeclaration}
        -ai,${fn}`.split('\n')
}
function partition(array, isValid) {
    return array.reduce(([pass, fail], elem) => {
      return isValid(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]];
    }, [[], []]);
  }
function parseFunction({ commands }) {
    //
    const cCom = commands.filter(v=>v.replace(/s*/g, '') !== '')
    const fn = cCom.shift()
    const iVars = getExpression(fn).tokens.filter(
        v=>v.type ==='IVAR'
    ).map(v=>v.value)
    const [loopVars, argVars] = partition(iVars,v=>v==='i' || v === 'irad')
    const loopVar = loopVars[0]
    //
    const sumFn=[]
    let sumFunAt0=0
    let res= cCom.map (
        (command, index) => {
            let newFn = ''+fn
            for (const iVar of argVars) {
                newFn = newFn.replace(iVar, iVar + index)
            }
            sumFn.push(newFn)
            const vars = argVars.map (
                v=> v + index
            )
            const args = command.split(',')
                .map(v=>v.trim())
            const color = args.pop()
            const values = args.map((v,i)=>[vars[i], v])
            const model = values.reduce(
                (acc, [key, val]) => {
                    acc[key]= parser.evaluate(val)
                    return acc
                },{}
            )
            model[loopVar] = 0
            const fnAt0 = parser.evaluate(newFn,model)
            sumFunAt0+=fnAt0
            return sFunction(color, newFn,fnAt0, loopVar, values)
        }
    )
    res.push(
        sFunction('magenta', sumFn.join('+') ,sumFunAt0, loopVar)
    )
    return res.flat()
}
function isLoopVariable(sVar) {
    const set = new Set (sVar.split(''))
    return set.size === 1 && set.has('i')
}
function getVariable(line, index) {
    const re = /^\s*(-*)\s*#(\w+)\s*=\s*(.+)\s*/g
    const matches = [...line.matchAll(re)]
    if (matches.length === 0) return false
    const [, dash, verb, arg] = matches[0]
    if (isLoopVariable(verb)) throwError (index, 'variable can not start with the letter i')
    return { dash, verb: '#', args:[verb, arg] }
}
function getTokens(line, index) {
        const v = getVariable(line, index)
        if (v) return v
        const rCom = Object.keys(commandList).join('|')
        const re = new RegExp(`\\s*(-*)\\s*([${rCom}])\\s*(.+)`, 'g')
        const matches = [...line.matchAll(re)]
        if (matches.length === 0) throwError(index, 'unknown command')
        const [, dash, verb, arg] = matches[0]
        const args = arg.replace(/\s/g, '').split(',')
        validateArguments(verb, args)
        return { dash, verb, args }
}
function validateArguments(verb, args) {
    if (!commandList[verb]) throw('ERROR: invalid')
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
function parseLine({ dash, verb, args:arg }, index, loops, drawingCommands, drawingModes) {
    const dashNum = dash.length
    const loopsNum = loops.length
    if (verb === 'r') {
        parser1(index, verb, arg, loopsNum, dashNum, loops, drawingCommands, drawingModes, true)
    } else {
        // No need to register 'd' and 'c' drawing commands
        if (verb === 'd') {
            const newMode = arg[0] === '0' ? false : true
            return {...drawingModes, drawing: newMode}
        }
        if (verb === 'c') {
            return { ...drawingModes, color: arg[0]}
        }
        parser1(index, verb, arg, loopsNum, dashNum, loops, drawingCommands, drawingModes, false)
    }
    return drawingModes
}
function throwError (lineIndex, message = '') {
    const m = message === '' ? '' : ':' + message
    throw `Error at line ${lineIndex + 1} ${m}`
}
function parser1(index, verb, arg, loopsNum, dashNum, loops, drawingCommands, drawingModes, isRepeat) {
    const newCommand = {verb, arg, children: [], ...drawingModes}
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