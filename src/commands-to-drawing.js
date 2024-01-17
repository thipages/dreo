const model = { }
export async function drawer ({layers, commands, timeout}) {
    const {width, height } = layers.getDimension()
    const ctx = layers.getContext(0)
    //const ctxPointer = layers.getContext(1)
    model.points = [{ x: 0, y: 0 }]
    model.angle = 0
    model.width = width
    model.height = height
    model.x = width/2
    model.y = height/2
    await draw(ctx, commands, timeout)
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
function avance(ctx, pixelsNum, drawingMode) {
    const lastPoint = model.points[model.points.length -1]
    const x = Math.cos(model.angle)*pixelsNum
    const y = Math.sin(model.angle)*pixelsNum
    const newPoint = {x: lastPoint.x + x, y: lastPoint.y + y}
    model.points.push(newPoint)
    drawLine(ctx, lastPoint, newPoint, drawingMode)
}
async function repete(times, fn) {
    for (let i = 0; i < times; i++) {
      await fn()
    }
}
function tourne(angle) {
    model.angle -= degToRad(angle)
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
function basicCommand(ctx) {
  return function(command) {
    switch (command.verb) {
      case 'a':
        avance (ctx, command.arg, command.mode) 
        break
      case 't':
        tourne (command.arg)
        break
    }
  }
}
async function draw(ctx, commands, timeout) {
    for (const command of commands) {
      if (command.verb === 'r') {
        await repeat(ctx, command, timeout)
      } else {
        await promisedFn(basicCommand(ctx), command, timeout)
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