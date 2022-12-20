


export class VideoMetrics {
    type : string
    constructor() {
        this.type = "video"
    }

    frameWidth : number
    frameHeight : number

    codecId : string
    decoderImplementation : string

    totalSquaredInterFrameDelay : number
    totalInterFrameDelay : number

    totalProcessingDelay : number
    totalDecodeTime : number
    
    keyFramesDecoded : number
    framesDecoded : number
    framesReceived : number
    
    headerBytesReceived : number
    bytesReceived : number
    packetsReceived : number
    
    framesDropped : number
    packetsLost : number

    jitterBufferEmittedCount : number
    jitterBufferDelay : number
    jitter : number

    timestamp : number
}


export class AudioMetrics {
    type : string
    constructor() {
        this.type = "audio"
    }

    audioLevel : number
    totalAudioEnergy : number

    totalSamplesReceived : number
    headerBytesReceived : number

    bytesReceived : number
    packetsReceived : number

    packetsLost : number

    timestamp : number
}

export class NetworkMetrics {
    type : string
    constructor() {
        this.type = "network"
    }

    packetsReceived : number
    packetsSent : number

    bytesSent : number
    bytesReceived : number

    availableIncomingBitrate : number
    availableOutgoingBitrate : number

    currentRoundTripTime : number
    totalRoundTripTime : number

    localIP : string
    localPort : number

    remoteIP : string
    remotePort : number

    priority : number

    timestamp : number
}




export class Adaptive {
    constructor(conn: RTCPeerConnection,
                metricCallback : (data : string) => void) {
        this.conn = conn;
        this.running = true;
        this.metricCallback = metricCallback;

        this.startCollectingStat(this.conn);
    }

    metricCallback : (data:string) => void;
    conn : RTCPeerConnection
    running : boolean


    filterNetwork(report : RTCStatsReport) : NetworkMetrics {
        let remoteCandidate = ""
        let localCandidate = ""
        let CandidatePair = ""

        report.forEach((value,key) => {
            if (value["type"] == "candidate-pair" &&
                value["state"] == "succeeded" &&
                value["writable"] == true) 
            {
                remoteCandidate = value["remoteCandidateId"];
                localCandidate = value["localCandidateId"];
                CandidatePair = key;
            }
        })

        if (CandidatePair == "") {
            return null;
        }



        let val = report.get(CandidatePair);

        let ret = new NetworkMetrics();

        ret.localIP = report.get(localCandidate)["ip"];
        ret.remoteIP = report.get(remoteCandidate)["ip"];

        ret.localPort = report.get(localCandidate)["port"];
        ret.remotePort = report.get(remoteCandidate)["port"];

        ret.packetsReceived  = val["packetsReceived"];
        ret.packetsSent  = val["packetsSent"];
        ret.bytesSent  = val["bytesSent"];
        ret.bytesReceived  = val["bytesReceived"];
        ret.availableIncomingBitrate  = val["availableIncomingBitrate"];
        ret.availableOutgoingBitrate  = val["availableOutgoingBitrate"];
        ret.currentRoundTripTime  = val["currentRoundTripTime"];
        ret.totalRoundTripTime  = val["totalRoundTripTime"];
        ret.priority  = val["priority"];
        ret.timestamp  = val["timestamp"];

        return ret;
    }



    filterVideo(report : RTCStatsReport) : VideoMetrics {

        let ret = null;
        report.forEach((val,key) => {
            if (val["type"] == "inbound-rtp" &&
                val["kind"] == "video") 
            {
                ret = new VideoMetrics();
                ret.frameWidth = val["frameWidth"];
                ret.frameHeight = val["frameHeight"];
                ret.codecId = val["codecId"];
                ret.decoderImplementation = val["decoderImplementation"];
                ret.totalSquaredInterFrameDelay = val["totalSquaredInterFrameDelay"];
                ret.totalInterFrameDelay = val["totalInterFrameDelay"];
                ret.totalProcessingDelay = val["totalProcessingDelay"];
                ret.totalDecodeTime = val["totalDecodeTime"];
                ret.keyFramesDecoded = val["keyFramesDecoded"];
                ret.framesDecoded = val["framesDecoded"];
                ret.framesReceived = val["framesReceived"];
                ret.headerBytesReceived = val["headerBytesReceived"];
                ret.bytesReceived = val["bytesReceived"];
                ret.packetsReceived = val["packetsReceived"];
                ret.framesDropped = val["framesDropped"];
                ret.packetsLost = val["packetsLost"];
                ret.jitterBufferEmittedCount = val["jitterBufferEmittedCount"];
                ret.jitterBufferDelay = val["jitterBufferDelay"];
                ret.jitter = val["jitter"];
                ret.timestamp = val["timestamp"];
            }
        });

        return ret;
    }

    filterAudio(report : RTCStatsReport) : AudioMetrics {

        let ret = null;
        report.forEach((val,key) => {
            if (val["type"] == "inbound-rtp" &&
                val["kind"] == "audio") 
            {
                ret = new AudioMetrics();
                ret.totalAudioEnergy = val["totalAudioEnergy"]
                ret.totalSamplesReceived = val["totalSamplesReceived"]
                ret.headerBytesReceived = val["headerBytesReceived"]
                ret.bytesReceived = val["bytesReceived"]
                ret.packetsReceived = val["packetsReceived"]
                ret.packetsLost = val["packetsLost"]
                ret.timestamp = val["timestamp"]
            }
        });

        return ret;
    }




    async getConnectionStats(conn : RTCPeerConnection) 
    {
        let result = await conn.getStats()

        let network = this.filterNetwork(result);
        if (network != null) { 
            this.metricCallback(JSON.stringify(network));
        }

        let audio   = this.filterAudio(result);
        if (audio != null) { 
            this.metricCallback(JSON.stringify(audio));
        }

        let video   = this.filterVideo(result);
        if (video != null) { 
            this.metricCallback(JSON.stringify(video));
        }
    }

    /**
     * 
     */
    startCollectingStat(conn: RTCPeerConnection)
    {
        var statsLoop = async () => {        
            await this.getConnectionStats(conn);
            setTimeout(statsLoop, 1000);
        };

        statsLoop();
    }
}


