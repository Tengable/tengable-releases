import { powerMonitor } from 'electron'
import { screen } from 'electron'

export enum EventEnum {
  idle = 'idle',
  active = 'active',
}

export class IdleMonitor {
  private idle = false
  /**
   *
   * @param timeoutTime minutes to be considered idle
   */
  public timeoutTime = 1
  constructor(timeoutTime: number = 5, public monitorMouseMovements = true) {
    this.timeoutTime = timeoutTime
    powerMonitor.on('suspend', this.triggerIdleFromPowerEvent)
    powerMonitor.on('lock-screen', this.triggerIdleFromPowerEvent)

    powerMonitor.on('unlock-screen', this.triggerActiveFromPowerEvent)
    powerMonitor.on('resume', this.triggerActiveFromPowerEvent)
    this.monitorIdleTime()
  }
  lastMove = Date.now()
  interval: ReturnType<typeof setInterval> | null = null
  monitorIdleTime = () => {
    let { x, y } = screen.getCursorScreenPoint()
    this.interval = setInterval(() => {
      const position = screen.getCursorScreenPoint()
      if (position.x !== x || position.y !== y) {
        this.lastMove = Date.now()
        x = position.x
        y = position.y
        if (this.monitorMouseMovements) this.setIdle(false)
      }
      this.checkForInactivity()
    }, 250)
  }
  private checkForInactivity = () => {
    if (!this.monitorMouseMovements) return
    const secondsSinceLastMove = Math.floor((Date.now() - this.lastMove) / 1000)
    const idleTimeSeconds = this.timeoutTime * 60
    if (secondsSinceLastMove >= idleTimeSeconds) {
      this.setIdle(true)
    }
  }
  setIdle = (idle: boolean) => {
    if (idle && !this.idle) this.emit(EventEnum.idle)
    if (!idle && this.idle) this.emit(EventEnum.active)
    this.idle = idle
  }
  destroy = () => {
    powerMonitor.off('suspend', this.triggerIdleFromPowerEvent)
    powerMonitor.off('lock-screen', this.triggerIdleFromPowerEvent)

    powerMonitor.off('resume', this.triggerActiveFromPowerEvent)
    powerMonitor.off('unlock-screen', this.triggerActiveFromPowerEvent)
    if (this.interval !== null) clearInterval(this.interval)
  }
  listeners: { [key: string]: (() => any)[] | undefined } = {}
  on = (event: EventEnum, listener: () => any) => {
    const listeners = this.listeners[event] || []
    this.listeners[event] = [...listeners, listener]
    return () => {
      this.listeners[event] = (this.listeners[event] || []).filter(
        (fn) => fn !== listener
      )
    }
  }
  off = (event: EventEnum, listener: () => any) => {
    this.listeners[event] = (this.listeners[event] || []).filter(
      (fn) => fn !== listener
    )
  }
  private triggerIdleFromPowerEvent = () => this.setIdle(true)
  private triggerActiveFromPowerEvent = () => this.setIdle(false)

  emit = (event: EventEnum) => {
    ;(this.listeners[event] || []).forEach((fn) => fn())
  }
}
