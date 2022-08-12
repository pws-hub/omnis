
import { Server, Client } from '../src/connect/E3Proto'
import '../src/config'

if( process.argv.includes('--server') ){

  const server = Server('test-session')

  server
  .nsp('test')
  .on( 'connect', socket => {
    console.log('New client connection: ', socket.id )

    socket
    .on( 'SEND-TO-SERVER', ( pingTime: number ) => {
      const pongTime = Date.now()

      console.log(`PingDelay: ${pongTime - pingTime}ms`)
      socket.emit('SEND-TO-CLIENT', pongTime )
    })
    .on( 'STOP-SERVER', () => process.exit(0) )
  })

  console.log('Server listening')
}
else {
  const client = Client({ host: 'http://localhost:4400', namespace: 'test', session: 'test-session' })
  
  let testDuration = 2 // 10 seconds
  let pingTime: number

  client
  .on( 'connect', () => console.log('Client connected') )
  .on('connect_error', console.log )
  .on( 'SEND-TO-CLIENT', ( pongTime: number ) => {

    if( testDuration <= 0 ) return

    const now = Date.now()
    console.log(`PongDelay: ${now - pongTime} - Delay: ${now - pingTime}ms`)
    
    // Another emit
    setTimeout( () => client.emit( 'SEND-TO-SERVER', pingTime = Date.now() ), 50 )
  })
  
  let stopTimer: any = setInterval( () => {
    if( testDuration == 0 ){
      clearInterval( stopTimer )
      client.emit('STOP-SERVER')
      process.exit(0) // Stop client
    }

    testDuration--
  }, 1000 )

  // Start
  client.emit( 'SEND-TO-SERVER', pingTime = Date.now() )

  console.log('Client started')
}