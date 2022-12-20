import { Log, LogLevel } from "../utils/log";

export enum EventCode{
    MouseWheel,
    MouseMove,
    MouseUp,
    MouseDown,

    KeyUp,
    KeyDown,
    KeyPress,
    KeyReset,

   
    RelativeMouseOff,
    RelativeMouseOn,
}

export enum ShortcutCode{
    Fullscreen,
    PointerLock
}
export enum KeyCode{
    Shift = 0,
    Alt,
    Ctrl,

    F = "KeyF",
    P = "KeyP",
}




export class Shortcut {
    code : ShortcutCode
    keys : Array<KeyCode>
    Handler: ((a: void) => (void))


    constructor(code: ShortcutCode,
                keys : Array<KeyCode>,
                Handler: ((a: void) => (void))){
        this.code = code;
        this.keys = keys;
        this.Handler = Handler;
    }

    public HandleShortcut(event : KeyboardEvent) : Boolean {
        var shift = this.keys.includes(KeyCode.Shift) === event.shiftKey;
        var alt   = this.keys.includes(KeyCode.Alt)   === event.altKey;
        var ctrl  = this.keys.includes(KeyCode.Ctrl)  === event.ctrlKey;

        var key = false;
        this.keys.forEach(element => {
            if(element === event.code) {
                key = true; 
            }
        });

        if (shift && alt && ctrl && key) {
            event.preventDefault();
            Log(LogLevel.Infor,`shortcut fired with code ${this.code}`)
            this.Handler();
            return true;
        }
        return false;
    }
}



export class HIDMsg {
    code: EventCode
    data: Map<string,string>
    constructor(code: EventCode, data: any)
    {
        this.code = code;
        this.data = new Map<string,string>();
        Object.keys(data).forEach(function(key) {
            this.data.set(key,data[key]);
        }.bind(this));
    }

    public ToString()
    {
        let data = {};
        this.data.forEach((value: string, key: string) => {
            data[key] = value;
        })
        return JSON.stringify({
            code : this.code,
            data: data,
        })

    }
}


