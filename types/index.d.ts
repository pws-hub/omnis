
export type OmnisConfig = {
  entity: 'NODE' | 'ELEMENT'
  name: string
  description: string
  port: number,
  private?: boolean
  accessKey?: string
  connection?: {
    standalone: false,
    groups: [ '*' ],
    maxConn: 1000
  },
  catalogue?: {
    path?: string,
    scopes?: string[]
  },
  dependencies?: string[]
}