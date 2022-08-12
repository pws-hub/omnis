
import { URL } from 'url'
import CryptoJS from 'crypto-js'
import Emitter from 'component-emitter' // polyfill of Node.js EventEmitter in the browser
import ioServer, { Namespace } from 'socket.io'
import ioClient from 'socket.io-client'
// import { createClient } from 'redis'
// import { createAdapter } from '@socket.io/redis-adapter'
import { E3 } from '../../types/E3'
import {
  Info, 
  debug,
  toHTTP,
  Params2Obj,
} from '../utils'
import {
  ENTITIES,
  DEFAULT_PORT,
  IO_CONNECTION_CONFIG
} from '../config/constants'

// End-2-End Encryption Protocol
class E3Proto {

  private pubKey = ''
  private newPubKey = '' // Use during refreshing keys
  private priKey = ''
  private cipherParams: any
  private options: E3.Options
  private isGenerated = false

  constructor( options: E3.Options ){
    this.options = options || {}
    this.cipherParams = {
      mode: CryptoJS.mode[ this.options.mode || 'CFB' ],
      padding: CryptoJS.pad[ this.options.padding || 'AnsiX923' ]
    }
  }

  debug( error: string ){ console.log( error ) }

  getPrivKey(){
    /* Return the generated private key:
    * Only the keys generator end could access this
    */
    return this.isGenerated ? this.priKey && this.priKey.toString() : null
  }

  getPubKey(){
    // Return the generated public key
    return this.newPubKey || (this.pubKey && this.pubKey.toString())
  }

  getConfig(){
    /* Return encryption configuration:
    * Only the keys generator end could access this
    */
    return this.isGenerated ? this.cipherParams : null
  }

  generateKeys( refresh?: boolean ){
    
    if( !this.options.sid  || !this.options.session ){
      this.debug('Undefined Auth Configuration')
      return false
    }

    try {
      const
      salt = CryptoJS.lib.WordArray.random( 128 / 8 ),
      pubKey = CryptoJS.PBKDF2( this.options.session, salt, { keySize: 512 / 32, iterations: 1000 } )
                        .toString( CryptoJS.enc.Base64 )
                        .replace(/=+$/, '')

      refresh ?
        this.newPubKey = pubKey
        : this.adoptKey( pubKey )

      return this.isGenerated = true
    }
    catch( error ){
      console.log( error )
      return this.isGenerated
    }
  }

  adoptKey( pubKey: string ){
    
    // if( !this.newPubKey && this.pubKey && this.pubKey !== pubKey ){
    //   this.debug('Unmatched Public Key')
    //   return false
    // }
    
    try {
      this.cipherParams.iv = CryptoJS.SHA256( pubKey + this.options.session )
      this.pubKey = pubKey
      this.newPubKey = '' // No more needed

      const
      plen = pubKey.length,
      clen = this.options.sid.length

      /* Concate the [1/4 - 2/4] fragment of pubKey
        and the [2/5 - end] fragment of client ID
        then hash it to generate the privKey
      */
      let token = ( pubKey.substr( plen/4, plen/2 )
                  + this.options.sid 
                  + this.options.session
                        .replace(/=+$/,'')
                        .substring( Math.ceil( clen * (2/5) ) ) ).split('')

      // Reverse fragment chars
      token = token.reverse()

      this.priKey = CryptoJS.SHA512( token.join('') ).toString()
      return true
    }
    catch( error ){
      console.log( error )
      return false
    }
  }

  encrypt( payload: any ){

    if( payload === undefined )
      return this.debug('Undefined encryption payload')

    if( !this.pubKey || !this.priKey )
      return this.debug('Undefined Encryption Keys')

    try {
      payload = typeof payload == 'object' ? JSON.stringify( payload ) : String( payload )
      return CryptoJS.AES.encrypt( payload, this.priKey, this.cipherParams ).toString()
    }
    catch( error ){ console.log( error ) }
  }

