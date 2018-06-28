export const getCurrentTime = () => (performance.now())

export const random = (min, max) => (Math.random() * (max - min)) + min

export const randomPositiveNegative = () => (Math.random() < 0.5 ? -1 : 1)

export const isFunction = f => (typeof f === 'function')

export const isTouchDevice = () => ('ontouchstart' in window || window.navigator.msMaxTouchPoints)

export const requestAnimationFrameTool = ((() => {
  const FPS = 60
  let timeout = 1000 / FPS
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    ((callBack) => {
      window.setTimeout(() => {
        const start = getCurrentTime()
        callBack(start)
        const end = getCurrentTime()
        timeout = (1000 / FPS) - (end - start)
      }, timeout)
    })
}))()

export const arraySwap = (array, index1, index2) => {
  const temp = array[index2]
  array[index2] = array[index1]
  array[index1] = temp
}
