import { Log } from "./utils/log";
import { SignallingClient } from "./signaling/websocket.js";

export class WebRTC 
{
    Conn: RTCPeerConnection;

    private SignalingSendFunc : ((Target : string, Data : Map<string,string>) => (void))


    State: string;

    constructor(sendFunc : ((Target : string, Data : Map<string,string>) => (void)),
                TrackHandler : ((a : RTCTrackEvent) => (any)),
                channelHandler : ((a : RTCDataChannelEvent) => (any)))
    {
        this.State = "Not connected"
        this.SignalingSendFunc = sendFunc;
        var configuration = { 
        iceServers: 
            [{
                urls: "turn:workstation.thinkmay.net:3478",
                username: "oneplay",
                credential: "oneplay"
            }, 
            {
                urls: [
                    "stun:workstation.thinkmay.net:3478",
                    "stun:stun.l.google.com:19302"
                ]
            }]
        };

        this.Conn = new RTCPeerConnection(configuration);
        this.Conn.ondatachannel =  channelHandler;    
        this.Conn.ontrack =        TrackHandler;
        this.Conn.onicecandidate = ((ev: RTCPeerConnectionIceEvent) => { this.onICECandidates(ev) });
        this.Conn.onconnectionstatechange = ((ev: Event) => { this.onConnectionStateChange(ev) })
    }

    private onConnectionStateChange(eve: Event)
    {
        console.log(`state change to ${JSON.stringify(eve)}`)
        switch (eve.type) {
            case "connected":
                break;
            case "failed":
                Log("webrtc connection establish failed");
                break;
            case "closed":
                Log("webrtc connection establish failed");
                break;
            default:
                break;
        }
    }

    /**
     * 
     * @param {*} ice 
     */
    public async onIncomingICE(ice : RTCIceCandidateInit) {
        var candidate = new RTCIceCandidate(ice);
        try{
            await this.Conn.addIceCandidate(candidate)
        } catch(error)  {
            Log(error);
        };
    }
    
    
    /**
     * Handles incoming SDP from signalling server.
     * Sets the remote description on the peer connection,
     * creates an answer with a local description and sends that to the peer.
     *
     * @param {RTCSessionDescriptionInit} sdp
     */
    public async onIncomingSDP(sdp : RTCSessionDescriptionInit) 
    {
        if (sdp.type != "offer")
            return;
    
        this.State = "Got SDP offer";        
    
        try{
            var Conn = this.Conn;
            Log(sdp.sdp);
            await Conn.setRemoteDescription(sdp)
            var ans = await Conn.createAnswer()
            await this.onLocalDescription(ans);
        } catch(error) {
            Log(error);
        };
    }
    
    
    /**
     * Handles local description creation from createAnswer.
     *
     * @param {RTCSessionDescriptionInit} local_sdp
     */
    private async onLocalDescription(desc : RTCSessionDescriptionInit) {
        var Conn = this.Conn;
        await this.Conn.setLocalDescription(desc)

        if (!Conn.localDescription)
            return;

        var init = Conn.localDescription;

        var dat = new Map<string,string>();
        dat.set("Type",init.type)
        dat.set("SDP",init.sdp)
        Log(init.sdp);
        this.SignalingSendFunc("SDP",dat);
    }
    
    
    
    private onICECandidates(event : RTCPeerConnectionIceEvent)
    {
        if (event.candidate == null) 
        {
            console.log("ICE Candidate was null, done");
            return;
        }

        var init = event.candidate.toJSON()

    
        var dat = new Map<string,string>();
        if (init.candidate) 
            dat.set("Candidate",init.candidate)
        if (init.sdpMid) 
            dat.set("SDPMid",init.sdpMid)
        if (init.sdpMLineIndex) 
            dat.set("SDPMLineIndex",init.sdpMLineIndex.toString())
        this.SignalingSendFunc("ICE",dat);
    }
}



