import type { Server, Socket, Namespace } from 'socket.io'
import type { Client } from 'socket.io/dist/client'
import type { ExtendedError } from 'socket.io/dist/namespace'

export declare namespace E3 {
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

  type PServer = Server & {
    nsp: ( name: string, firewall?: E3Firewall ) => Namespace
    registerSocket: ( socket: E3Socket ) => void
    unregisterSocket: ( socket: E3Socket ) => void
  }
  type PServerOptions = string

  type PClient = Client
  type PClientOptions = {
    host: string
    session: string
    namespace?: string
    accessToken?: string
  }

  type PSocket = Socket
  type Firewall = ( socket: E3Socket, bounce: ( error: string ) => void, allow: () => void ) => void
}