  decrypt( token: string ){

    if( token === undefined )
      return this.debug('Undefined decryption token')

    if( !this.pubKey || !this.priKey )
      return this.debug('Undefined Encryption Keys')

    try {
      const decrypted = CryptoJS.AES.decrypt( token, this.priKey, this.cipherParams )
                                    .toString( CryptoJS.enc.Utf8 )

      // return encoded input type of the argument
      try { return JSON.parse( decrypted ) }
      catch( error ){ return Number( decrypted ) || decrypted }
    }
    catch( error ){ this.debug('Invalid Public Key') }
  }
}

type ParserStoreSet = {
  token: string
  protocol: E3Proto
  expiry?: number
}

interface ParserStore {
  get: ( sid?: string ) => ParserStoreSet
  set: ( toStore: ParserStoreSet, sid?: string ) => void
}

const 
Parser = ( type: string, meta: E3.Meta, Store: ParserStore ) => {

  // Socket-Server
  if( !meta.session ){
    debug('E3Proto', Info('Unauthorize End-To-End Connection') )
    return {}
  }

  class Encoder {
    /** Encode a packet into a list of strings/buffers
     */
    encode( packet: any ){
      
      if( packet.type === 0 ){
        if( type == 'server' ){
          // Initialize End-to-End Encryption protocol
          const protocol = new E3Proto({ sid: packet.data.sid, ...meta })
          
          // Generate keys: privKey, pubKey
          if( !protocol.generateKeys() ){
            debug('E3Proto', 'Unauthorized End-To-End Connection \t[CID]: '+ packet.data.sid )
            return false
          }

          // Initialize encrypted commnunication interfaces
          debug('E3Proto', Info('END-TO-END Encryption Initialized') )

          const toStore: ParserStoreSet = {
            protocol,
            token: packet.token = protocol.getPubKey(), // Get public Key as token to be send to client
            expiry: Date.now() + ( 90 * 1000 ) // Token expires every 90 seconds
          }

          // Attach to the socket
          Store.set( toStore, packet.data.sid )
        }
        
        return [ JSON.stringify( packet ) ]
      }
      // Connection Error
      else if( packet.type === 4 ) 
        return [ JSON.stringify( packet ) ]

      else {
        if( packet.type !== 3 && Array.isArray( packet.data ) ){
          const sid = packet.data[1]
          packet.data.splice(1, 1)
          
          const { protocol, expiry } = Store.get( sid )

          if( Date.now() >= (expiry as number) ){
            // Token expired: Generate new keys: privKey, pubKey
            if( !protocol.generateKeys( true ) ){
              debug('E3Proto', 'Refresh End-To-End Connection Token Failed \t[CID]: '+ sid )
              return false
            }
            
            debug('E3Proto', Info('END-TO-END Encryption Token refreshed') )
            
            const toStore: ParserStoreSet = {
              protocol,
              token: packet.token = protocol.getPubKey(), // Get public Key as token to be send to client
              expiry: Date.now() + ( 90 * 1000 ) // Set next token expiry time
            }
            // Update socket store
            Store.set( toStore, sid )
            
            // Create response with current keys 
            packet.data = protocol.encrypt( packet.data )
            // Then adopt new keys
            protocol.adoptKey( toStore.token )
          }
          else packet.data = protocol.encrypt( packet.data )
        }

        return [ JSON.stringify( packet ) ]
      }
    }
  }

  class Decoder extends Emitter {
    
    /** Receive a chunk (string or buffer) and optionally emit a 
     * "decoded" event with the reconstructed packet 
     */
    add( chunk: string ){
      // Non-Encrypted packet
      let packet = JSON.parse( chunk )
      const sid = packet.data && packet.data.sid || packet.sid
      
      // New client connection
      if( type == 'client'
          && meta 
          && packet.type === 0 ){
        // Initialize End-to-End Encryption protocol
        const protocol = new E3Proto({ sid, ...meta })
        // Update socket store
        Store.set({ protocol, token: packet.token })
        
        if( !protocol.adoptKey( packet.token ) )
          throw new Error('Unauthorized End-To-End Connection \t[CID]: '+ sid )
        
        // Initialize encrypted commnunication interfaces
        debug('E3Proto', Info('END-TO-END Encryption Initialized') )
      }
      
      // Decrypt packet: E2E protocol mode
      if( packet && typeof packet.data == 'string' ){
        const { protocol } = Store.get( sid )

        packet.data = protocol.decrypt( packet.data )
        if( !packet ) return

        // Token got refreshed: Client only adopt it
        if( type == 'client' && packet.token ){
          Store.set({ protocol, token: packet.token })
          
          if( !protocol.adoptKey( packet.token ) )
            throw new Error('Unauthorized End-To-End Connection \t[CID]: '+ sid )
          
          debug('E3Proto', Info('New END-TO-END Encryption Adopted') )
        }
      }
      
      if( !this.isPacketValid( packet ) )
        throw new Error('invalid format')

      this.emit( 'decoded', packet )
    }
    
    isPacketValid({ type, data, nsp, id }: any ){
      const 
      isNamespaceValid = typeof nsp === 'string',
      isAckIdValid = id === undefined || Number.isInteger( id )

      if( !isNamespaceValid || !isAckIdValid ) return false

      switch( type ){
        case 0: return data === undefined || typeof data === 'object' // CONNECT
        case 1: return data === undefined // DISCONNECT
        case 2: return Array.isArray( data ) && data.length > 0 // EVENT
        case 3: return Array.isArray( data ) // ACK
        case 4: return typeof data === 'object' // CONNECT_ERROR
        default: return false
      }
    }
    
    // Clean up internal buffers
    destroy(){}
  }

  return { Encoder, Decoder }
},
DefaultFirewall: E3.Firewall = ( socket, error, allow ) => {
  // Verify New socket connection Agent's Integrity

  // No cookie are supported
  if( socket.request.headers.cookie ){
    debug('E3Proto', 'NSR::SET_COOCKIE => Unauthorized Defined Cookies')
    return error('ON-Connect: Unauthorized Defined Cookies')
  }

  /*
    headers: // the headers sent as part of the handshake *
    time: // the date of creation (as string) *
    address: // the ip of the client
    xdomain: // whether the connection is cross-domain
    secure: // whether the connection is secure
    issued: // the date of creation (as unix timestamp)
    url: // the request URL string
    query: // the query object
  */
  const
  headers = socket.handshake.headers,
  ip = socket.handshake.address,
  cors = socket.handshake.xdomain,
  isSecure = socket.handshake.secure,
  issuedTime = socket.handshake.issued

  // Must be a secure ONs connection domain
  // if( !isSecure )
  //   return debug( 'connect', 'Peer Rejected::Insecure Connection <Protocol>' )

  // Must be a cross-domain connection
  // if( !cors )
  //   return debug( 'connect', 'Peer Rejected::Unauthorised Connection <Domain>' )

  if( !headers['on-peer-id'] )
    return debug('E3Proto', 'Peer Rejected::Unauthorised Connection <CID> is undefined')

  /* Custom headers
    - on-peer-* (type, role, id)
    - on-time-* (current, utc, duration)

  */
  // Only known "user-agent" are allowed
  if( !headers['on-peer-type']
      || !ENTITIES.includes( headers['on-peer-type'] as string ) )
    return debug('E3Proto', 'Peer Rejected::Unknown Peer Agent <Type>')

  // Moment of "issued" conection, "time"
  debug('E3Proto', Info('Socket Connection Issued') +' at '+ Date().split('(')[0] )

  allow()
}

