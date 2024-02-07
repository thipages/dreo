const model = { }

import {Parser} from 'expr-eval'
const parser = new Parser()

export function drawer ({layers, commands }) {
    const {width, height } = layers.getDimension()
    const all = layers.getAll()
    model.points = [{ x: 0, y: 0 }]
    model.angle = 0
    model.width = width
    model.height = height
    model.x = width/2
    model.y = height/2
    model.level = 0
    // drawTriangle(all[1].ctx,20, model.points[0], model.angle)
    draw(all, commands, model.width)
    return {
      clear () {
        drawer( {layers, commands: [] })
      }
    }
}
function drawTriangle(ctx, size, point, angle) {
  const bulletSize = size/5
  const offset = { x: point.x - size/2 + model.x - bulletSize, y: point.y - size/2 + model.y - bulletSize}
  const circle = { x:offset.x - bulletSize, y: offset.y +size/2 }
  ctx.save()
  //ctx.translate(size/2+bulletSize/2, size/2+bulletSize/2);
  //ctx.rotate(Math.PI/100)
  ctx.beginPath()
  ctx.globalCompositeOperation = 'lighter'
  ctx.moveTo(offset.x, offset.y)
  ctx.lineTo(offset.x+size, offset.y+size/2)
  ctx.lineTo(offset.x,offset.y+size)
  ctx.closePath()
  ctx.fillStyle = "#FFCC00"
  ctx.arc(circle.x, circle.y, bulletSize , 0, Math.PI*2, true)
  ctx.fill()
  ctx.restore()
}
function drawLine(ctx, point1, point2, drawingMode,stroke, offset = {x:0, y:0}) {
    if (drawingMode){
        ctx.strokeStyle = stroke
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(point1.x + model.x+ offset.x, point1.y + model.y+ offset.y)
        ctx.lineTo(point2.x + model.x+ offset.x, point2.y + model.y+ offset.y)
        ctx.stroke()
    }  else {
        ctx.moveTo(point2.x + model.x, point2.y + model.y)
    }
}
function degToRad(deg) {
    return Math.PI*deg/180
}
function basicCommand(all, offset) {
  all[0].ctx.globalAlpha = 0.1
  return function(command) {
    
    let variable = undefined
    let args = command.arg.slice()
    if (command.verb === "#") {
      variable = args.shift()
      model[variable] = model[variable] || 0
    }
    const values = args.map(
      v => parser.parse(v).evaluate(model)
    )
    switch (command.verb) {
      case 'a':
        if (values.length === 1) {
          avance (all, values[0], command.drawing, command.color, offset) 
        } else {
          deplace (all, values, command.drawing, command.color, offset)
        }
        break
      case 't':
        tourne (all, values[0])
        break
      case 'z':
        model.x += values[0]
        model.y += values[1]
        break
      case '#':
        model[variable] = values[0]
        break
    }
  }
}
function repeat(ctx, command) {
  model.level ++
  repete(command.arg, (offset) => {
    //if (command.children.length === 0) throw 'ERROR: loop needs children'
      for (const [index, child] of command.children.entries()) {
          if (child.verb === 'r') {
              repeat(ctx, child)
          } else {
              basicCommand(ctx)(child, offset)
          }
      }
  })
  model.level --
}
function repete(args, fn) {
  let [iMin, iMax, fullScreen] = args
  let offset, increment
  const diff = iMax-iMin
  const ifFn = fullScreen != null
  if (!ifFn) {
    increment = 1
    offset = {x: 0, y:0}
  } else {
    increment = diff/model.width
    offset = {x: -model.width/2, y:0}
  }
  if (iMax === undefined) {
    iMax = iMin
    iMin = 0
  }

  for (let i = iMin; i < iMax; i+=increment) {
    model[getIndexVars(model.level)] = i
    fn(offset)
  }
}
function draw(all, commands, width) {
    for (const command of commands) {
      const {verb, arg} = command
      if (verb === 'f') {
        /*command.verb = 'r'
        const [x, y, min, max] = arg
        command.children.push(
          {verb: 'a', arg:[x, y], mode: true}
        )
        const [iMin, iMax] = [min, max].map(v=>v|0)
        command.arg =[iMin, iMax, true]
        command.mode = true
        const values = [x, y].map(
          v => ''+parser.parse(v).evaluate({i:min})
        )
        const moveCommand = {
          verb: 'a', arg: values, mode: false
        }
        draw(all, [moveCommand, command], width)*/
      } else if (command.verb === 'r') {
        repeat(all, command)
      } else {
        model.i = undefined
        basicCommand(all)(command)
      }
    }
}

// 1 -> i, 2 -> ii, ...
function getIndexVars(level) {
  return Array(level).fill('').reduce((acc, v) => {acc+='i';return acc}, '')
}
function avance(all, pixelsNum, drawingMode, color, offset) {
  const lastPoint = model.points[model.points.length -1]
  const x = Math.cos(model.angle)*pixelsNum
  const y = Math.sin(model.angle)*pixelsNum
  const newPoint = {x: lastPoint.x + x, y: lastPoint.y + y}
  model.points.push(newPoint)
  drawLine(all[0].ctx, lastPoint, newPoint, drawingMode,color, offset)
}
function tourne(all, angle) {
  model.angle -= degToRad(angle)
  const {ctx, clear} = all[1]
  /*clear()
  drawTriangle(ctx ,20, {x:0, y:0}, model.angle)*/
}
function deplace(all, [x, y], drawingMode, color, offset) {
  const lastPoint = model.points[model.points.length-1]
  const newPoint = {x, y}
  model.points.push(newPoint)
  drawLine(all[0].ctx, lastPoint, newPoint, drawingMode, color, offset)
}