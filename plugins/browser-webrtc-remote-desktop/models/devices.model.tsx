export class Soundcard {
    DeviceID: string 
    Name: string 	
	Api: string		

	IsDefault: boolean
	IsLoopback: boolean

    constructor (data: any) {
        this.DeviceID = data.id
        this.Name = data.name
	    this.Api = data.api
	    this.IsDefault = data.isDefault
	    this.IsLoopback = data.isLoopback
        return this
    }
}

export class Monitor {
    MonitorHandle: number
    MonitorName: string	
    DeviceName: string	
    Adapter: string 		
	Width: number 
	Height: number
	Framerate: number
	IsPrimary: boolean 

    constructor (data: any) {
        this.MonitorHandle = data.handle
        this.MonitorName = data.name
        this.DeviceName = data.device
        this.Adapter = data.adapter
	    this.Width = data.width
	    this.Height = data.height
	    this.Framerate = data.framerate
	    this.IsPrimary = data.isPrimary
        return this;
    }

}

export class DeviceSelection {
    monitors:   Array<Monitor>;
    soundcards: Array<Soundcard>;

    constructor (data: string) {
        this.monitors = new Array<Monitor>();
        this.soundcards = new Array<Soundcard>();
        let parseResult = JSON.parse(data)

        for(var i of parseResult["monitors"]) {
            this.monitors.push(new Monitor(i));
        }
        for(var i of parseResult["soundcards"]) {
            this.soundcards.push(new Soundcard(i));
        }
    }
}



export class DeviceSelectionResult {
    MonitorHandle: string
    SoundcardDeviceID: string

    constructor(soundcard: string,
                monitor: string){
        this.SoundcardDeviceID = soundcard 
        this.MonitorHandle = monitor
    }

    ToString(): string {
        return JSON.stringify({
            monitor: this.MonitorHandle,
            soundcard: this.SoundcardDeviceID,
        })
    }
}