const SOCKETS: { [index: string]: E3.PSocket } = {}

export const Server = ( session?: E3.PServerOptions ) => {
  // Create new socket server
  const 
  port = Number( process.env.PORT
          || Config.get('port')
          || new URL( toHTTP( process.env.HOST || Config.get('uri') ) ).port
          || DEFAULT_PORT ), // default port
  parserStore = {
    get: ( sid?: string ): ParserStoreSet => {
      return SOCKETS[ sid as string ]?.data.ParserStore 
    },
    set: ( toStore: ParserStoreSet, sid?: string ): void => {
      if( !SOCKETS[ sid as string ] ) return
      SOCKETS[ sid as string ].data.ParserStore = toStore 
    }
  },
  configs = session ? 
              { ...IO_CONNECTION_CONFIG, parser: Parser( 'server', { session }, parserStore ) } 
              : IO_CONNECTION_CONFIG,
  server = new ioServer.Server( port, configs ) as E3.PServer

  server.registerSocket = ( socket: E3.PSocket ) => {
    const emit = socket.emit
    socket.emit = ( _event, ...args ) => {
      args.unshift( socket.id )
      emit.bind( socket )( _event, ...args )
      return true
    }
    socket.conn.on('packet', ( packet ) => {
      if( packet.type !== 'message' ) return
      packet.data = packet.data.replace(/\}$/, `,"sid":"${socket.id}"}`)
    })
    SOCKETS[ socket.id ] = socket
  }
  server.unregisterSocket = ( socket: E3.PSocket ) => delete SOCKETS[ socket.id ]
  server.nsp = ( nsp: string, firewall?: E3.Firewall ): Namespace => {
    return server
    .of(`/${nsp}`)
    .use( ( socket, next ) => {
      
      function register(){
        // Register for E2E parser
        server.registerSocket( socket )
        socket.on('disconnect', () => server.registerSocket( socket ) )

        next()
      }
      
      // Put on a firewall
      (typeof firewall === 'function' ? firewall : DefaultFirewall)( socket, ( error: string ) => next( new Error(`ON: ${error}`) ), register )
    } )
  }

  // No socket connection allow to the mainspace
  server.use( socket => socket.disconnect() )

  return server
}

