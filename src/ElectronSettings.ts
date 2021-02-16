export interface IElectronSettings {
  autoStart: boolean
  useBeta: boolean
  mouseIdleTime: number
  mouseIdleMute: boolean
  useStaging: boolean
}
export const defaultElectronSettings: IElectronSettings = {
  autoStart: true,
  useBeta: false,
  mouseIdleTime: 5,
  mouseIdleMute: true,
  useStaging: false,
}
