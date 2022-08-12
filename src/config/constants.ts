
import path from 'path'

export const VERSION =  'v'+ require('./../../package.json').version
export const CURRENT_NODE_VERSION = process.version
export const MAJOR_NODE_VERSION = parseInt( process.version.split('.')[0].replace('v', '') )
export const SUPPORTED_NODE_VERSION = '7+'

export const ENV = {
  type: 'node',
  language: 'node_js',
  support: SUPPORTED_NODE_VERSION,
  current: CURRENT_NODE_VERSION
}
export const ENTITIES = ['NODE', 'ELEMENT']
export const DOTOMNIS_FILE_PATH: string = path.resolve( process.cwd(), '.omnis')

export const CENTRAL_ROUTING_NODE = 'CRN'

export const SHOW_METRICS = false
export const STAT_FEED_DELAY = 10 // seconds
export const RECONNECT_CHECK_DELAY = 2 // seconds
export const SHUTDOWN_DELAY = 10 // seconds

export const SHUTDOWN_ALTERNATIVES = [ 'SWITCH' ]

export const METRIC_TRACKERS = [ 'hook' ]
export const DEFAULT_PORT = 4400
export const DEFAULT_TUNNEL = 'https://localtunnel.me' // 'https://xcn.net'

export const ORACLE_SERVER = process.env.XCN_ORACLE_HOST || 'http://localhost:9966' // Change for custom and private networks
export const OMNISCIOUS_SERVER = 'http://0.0.0.0:8808' // Unique for any network: Private or Public
export const DNS_SERVERS = [
  '127.0.0.1:4400',
  '4.4.4.4'

]
export const DNS_FALLBACK_SERVICES = [
  'https://ifconfig.co/ip'
]

export const CLI_CONFIG = {
  process: {
    input: process.stdin,
    output: process.stdout,
    removeHistoryDuplicates: true
  },
  theme: {
    color: 202,
    plainMode: false
  },
  label: {
    prefix: { index: '', form: ' ', sub: ' - ' },
    sufix: { index: '$ ', form: '# ' },
  }
}
export const IO_CONNECTION_CONFIG = {
  // origins: [ 'http://localhost:' ],
  serveClient: false,
  cookie: false,

  // Port the policy server listen to
  policyPort: 880,

  // Disable auto-reconnection
  reconnection: false,

  /* Self-signed certification application
    configuration at the client-side: require
    integration with https at the server-side
    also SSL configure
  */
  // option 1
  // ca: fs.readFileSync('server-cert.pem'),
  // option 2. WARNING: it leaves you vulnerable to MITM attacks!
  // rejectUnauthorized: false
}
export const IO_CONNECTION_STATES = [
  { level: 1, label: 'STABLE', range: [ 0, 2.6 ] },
  { level: 2, label: 'RELIABLE', range: [ 2.6, 5.5 ] },
  { level: 3, label: 'WEAK', range: [ 5.5, 12.7 ] },
  { level: 4, label: 'CRITICAL', range: [ 12.7 ] }
]


