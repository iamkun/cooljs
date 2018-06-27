export default class Instance {
  constructor(option = {}) {
    const { name, painter, action, trigger } = option
    this.name = name
    this.x = 0
    this.y = 0
    this.width = 0
    this.height = 0
    this.ax = 0
    this.ay = 0
    this.vx = 0
    this.vy = 0
    this.visible = true
    this.painter = painter || null
    this.action = action || null
    this.trigger = trigger || null
    this.ready = false
  }

  paint(engine) {
    if (this.painter !== null && this.visible) {
      this.painter(this, engine)
    }
  }

  update(engine, time) {
    if (this.action !== null) {
      this.action(this, engine, time)
    }
  }

  updateWidth(width) {
    this.width = width
    this.calWidth = width / 2
  }

  updateHeight(height) {
    this.height = height
    this.calHeight = height / 2
  }
}
