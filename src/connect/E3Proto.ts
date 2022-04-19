
import { URL } from 'url'
import Emitter from 'component-emitter' // polyfill of Node.js EventEmitter in the browser
import CryptoJS from 'crypto-js'
import ioServer from 'socket.io'
import ioClient from 'socket.io-client'
import {
  toHTTP,
  Params2Obj
} from '../utils'
import {
  ENTITIES,
  DEFAULT_PORT,
  IO_CONNECTION_CONFIG
} from '../config/constants'
import { ClientConnection } from '../../types'

declare namespace E3 {
  type CipherParams = {
    mode?: 'CTR' | 'CBC' | 'CFB' | 'OFB'
    padding?: 'Pkcs7' | 'Iso97971' | 'AnsiX923' | 'Iso10126' | 'ZeroPadding' | 'NoPadding'
  }

  type Options = CipherParams & {
    sid: string
    session: string
  }

  type Meta = CipherParams & {
    session: string
    token?: string
  }
}

// End-2-End Encryption Protocol
class E3Proto {

  private pubKey = ''
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
    return this.pubKey && this.pubKey.toString()
  }

  getConfig(){
    /* Return encryption configuration:
    * Only the keys generator end could access this
    */
    return this.isGenerated ? this.cipherParams : null
  }

  generateKeys(){
    
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

      this.adoptKey( pubKey )
      return this.isGenerated = true
    }
    catch( error ){
      console.log( error )
      return this.isGenerated
    }
  }

  adoptKey( pubKey: string ){
    
    if( this.pubKey && this.pubKey !== pubKey ){
      this.debug('Unmatched Public Key')
      return false
    }

    try {
      this.cipherParams.iv = CryptoJS.SHA256( pubKey + this.options.session )
      this.pubKey = pubKey

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

function Info( text: string ){ return text }
function debug( error: string ){ console.log( error ) }

const Parser = ( type: string, meta: E3.Meta ) => {

  // Socket-Server
  if( !meta.session ){
    debug( Info('Unauthorize End-To-End Connection') )
    return {}
  }

  let 
  protocol: E3Proto,
  Token: string | unknown
  
  class Encoder {

    /** Encode a packet into a list of strings/buffers
     */
    encode( packet: any ){
      if( packet.type === 0 ){
        if( type == 'server' && !Token ){
          // Initialize End-to-End Encryption protocol
          protocol = new E3Proto({ sid: packet.data.sid, ...meta })
          
          // Generate keys: privKey, pubKey
          if( !protocol.generateKeys() ){
            debug( 'Unauthorized End-To-End Connection \t[CID]: '+ packet.data.sid )
            return false
          }

          // Initialize encrypted commnunication interfaces
          debug( Info('END-TO-END Encryption Initialized') )

          // Get public Key as token to be send to client
          Token = 
          packet.token = protocol.getPubKey()
        }
          
        return [ JSON.stringify( packet ) ]
      }
      else return [ protocol.encrypt( packet ) ]
    }
  }

  class Decoder extends Emitter {
    
    /** Receive a chunk (string or buffer) and optionally emit a 
     * "decoded" event with the reconstructed packet 
     */
    add( chunk: string ){
      let packet
      
      try {
        // Non-Encrypted packet
        packet = JSON.parse( chunk )
        
        if( type == 'client'
            && meta 
            && packet.type === 0
            && !Token ){
          // Initialize End-to-End Encryption protocol
          protocol = new E3Proto({ sid: packet.data.sid, ...meta })
          Token = packet.token

          // console.log( 'Client Token: ', Info( token ) )
          if( !protocol.adoptKey( packet.token ) )
            throw new Error('Unauthorized End-To-End Connection \t[CID]: '+ packet.data.sid )
          
          // Initialize encrypted commnunication interfaces
          debug( Info('END-TO-END Encryption Initialized') )
        }
      }
      // Decrypt packet: E2E protocol mode
      catch( error ){ 
        packet = protocol.decrypt( chunk )
        if( !packet ) return
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
}

export const Server = ( session?: string ) => {
  // Create new socket server
  const 
  port = Number( process.env.PORT
          || Config.get('port')
          || new URL( toHTTP( process.env.HOST || Config.get('uri') ) ).port
          || DEFAULT_PORT ), // default port
  configs = session ? { ...IO_CONNECTION_CONFIG, parser: Parser( 'server', { session } ) } : IO_CONNECTION_CONFIG,
  server = new ioServer.Server( port, configs )

  // Safe Agent middle check
  server
  .use( ( socket, next ) => {
    // Verify New socket connection Agent's Integrity

    // No cookie are supported
    if( socket.request.headers.cookie ){
      debug('NSR::SET_COOCKIE => Unauthorized Defined Cookies')
      return next( new Error( 'ON-Connect: Unauthorized Defined Cookies' ) )
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
      return debug('Peer Rejected::Unauthorised Connection <CID> is undefined')

    /* Custom headers
      - on-peer-* (type, role, id)
      - on-time-* (current, utc, duration)

    */
    // Only known "user-agent" are allowed
    if( !headers['on-peer-type']
        || !ENTITIES.includes( headers['on-peer-type'] as string ) )
      return debug('Peer Rejected::Unknown Peer Agent <Type>')

    // Moment of "issued" conection, "time"
    debug( Info('Socket Connection Issued') +' at '+ Date().split('(')[0] )

    next()
  })
  .on('disconnect', () => {
    
  })

  return server
}

export const Client = ( { host, channel }: ClientConnection, session?: string ) => {

  if( !host || !Config )
    throw new Error('Undefined Peering Settings')

  let uri, query

  /* Internal guest dependency exculsive socket connection
    Here only the connection URI is set as argument
  */
  if( !channel ) uri = toHTTP( host )
  else {
    let [ main, params ] = host.split('?')
    if( params ) query = Params2Obj( params )

    uri = toHTTP( host )+'/'+ channel
  }
  
  // Commissionned Client Connection options
  const options: any = {
    query,
    transportOptions: {
      polling: {
        extraHeaders: {
          'ON-Peer-Type': Config.get('type'),
          'ON-Peer-Role': Config.get('role') || 'None',
          'ON-Peer-ID': Config.get('cid'),
          'ON-Peer-Protocol': 'ON-TCP/IP',
          'ON-Time-Current': Date.now()
        }
      }
    }
  }

  if( session )
    options.parser = Parser( 'client', { session } )
    
  // Commnunication channels
  return ioClient( uri, options )
}