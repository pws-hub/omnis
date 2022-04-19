
export interface ON {
  REQUIRED_CONFIGS: null
  DNSServer: null
  HTTPServer: null
  ONServer: null
  HookClient: null
  OmnisClient: null
  SocketClient: null
  ServiceHookClient: null
  HostServerIPv4: null

  NODEChannel: null
  GUESTChannel: null

  GetConnectPayload: null
  GetConnectCallback: null
  ServiceInterfaceSocket: false
  ServiceInterfaceChannel: null

  CLI_MODE: boolean
  DEBUG_MODE: boolean
  SECURE_MODE: boolean
  CRITICAL_SWITCH_MODE: boolean

  INTERFACES: {}
  NODE_CATALOGUE: {}
  SCOPES_CATALOGUE: { datatype: [], fields: {} } // init state of a scopes catalogue
  HOOK_ACTIVE_DATA: null
  PARENT_HOOK_DATA: null

  /*----------------------------------------------------------------------------------*/
  IS_CONNECTED: boolean
  FIRST_CONNECTION: boolean
  INTERNET_CONNECTION: boolean
  SOCKET_ATTEMPTED_RECONNECT_COUNT: number

  PREREQUEST_CONNECTION_LIST: {}
  SCOPE_REQUEST_WHITELIST: {} // unavailable scopes requested guests list

  ANALYSIS_TRACKING_STATS: {}
  ANALYSIS_ACTIVE_TRACKERS: {}

  CONNECTED_GUESTS: {}
  CONNECTED_NODES: {}
  CONNECTED_SCOPES: {}  // details of all platforms connect in the xConnect network
  CONNECTED_PLATFORMS: {} // details of all platforms connect in the xConnect network

  AnalysisChecker: number
  RefreshTimeChecker: number
  socketReconnectChecker: number

  /*----------------------------------------------------------------------------------*/

  Readline: null
  event: Events
}

export type ClientConnection = {
  host: string
  channel?: string
}
