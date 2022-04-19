
import Events from 'events'
import type { ON } from '../../types'

export const Core: ON = {

  REQUIRED_CONFIGS: null,
  DNSServer: null,
  HTTPServer: null,
  ONServer: null,
  HookClient: null,
  OmnisClient: null,
  SocketClient: null,
  ServiceHookClient: null,
  HostServerIPv4: null,

  NODEChannel: null,
  GUESTChannel: null,

  GetConnectPayload: null,
  GetConnectCallback: null,
  ServiceInterfaceSocket: false,
  ServiceInterfaceChannel: null,

  CLI_MODE: false,
  DEBUG_MODE: process.argv.slice(2).includes('--debug'),
  SECURE_MODE: false,
  CRITICAL_SWITCH_MODE: false,

  INTERFACES: {},
  NODE_CATALOGUE: {},
  SCOPES_CATALOGUE: { datatype: [], fields: {} }, // init state of a scopes catalogue
  HOOK_ACTIVE_DATA: null,
  PARENT_HOOK_DATA: null,

  /*----------------------------------------------------------------------------------*/
  IS_CONNECTED: false,
  FIRST_CONNECTION: false,
  INTERNET_CONNECTION: false,
  SOCKET_ATTEMPTED_RECONNECT_COUNT: 0,

  PREREQUEST_CONNECTION_LIST: {},
  SCOPE_REQUEST_WHITELIST: {}, // unavailable scopes requested guests list

  ANALYSIS_TRACKING_STATS: {},
  ANALYSIS_ACTIVE_TRACKERS: {},

  CONNECTED_GUESTS: {},
  CONNECTED_NODES: {},
  CONNECTED_SCOPES: {},  // details of all platforms connect in the xConnect network
  CONNECTED_PLATFORMS: {}, // details of all platforms connect in the xConnect network

  AnalysisChecker: 0,
  RefreshTimeChecker: 0,
  socketReconnectChecker: 0,

  /*----------------------------------------------------------------------------------*/

  Readline: null,
  event: new Events.EventEmitter()

}
