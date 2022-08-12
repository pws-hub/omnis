// import '../types/global.d'
// import { readFile } from 'fs-extra'
// import CommandLine from './bin/cli'
// import Connector from './bin/connect'
import { DOTOMNIS_FILE_PATH } from './config/constants'
import Core from './bin/Core'
import { OmnisConfig } from '../types'

export default async ( config?: OmnisConfig ) => {

  const processArgs = process.argv.slice(2)
  let starter

  // // Run XCN Peer Command Line Interface directly
  // if( processArgs.includes('--cli') )
  //   starter = 'cli'

  // // Choose the adequate mode to run: code / cli
  // else try {
  //   /* Check whether the .xcn file or containing config is set:
  //   * otherwise, go CLI mode
  //   */
  //   const dotxcn = JSON.parse( await readFile( DOTXCN_FILE_PATH, { encoding: 'utf-8' } ) )
  //   starter = !dotxcn.entity || !dotomnis.name ? 'cli' : 'code'
  // }
  // catch( error ){ starter = 'cli' }

  global.Omnis = new Core()

  // Run whatever is upcoming offline
  Omnis.STRICTLY_OFFLINE = processArgs.includes('--offline')

  if( starter == 'cli' ){
    // CommandLine()
    return
  }
  else return await Omnis.init( config )
}