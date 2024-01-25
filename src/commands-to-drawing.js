const model = { }

import {Parser} from 'expr-eval'
const parser = new Parser()

export function drawer ({layers, commands, timeout}) {
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
    draw(all, commands, timeout)
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

function drawLine(ctx, point1, point2, drawingMode) {
    if (drawingMode){
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(point1.x + model.x, point1.y + model.y)
        ctx.lineTo(point2.x + model.x, point2.y + model.y)
        ctx.stroke()
    }  else {
        ctx.moveTo(point2.x + model.x, point2.y + model.y)
    }
}
function degToRad(deg) {
    return Math.PI*deg/180
}
function basicCommand(all) {
  all[0].ctx.globalAlpha = 0.1
  return function(command) {
    const values = command.arg.map(
      v => parser.parse(v).evaluate(model)
    )   
    switch (command.verb) {
      case 'a':
        if (values.length === 1) {
          avance (all, values[0], command.mode) 
        } else {
          deplace (all, values, command.mode)
        }
        break
      case 't':
        tourne (all, values[0])
        break
      case 'z':
        model.x += values[0]
        model.y += values[1]
    }
  }
}
function repeat(ctx, command) {
  model.level ++
  repete(command.arg, () => {
      for (const [index, child] of command.children.entries()) {
          if (child.verb === 'r') {
              repeat(ctx, child)
          } else {
              basicCommand(ctx)(child)
          }
      }
  })
  model.level --
}
function repete(times, fn) {
  for (let i = 0; i < times; i++) {
    model[getIndexVars(model.level)] = i
    fn()
  }
}
function draw(all, commands) {
    for (const command of commands) {
      if (command.verb === 'r') {
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
function avance(all, pixelsNum, drawingMode) {
  const lastPoint = model.points[model.points.length -1]
  const x = Math.cos(model.angle)*pixelsNum
  const y = Math.sin(model.angle)*pixelsNum
  const newPoint = {x: lastPoint.x + x, y: lastPoint.y + y}
  model.points.push(newPoint)
  drawLine(all[0].ctx, lastPoint, newPoint, drawingMode)
}

function tourne(all, angle) {
  model.angle -= degToRad(angle)
  const {ctx, clear} = all[1]
  /*clear()
  drawTriangle(ctx ,20, {x:0, y:0}, model.angle)*/
}
function deplace(all, [x, y], drawingMode) {
  //model.x += x
  //model.y += y
  const lastPoint = model.points[model.points.length-1]
  const newPoint = {x, y}
  model.points.push(newPoint)
  drawLine(all[0].ctx, lastPoint, newPoint, drawingMode)
}