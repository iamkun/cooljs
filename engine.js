import * as utils from './utils'
import Tween from './tween'

const { requestAnimationFrameTool, isFunction, isTouchDevice } = utils

export default class Engine {
  constructor(option = {}) {
    if (!document.createElement('canvas').getContext) {
      window.alert('HTML5 Canvas is not supported in your browser.') // eslint-disable-line
      return
    }
    const {
      canvasId, debug, width, height, highResolution, loadLimit, soundOn
    } = option
    let canvasWidth = width || window.innerWidth
    let canvasHeight = height || window.innerHeight
    this.canvas = document.getElementById(canvasId)
    if (highResolution) {
      this.canvas.style.width = `${canvasWidth}px`
      this.canvas.style.height = `${canvasHeight}px`
      canvasWidth *= 2
      canvasHeight *= 2
    }
    this.highResolution = highResolution
    this.canvas.width = canvasWidth
    this.canvas.height = canvasHeight
    this.width = this.canvas.width
    this.height = this.canvas.height
    this.calWidth = this.width * 0.5
    this.calHeight = this.height * 0.5
    // general
    this.debug = !!debug
    this.ctx = this.canvas.getContext('2d')
    this.defaultLayer = 'default'
    this.layerArr = [this.defaultLayer]
    this.instancesObj = {}
    this.instancesObj[this.defaultLayer] = []
    this.instancesReactionArr = []
    this.utils = utils
    this.customVariable = {}
    const self = this
    this.isTouchDevice = isTouchDevice()
    this.debugArr = []
    // assets
    this.assetsObj = {
      image: {},
      audio: {}
    }
    this.assetsCount = {
      image: 0,
      audio: 0
    }
    this.assetsErrorQueue = []
    this.assetsErrorCount = 0
    this.loadLimit = loadLimit || 3
    // audio
    this.soundOn = !!soundOn
    // time
    this.fps = 0
    this.lastTime = 0
    this.lastPausedAt = 0
    this.pausedTime = 0
    this.paused = false
    this.timeMovement = {}
    this.timeMovementStartArr = []
    this.timeMovementFinishArr = []
    // keys
    this.keyUpListeners = {}
    this.keyDownListeners = {}
    this.keyPressListeners = {}
    // hooks
    this.startAnimate = () => {
    }
    this.paintUnderInstance = () => {
    }
    this.paintAboveInstance = () => {
    }
    this.endAnimate = () => {
    }
    this.touchStartListener = () => {
    }
    this.touchEndListener = () => {
    }
    this.touchMoveListener = () => {
    }
    // global event listener
    // key
    document.addEventListener('keyup', (e) => {
      self.keyListener(e, 'keyup')
    }, false)
    document.addEventListener('keydown', (e) => {
      self.keyListener(e, 'keydown')
    }, false)
    document.addEventListener('keypress', (e) => {
      self.keyListener(e, 'keypress')
    }, false)
    // touch
    if (this.isTouchDevice) {
      document.addEventListener('touchstart', (e) => {
        self.touchStartListener(e)
      }, false)
      document.addEventListener('touchend', (e) => {
        self.touchEndListener(e)
      }, false)
      document.addEventListener('touchmove', (e) => {
        self.touchMoveListener(e)
      }, false)
    } else {
      document.addEventListener('mousedown', (e) => {
        self.touchStartListener(e)
      }, false)
      document.addEventListener('mouseup', (e) => {
        self.touchEndListener(e)
      }, false)
      document.addEventListener('mousemove', (e) => {
        self.touchMoveListener(e)
      }, false)
    }
  }

  triggerReaction(x, y) {
    let calX = x
    let calY = y
    if (this.highResolution) {
      calX *= 2
      calY *= 2
    }
    this.instancesReactionArr.forEach((i) => {
      if (!i.visible) return
      if (calX >= i.x && calX<= i.x + i.width && calY >= i.y && calY<= i.y + i.height) {
        i.trigger(i, this)
      }
    })
  }

  addAudio(name, src, retry = 0) {
    if (!this.soundOn) return
    if (!retry) this.assetsCount.audio += 1
    const a = new window.Audio()
    a.src = src
    // a.addEventListener('canplaythrough', () => {
    //   this.assetsObj.audio[name] = a
    // }, false)
    // bug sometime not trigger canplaythrough
    this.assetsObj.audio[name] = a
    a.addEventListener('error', () => {
      this.assetsErrorQueue.push({
        name,
        src,
        retry: retry + 1,
        type: 'audio'
      })
    }, false)
    a.load()
  }

  getAudio(name) {
    return this.assetsObj.audio[name]
  }

  playAudio(name, loop = false) {
    if (!this.soundOn) return
    const audio = this.getAudio(name)
    // const audio = document.getElementById(name)
    if (audio) {
      audio.play()
      if (!loop) return
      audio.addEventListener('ended', () => {
        audio.currentTime = 0
        audio.play()
      }, false)
    }
  }

