const model = { }
export async function drawer ({layers, commands, timeout}) {
    const {width, height } = layers.getDimension()
    const all = layers.getAll()
    
    model.points = [{ x: 0, y: 0 }]
    model.angle = 0
    model.width = width
    model.height = height
    model.x = width/2
    model.y = height/2
    // drawTriangle(all[1].ctx,20, model.points[0], model.angle)
    await draw(all, commands, timeout)
}
async function repeat(ctx, command, timeout) {
    await repete(command.arg, async () => {
        for (const child of command.children) {
            if (child.verb === 'r') {
                await repeat(ctx, child, timeout)
            } else {
                await promisedFn(basicCommand(ctx), child, timeout)
            }
        }
    })
}
function avance(all, pixelsNum, drawingMode) {
    const lastPoint = model.points[model.points.length -1]
    const x = Math.cos(model.angle)*pixelsNum
    const y = Math.sin(model.angle)*pixelsNum
    const newPoint = {x: lastPoint.x + x, y: lastPoint.y + y}
    model.points.push(newPoint)
    drawLine(all[0].ctx, lastPoint, newPoint, drawingMode)
    

}
async function repete(times, fn) {
    for (let i = 0; i < times; i++) {
      await fn()
    }
}
function tourne(all, angle) {
    model.angle -= degToRad(angle)
    const {ctx, clear} = all[1]
    /*clear()
    drawTriangle(ctx ,20, {x:0, y:0}, model.angle)*/
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
  return function(command) {
    switch (command.verb) {
      case 'a':
        avance (all, command.arg[0], command.mode) 
        break
      case 't':
        tourne (all, command.arg[0])
        break
    }
  }
}
async function draw(all, commands, timeout) {
    for (const command of commands) {
      if (command.verb === 'r') {
        await repeat(all, command, timeout)
      } else {
        await promisedFn(basicCommand(all), command, timeout)
      }
    }
}
async function promisedFn (fn, arg, timeout = 50) {
    return new Promise (
      (resolve) => setTimeout(
        () => {
          fn(arg)
          resolve()
        }, 0
      )
    )
}