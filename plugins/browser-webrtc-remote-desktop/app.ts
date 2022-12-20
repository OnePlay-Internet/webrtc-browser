import { DataChannel } from "./datachannel/datachannel";
import { HID } from "./gui/hid";
import { AddNotifier, ConnectionEvent, Log, LogConnectionEvent, LogLevel } from "./utils/log";
import { DeviceSelection, DeviceSelectionResult } from "./models/devices.model";
import { WebRTC } from "./webrtc";
import { SignallingClient } from "./signaling/websocket";



export class WebRTCClient  {
    video : any
    audio : any

    webrtc : WebRTC
    hid : HID
    signaling : SignallingClient
    datachannels : Map<string,DataChannel>;
    
    DeviceSelection: (input: DeviceSelection) => Promise<DeviceSelectionResult>;
    alert : (input: string) => (void);

    started : boolean

    constructor(signalingURL : string,
                vid : any,
                audio: any,
                token : string,
                DeviceSelection : (n: DeviceSelection) => Promise<DeviceSelectionResult>) {

        Log(LogLevel.Infor,`Started oneplay app connect to signaling server ${signalingURL}`);
        Log(LogLevel.Infor,`Session token: ${token}`);

        LogConnectionEvent(ConnectionEvent.ApplicationStarted)
        this.started = false;
        this.video = vid;
        this.audio = audio;
        

        this.DeviceSelection = DeviceSelection;

        this.datachannels = new Map<string,DataChannel>();
        this.hid = new HID(this.video,(data: string) => {
            let channel = this.datachannels.get("hid")
            if (channel == null) {
                Log(LogLevel.Warning,"attempting to send message while data channel is not established");
                return;
            }
            channel.sendMessage(data);
        });

        this.signaling = new SignallingClient(signalingURL,token,
                                 this.handleIncomingPacket.bind(this));

        this.webrtc = new WebRTC(this.signaling.SignallingSend.bind(this.signaling),
                                 this.handleIncomingTrack.bind(this),
                                 this.handleIncomingDataChannel.bind(this),
                                 this.handleWebRTCMetric.bind(this));
    }

    private handleIncomingTrack(evt: RTCTrackEvent): any
    {
        this.started = true;
        Log(LogLevel.Infor,`Incoming ${evt.track.kind} stream`);
        if (evt.track.kind == "audio")
        {
            if ( this.audio.current.srcObject !== evt.streams[0]) {
                LogConnectionEvent(ConnectionEvent.ReceivedAudioStream)
                this.audio.current.srcObject = evt.streams[0]
            }
        } else if (evt.track.kind == "video") {
            if ( this.video.current.srcObject !== evt.streams[0]) {
                LogConnectionEvent(ConnectionEvent.ReceivedVideoStream)
                this.video.current.srcObject = evt.streams[0]
            }
        }
    }

    private handleWebRTCMetric(a: string)
    {
        Log(LogLevel.Infor,`metric : ${a}`)

        const dcName = "adaptive";
        let channel = this.datachannels.get(dcName)
        if (channel == null) {
            Log(LogLevel.Warning,`attempting to send message while data channel ${dcName} is ready`);
            return;
        }

        channel.sendMessage(a);
    }

    private handleIncomingDataChannel(a: RTCDataChannelEvent)
    {
        LogConnectionEvent(ConnectionEvent.ReceivedDatachannel)
        Log(LogLevel.Infor,`incoming data channel: ${a.channel.label}`)
        if(!a.channel)
            return;

        this.datachannels.set(a.channel.label,new DataChannel(a.channel,(data) => {
            Log(LogLevel.Debug,`message from data channel ${a.channel.label}: ${data}`);
        }));
    }

    private async handleIncomingPacket(pkt : Map<string,string>)
    {
        var target = pkt.get("Target");
        if(target == "SDP") {
            var sdp = pkt.get("SDP")
            if(sdp === undefined) {
                Log(LogLevel.Error,"missing sdp");
                return;
            }
            var type = pkt.get("Type")
            if(type == undefined) {
                Log(LogLevel.Error,"missing sdp type");
                return;
            }

            this.webrtc.onIncomingSDP({
                sdp: sdp,
                type: (type == "offer") ? "offer" : "answer"
            })
        } else if (target == "ICE") {
            var sdpmid = pkt.get("SDPMid")
            if(sdpmid == undefined) {
                Log(LogLevel.Error,"Missing sdp mid field");
            }
            var lineidx = pkt.get("SDPMLineIndex")
            if(lineidx === undefined) {
                Log(LogLevel.Error,"Missing sdp line index field");
                return;
            }
            var can = pkt.get("Candidate")
            if(can == undefined) {
                Log(LogLevel.Error,"Missing sdp candidate field");
                return;
            }

            this.webrtc.onIncomingICE({
                candidate: can,
                sdpMid: sdpmid,
                sdpMLineIndex: Number.parseInt(lineidx)
            })
        } else if (target == "PREFLIGHT") { //TODO
            let preverro = pkt.get("Error") 
            if (preverro != null) {
                Log(LogLevel.Error,preverro);
                this.alert(preverro)
            }

            let webrtcConf = pkt.get("WebRTCConfig") 
            if (webrtcConf != null) {
                let config = JSON.parse(webrtcConf)
                this.webrtc.SetupConnection(config)
            }
            

            let i = new DeviceSelection(pkt.get("Devices"));
            let result = await this.DeviceSelection(i);
            var dat = new Map<string,string>();
            dat.set("type","answer");
            dat.set("monitor",result.MonitorHandle)
            dat.set("soundcard",result.SoundcardDeviceID)
            this.signaling.SignallingSend("PREFLIGHT",dat)
        } else if (target == "START") {
            var dat = new Map<string,string>();
            this.signaling.SignallingSend("START",dat)
        }
    }

    Notifier(notifier: (message :string) => (void)): WebRTCClient{
        AddNotifier(notifier);
        return this
    }
    Alert(notifier: (message :string) => (void)): WebRTCClient{
        this.alert = notifier;
        return this
    }
    public ChangeFramerate (framerate : number) {
        const dcName = "manual";
        let channel = this.datachannels.get(dcName)
        if (channel == null) {
            Log(LogLevel.Warning,`attempting to send message while data channel ${dcName} is ready`);
            return;
        }

        channel.sendMessage(JSON.stringify({
            type: "framerate",
            framerate: framerate
        }))

    }
    public ChangeBitrate (bitrate: number) {
        const dcName = "manual";
        let channel = this.datachannels.get(dcName)
        if (channel == null) {
            Log(LogLevel.Warning,`attempting to send message while data channel ${dcName} is ready`);
            return;
        }

        channel.sendMessage(JSON.stringify({
            type: "bitrate",
            bitrate: bitrate
        }))
    }
}