  pauseAudio(name) {
    const audio = this.getAudio(name)
    if (audio) {
      audio.pause()
    }
  }

  setVariable(key, value) {
    this.customVariable[key] = value
  }

  getVariable(key, defaultValue = null) {
    const customVariable = this.customVariable[key]
    if (customVariable) {
      return customVariable
    }
    if (defaultValue !== null) {
      this.setVariable(key, defaultValue)
      return defaultValue
    }
    return null
  }

  addImg(name, src, retry = 0) {
    if (!retry) this.assetsCount.image += 1
    const i = new window.Image()
    i.src = src
    i.onload = () => {
      this.assetsObj.image[name] = i
    }
    i.onerror = () => {
      this.assetsErrorQueue.push({
        name,
        src,
        retry: retry + 1,
        type: 'image'
      })
    }
  }

  getImg(name) {
    return this.assetsObj.image[name]
  }

  animate(time) {
    const gameTime = time - this.pausedTime
    const self = this
    if (this.paused) {
      setTimeout(() => {
        this.animate.call(self, gameTime)
      }, 100)
      return
    }
    this.tick(gameTime)
    this.clean()
    this.startAnimate(this, gameTime)
    this.paintUnderInstance(this)
    this.updateInstances(gameTime)
    this.paintInstances()
    this.paintAboveInstance()
    this.endAnimate(this, gameTime)
    this.tickTimeMovement()
    this.debug && this.showFps()
    this.debug && this.drawDebug()
    requestAnimationFrameTool((_time) => {
      this.animate.call(self, _time)
    })
  }

  showFps() {
    this.ctx.save()
    this.ctx.fillStyle = 'red'
    this.ctx.font = `${this.highResolution ? 32 : 16}px Arial`
    this.ctx.fillText(`FPS: ${this.fps.toFixed()}`, 5, this.highResolution ? 40 : 20)
    this.ctx.restore()
  }

  debugLineX(y) {
    this.debugArr.push({
      type: 'lineX',
      y
    })
  }

  debugLineY(x) {
    this.debugArr.push({
      type: 'lineY',
      x
    })
  }

  debugDot(x, y) {
    this.debugArr.push({
      type: 'dot',
      x,
      y
    })
  }

  drawDebug() {
    this.debugArr.forEach((i) => {
      const { type, x, y } = i
      switch (type) {
        case 'dot':
          this.drawDebugDot(x, y)
          break
        case 'lineX':
          this.drawDebugLine(null, y)
          break
        case 'lineY':
          this.drawDebugLine(x, null)
          break
        default:
          break
      }
    })
    this.instancesReactionArr.forEach((i) => {
      if (!i.visible) return
      this.ctx.strokeStyle = 'red'
      this.ctx.beginPath()
      this.ctx.rect(i.x, i.y, i.width, i.height)
      this.ctx.stroke()
    })
  }

  drawDebugLine(x, y) {
    let from = [0, y]
    let to = [this.width, y]
    if (x) {
      from = [x, 0]
      to = [x, this.height]
    }
    this.ctx.save()
    this.ctx.strokeStyle = 'red'
    this.ctx.beginPath()
    this.ctx.moveTo(...from)
    this.ctx.lineTo(...to)
    this.ctx.stroke()
    this.ctx.restore()
  }

  drawDebugDot(x, y) {
    this.ctx.save()
    this.ctx.fillStyle = 'red'
    this.ctx.beginPath()
    this.ctx.arc(x, y, 2, 0, 2 * Math.PI, true)
    this.ctx.fill()
    this.ctx.fillStyle = 'white'
    this.ctx.beginPath()
    this.ctx.arc(x, y, 1, 0, 2 * Math.PI, true)
    this.ctx.fill()
    this.ctx.restore()
  }

  tick(time) {
    this.updateFps(time)
    this.lastTime = time
  }

  updateFps(time) {
    if (this.lastTime === 0) {
      this.fps = 60
    } else {
      this.fps = 1000 / (time - this.lastTime)
    }
  }

  pixelsPerFrame(velocity) {
    return velocity / this.fps
  }

  tickTimeMovement() {
    this.timeMovementStartArr.forEach((name) => {
      this.timeMovement[name].processing = true
    })
    this.timeMovementStartArr = []
    this.timeMovementFinishArr.forEach((name) => {
      delete this.timeMovement[name]
    })
    this.timeMovementFinishArr = []
  }

