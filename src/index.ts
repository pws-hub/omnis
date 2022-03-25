
// import { readFileSync } from 'fs'
// import CommandLine from './bin/cli'
// import Connector from './bin/connect'
// import { DOTXCN_FILE_PATH } from './constants'
// import XCN from './bin/Core'

import './test'

// const processArgs = process.argv.slice(2)
// let starter

// // Run XCN Peer Command Line Interface directly
// if( processArgs.includes('--xcn-cli') )
//   starter = 'cli'

// // Choose the adequate mode to run: code / cli
// else try {
//   /* Check whether the .xcn file or containing config is set:
//   * otherwise, go CLI mode
//   */
//   const dotxcn = JSON.parse( readFileSync( DOTXCN_FILE_PATH ).toString('utf-8') )
//   starter = !dotxcn.config ? 'cli' : 'code'
// }
// catch( error ){ starter = 'cli' }

// // Run whatever is upcoming offline
// XCN.set( 'STRICTLY_OFFLINE', processArgs.includes('--xcn-offline') )

// if( starter == 'cli' ){
//   CommandLine()
//   module.exports = () => { return }
// }
// else module.exports = Connector