export const Client = ({ session, host, namespace, accessToken }: E3.PClientOptions ) => {

  if( !host || !session )
    throw new Error('Undefined Peering Settings: Expect <host>, <session>, <namespace>')

  /* Internal guest dependency exculsive socket connection
    Here only the connection URI is set as argument
  */
  let uri, query
  if( !namespace ) uri = toHTTP( host )
  else {
    let [ main, params ] = host.split('?')
    if( params ) query = Params2Obj( params )

    uri = toHTTP( host )+'/'+ namespace
  }

  const
  parserStore = {
    get: (): ParserStoreSet => { return socket.ParserStore },
    set: ( toStore: ParserStoreSet ): void => { socket.ParserStore = toStore }
  },
  options: any = {
    query,
    transportOptions: {
      polling: {
        extraHeaders: {
          'ON-Peer-Type': Config.get('type'),
          'ON-Peer-Role': Config.get('role') || 'None',
          'ON-Peer-ID': Config.get('cid'),
          'ON-Peer-Protocol': 'E3Proto/TCP/IP',
          'ON-Time-Current': Date.now()
        }
      }
    },
    parser: Parser( 'client', { session }, parserStore )
  }
  
  // Strict auth access
  if( accessToken ) options.auth = { accessToken }
  // Initiate connection
  const 
  socket: E3.PClient = ioClient( uri, options ),
  emit = socket.emit
  
  socket.emit = ( _event: string, ...args: any[] ) => {
    args.unshift( socket.id )
    emit.bind( socket )( _event, ...args )
    
    return true
  }
  socket.io.engine.on('packet', ( packet: any ) => {
    if( packet.type !== 'message' ) return
    packet.data = packet.data.replace(/\}$/, `,"sid":"${socket.id}"}`)
  })
  
  return socket
}

