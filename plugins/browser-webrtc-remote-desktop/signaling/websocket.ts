import { UserRequest, UserResponse } from "../models/signaling.model";
import { ConnectionEvent, Log, LogConnectionEvent, LogLevel } from "../utils/log";


export class SignallingClient
{
    WebSocketConnection: WebSocket;
    PacketHandler : ((Data : Map<string,string>) => (void));


    constructor (url : string,
                 token : string,
                 PacketHandler : ((Data : Map<string,string>) => (void)))
    {
        this.PacketHandler = PacketHandler;
        LogConnectionEvent(ConnectionEvent.WebSocketConnecting)
        this.WebSocketConnection = new WebSocket(`${url}?token=${token}`);
        this.WebSocketConnection.onopen     = ((eve : Event) => { 
            this.onServerOpen(eve)
        });
    }

    /**
     * Fired whenever the signalling websocket is opened.
     * Sends the peer id to the signalling server.
     */
    private onServerOpen(event : Event)
    {
        LogConnectionEvent(ConnectionEvent.WebSocketConnected)
        this.WebSocketConnection.onerror    = ((eve : Event) => { 
            Log(LogLevel.Error,`websocket connection error : ${eve.type}`)
            this.onServerError()
        });
        this.WebSocketConnection.onmessage  = ((eve : MessageEvent) => { 
            this.onServerMessage(eve)
        });

        this.WebSocketConnection.onclose    = ((eve : Event) => { 
            Log(LogLevel.Error,`websocket connection closed : ${eve.type}`)
            this.onServerError()
        });
    }
    /**
     * send messsage to signalling server
     * @param {string} request_type 
     * @param {any} content 
     */
    public SignallingSend(Target : string, 
                          Data: Map<string,string>)
    {
        var dat =  new UserRequest(0,
                Target,
                new Map<string,string>(),
                Data).toString();
        Log(LogLevel.Debug,`sending message : ${dat}`);
        this.WebSocketConnection.send(dat);
    }

    /**
     * Fired whenever the signalling websocket emits and error.
     * Reconnects after 3 seconds.
     */
    private onServerError() 
    {
        Log(LogLevel.Warning,"websocket connection disconnected");
        LogConnectionEvent(ConnectionEvent.WebSocketDisconnected)
    }


    /**
     * handle message from signalling server during connection handshake
     * @param {Event} event 
     * @returns 
     */
    private onServerMessage(event : any) 
    {

        var msg = JSON.parse(event.data);
        var response = new UserResponse(msg.id,
                                        msg.error,
                                        msg.data);

        Log(LogLevel.Debug,`received signaling message: ${response.toString()}`);
        this.PacketHandler(response.Data);
    }
}



