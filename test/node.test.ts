
import Omnis from '../src'

( async () => {
  try {
    const instance = await Omnis()
    
    console.log('Instance: ', instance )
  }
  catch( error ){ console.log('Failed to start Node: ', error ) }
} )()