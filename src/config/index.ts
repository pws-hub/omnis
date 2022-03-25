
declare global {
  var Config: {
    [index: string]: any
  }
}

type ConfigSchema = {
  type: 'NSR' | 'GPR'
  role: 'OMNIS' | 'NODE' | 'GUEST',
  cid?: string
  uri?: string
  port?: number

  [index: string]: any
  get( key: string ): any
  set( key: string, value: any ): void
}

global.Config = {
  type: 'NSR',
  role: 'NODE',
  cid: 'ad9uasdf9283g9g2379g2973g923',
  // port: 4000,
  // uri: 'http://localhost:4000'

  get( key: string ){ return this[ key ] },
  set( key: string, value: any ){ this[ key ] = value }
} as ConfigSchema

export default () => {}