  getTimeMovement(name, value, render, option = {}) {
    const { before, after } = option
    const timingFunc = Tween[option.easing || 'linear']
    const movementInstanceName = option.name || 'default'
    const movement = this.timeMovement[name]
    if (!movement) {
      return
    }
    if (!movement.processing) {
      this.timeMovementStartArr.push(name)
      movement.store[movementInstanceName] = []
      value.forEach((v) => {
        movement.store[movementInstanceName].push({
          start: parseFloat(v[0]),
          end: parseFloat(v[1])
        })
      })
      before && before()
    }
    const processRender = (lastRender = false) => {
      const { duration } = movement
      let t = duration
      if (!lastRender) {
        const currentTime = this.utils.getCurrentTime()
        const { startTime } = movement
        t = currentTime - startTime
      }
      const values = movement.store[movementInstanceName]
        .map(v => timingFunc(t, v.start, v.end - v.start, duration))
      render.apply(this, values)
    }
    if (this.checkTimeMovement(name)) {
      processRender()
    } else {
      this.timeMovementFinishArr.push(name)
      processRender(true)
      after && after()
    }
  }

  checkTimeMovement(name) {
    const movement = this.timeMovement[name] || {}
    return this.utils.getCurrentTime() <= movement.endTime
  }

  setTimeMovement(name, duration) {
    const currentTime = this.utils.getCurrentTime()
    this.timeMovement[name] = {
      startTime: currentTime,
      endTime: currentTime + duration,
      duration,
      store: {}
    }
  }

  clean() {
    this.ctx.clearRect(0, 0, this.width, this.height)
    this.debugArr = []
  }

  addLayer(layer) {
    this.layerArr.push(layer)
    this.instancesObj[layer] = []
  }

  removeLayer(layer) {
    this.layerArr = this.layerArr.filter(i => i !== layer)
    delete this.instancesObj[layer]
  }

  swapLayer(index1, index2) {
    this.utils.arraySwap(this.layerArr, index1, index2)
  }

  addInstance(instance, layer = this.defaultLayer) {
    this.instancesObj[layer].push(instance)
    if (instance.trigger) this.instancesReactionArr.push(instance)
  }

  getInstance(name, layer = this.defaultLayer) {
    return this.instancesObj[layer].filter(i => i.name === name)[0]
  }

  removeInstance(name, layer = this.defaultLayer) {
    const instance = this.getInstance(name, layer)
    if (instance) {
      this.instancesObj[layer] = this.instancesObj[layer].filter(i => i.name !== name)
      if (instance.trigger) {
        this.instancesReactionArr = this.instancesReactionArr.filter(i => i.name !== name)
      }
    }
  }

  updateInstances(time) {
    this.layerArr.forEach((l) => {
      this.instancesObj[l].forEach((i) => {
        i.update && i.update(this, time)
      })
    })
  }

  paintInstances() {
    this.layerArr.forEach((l) => {
      this.instancesObj[l].forEach((i) => {
        i.paint && i.paint(this)
      })
    })
  }

  togglePaused() {
    const now = this.utils.getCurrentTime()
    this.paused = !this.paused
    if (this.paused) {
      this.lastPausedAt = now
    } else {
      this.pausedTime += (now - this.lastPausedAt)
    }
  }

  addKeyUpListener(key, listener) {
    this.keyUpListeners[key] = listener
  }

  addKeyDownListener(key, listener) {
    this.keyDownListeners[key] = listener
  }

  addKeyPressListener(key, listener) {
    this.keyPressListeners[key] = listener
  }

  findKeyListener(key, type) {
    if (type === 'keyup') {
      return this.keyUpListeners[key]
    } else if (type === 'keydown') {
      return this.keyDownListeners[key]
    }
    return this.keyPressListeners[key]
  }

  keyListener(e, type) {
    let key
    switch (e.keyCode) {
      case 13:
        key = 'enter'
        break
      case 32:
        key = 'space'
        break
      case 37:
        key = 'leftArrow'
        break
      case 39:
        key = 'rightArrow'
        break
      case 38:
        key = 'upArrow'
        break
      case 40:
        key = 'downArrow'
        break
      default:
        key = e.keyCode
        break
    }
    const listener = this.findKeyListener(key, type)
    if (listener) listener()
  }


  load(onload, loading) {
    const id = setInterval(() => {
      const assetsTotalCount = this.assetsCount.image + this.assetsCount.audio
      const assetsLoadedCount = Object.keys(this.assetsObj.image).length
        + Object.keys(this.assetsObj.audio).length
      if (loading && isFunction(loading)) {
        loading({
          success: assetsLoadedCount,
          failed: this.assetsErrorCount,
          total: assetsTotalCount
        })
      }
      if (this.assetsErrorQueue.length > 0) {
        this.assetsErrorQueue.forEach((i) => {
          const {
            retry, name, src, type
          } = i
          if (retry >= this.loadLimit) {
            this.assetsErrorCount += 1
          } else if (type === 'image') {
            this.addImg(name, src, retry)
          } else {
            this.addAudio(name, src, retry)
          }
        })
        this.assetsErrorQueue = []
      }
      if (assetsLoadedCount === assetsTotalCount) {
        if (onload && isFunction(onload)) {
          onload()
        } else {
          this.init()
        }
        clearInterval(id)
      }
    }, 200)
  }

  init() {
    const self = this
    requestAnimationFrameTool((time) => {
      this.animate.call(self, time)
    })
  }
}
