export interface IElectronSettings {
  autoStart: boolean
  useBeta: boolean
  mouseIdleTime: number
  mouseIdleMute: boolean
  useUrl: string
}
export const defaultElectronSettings: IElectronSettings = {
  autoStart: true,
  useBeta: false,
  mouseIdleTime: 5,
  mouseIdleMute: true,
  useUrl: '',
}
