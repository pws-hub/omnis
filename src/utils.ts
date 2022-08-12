
export const ON = {
  SECURE_MODE: false,
  DEBUG_MODE: true
}

export const toSID = ( id: string ) => { return id.replace(/^\//,'').split('#')[0] }
export const toHTTP = ( domain: string ) => {
  const
  hproto = 'http'+( ON.SECURE_MODE ? 's' : '' )+'://',
  xproto = /^xcn:\/\/\//

  if( domain && xproto.test( domain ) ){

    const
    temp = domain.replace( xproto, hproto ),
    matches = temp.match(/;([a-z0-9/+-]+)\?dsk=([a-z0-9/+-]+)\&/i) || []
    
    if( matches.length == 3 )
      // Extract http url from xcn url
      try {
        return hproto + CryptoJS.AES.decrypt( matches[1], matches[2] )
                                    .toString( CryptoJS.enc.Utf8 )
                                    .replace(/::(.+)/, '')
      }
      catch( error ){
        console.log( 'error', 'Failed Generating HTTP URI: Error > '+ error )
        return domain
      }

    else return temp
  }
  else return ( !( new RegExp( '^'+ hproto ).test( domain ) ) ? hproto : '' )+ domain
}
export const toXCN = ( domain: string ) => {
  const
  hproto = new RegExp( '^http'+( ON.SECURE_MODE ? 's' : '' )+'://' ),
  xproto = 'xcn:///'
  return domain && hproto.test( domain ) ? domain.replace( hproto, xproto ) : xproto + domain
}
export const Obj2Params = ( obj: any, excludes?: any[] ) => {
  return Object.entries( obj )
                .map( ([ key, value ]) => {
                  if( !excludes || !excludes.includes( key ) )
                    return key +'='+ value
                }).join('&')
}
export const Params2Obj = ( str: string, excludes?: any[] ) => {

  let 
  obj: any = {},
  array = str.split('&')

  array.map( each => {
    let [ key, value ] = each.split('=')

    if( !excludes || !excludes.includes( key ) )
      obj[ key ] = value
  })

  return obj
}

export const Info = ( text: string ) => { return text }
export const debug = ( type: string, ...args: any[] ) => {
  // Output log mode
  let mode = 'log',
      title = ''

  if( !args || !args.length ){
    args = [ type ]
    type = ''
  }
  else if( !!args && [ 'log', 'info', 'table', 'error' ].includes( args[ args.length - 1 ] ) )
    mode = args.pop()

  switch( type ){
    case 'service': title = '[SERVICE] '; break
    // case 'error': title = '\n['+ Danger('ERROR') +'] '; break
    case 'oracle': title = '[ORACLE] '; break
    case 'connect': title = '[CONNECT] '; break
  }

  // Monitoring log
  // if( Omnis.DEBUG_MODE ) console.log( title, ...args )

  // Also update the log file
  args.unshift( title )
  console.log( args.join(' ') )
}