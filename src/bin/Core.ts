import fs from 'fs-extra'
import Events from 'events'
import { DOTOMNIS_FILE_PATH, ENTITIES } from '../config/constants'
import { debug } from '../utils'
import type { OmnisConfig } from '../../types'

export default class Core {

  private REQUIRED_CONFIGS: null = null
  private DNSServer: null = null
  private HTTPServer: null = null
  private ONServer: null = null
  private HookClient: null = null
  private OmnisClient: null = null
  private SocketClient: null = null
  private ServiceHookClient: null = null
  private HostServerIPv4: null = null

  private NODEChannel: null = null
  private GUESTChannel: null = null

  private GetConnectPayload: null = null
  private GetConnectCallback: null = null
  private ServiceInterfaceSocket: boolean = false
  private ServiceInterfaceChannel: null = null

  private CLI_MODE: boolean = false
  private DEBUG_MODE: boolean = process.argv.slice(2).includes('--debug')
  private SECURE_MODE: boolean = false
  private CRITICAL_SWITCH_MODE: boolean = false

  private INTERFACES = {}
  private NODE_CATALOGUE = {}
  private SCOPES_CATALOGUE = { datatype: [], fields: {} } // init state of a scopes catalogue
  private HOOK_ACTIVE_DATA: null = null
  private PARENT_HOOK_DATA: null = null

  /*----------------------------------------------------------------------------------*/
  private IS_CONNECTED: boolean = false
  private FIRST_CONNECTION: boolean = false
  private INTERNET_CONNECTION: boolean = false
  private SOCKET_ATTEMPTED_RECONNECT_COUNT: number = 0

  private PREREQUEST_CONNECTION_LIST = {}
  private SCOPE_REQUEST_WHITELIST = {} // unavailable scopes requested guests list

  private ANALYSIS_TRACKING_STATS = {}
  private ANALYSIS_ACTIVE_TRACKERS = {}

  private CONNECTED_GUESTS = {}
  private CONNECTED_NODES = {}
  private CONNECTED_SCOPES = {}  // details of all platforms connect in the xConnect network
  private CONNECTED_PLATFORMS = {} // details of all platforms connect in the xConnect network

  private AnalysisChecker: number = 0
  private RefreshTimeChecker: number = 0
  private socketReconnectChecker: number = 0

  /*----------------------------------------------------------------------------------*/

  private Readline: null = null
  private event = new Events.EventEmitter()

  async init( config?: OmnisConfig ){

    if( !config || typeof config != 'object' ){
      if( await fs.pathExists( DOTOMNIS_FILE_PATH ) )
        try { config = await fs.readJSON( DOTOMNIS_FILE_PATH ) as OmnisConfig }
        catch( error ){ 
          debug('error', error )
          return
        }
      else {
        debug('error', 'No Configuration Found')
        return
      }
    }
    
    // Set GPR as default peer type
    if( !config.entity || !ENTITIES.includes( config.entity ) )
      config.entity = 'ELEMENT'

    return require('../entities/'+ config.entity ).default( config )
  }
}