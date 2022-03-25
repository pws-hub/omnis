
import { Server, Client } from './../connect/E3Proto'
import '../config'

if( process.argv.includes('--server') ){

  const server = Server('test-session')

  server.on( 'connection', socket => {
    console.log('New client connection: ', socket.id )

    socket.on( 'SEND-TO-SERVER', pingTime => {
      const pongTime = Date.now()

      console.log(`PingDelay: ${pongTime - pingTime}ms`)
      server.emit('SEND-TO-CLIENT', pongTime )
    })
  })
}
else {
  const client = Client({ host: 'http://localhost:4400' }, 'test-session' )

  let testDuration = 2 // 10 seconds
  let pingTime: number

  client.on( 'connect', () => console.log('Client connected') )
  client.on( 'SEND-TO-CLIENT', pongTime => {

    if( testDuration <= 0 ) return

    const now = Date.now()
    console.log(`PongDelay: ${now - pongTime} - Delay: ${now - pingTime}ms`)
    
    // Another emit
    setTimeout( () => client.emit( 'SEND-TO-SERVER', pingTime = Date.now() ), 50 )
  })
  
  let stopTimer: any = setInterval( () => {
    if( testDuration == 0 ) 
      return clearInterval( stopTimer )

    testDuration--
  }, 1000 )

  // Start
  client.emit( 'SEND-TO-SERVER', pingTime = Date.now() )
}
