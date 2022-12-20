import { Log, LogLevel } from "../utils/log";
import { EventCode } from "../models/keys.model";
import { HIDMsg, KeyCode, Shortcut, ShortcutCode } from "../models/keys.model";





export class HID {
    private shortcuts: Array<Shortcut>
    private relativeMouse: boolean
    private Screen: {
        /*
        * frame resolution used to transport to client
        */
        StreamWidth: number,
        StreamHeight: number,


        /*
        * client resolution display on client screen
        */
        ClientWidth: number,
        ClientHeight: number,
        /*
        * client resolution display on client screen
        */
        ClientTop: number,
        ClientLeft: number,
    }

    private video: any 
    private SendFunc: ((data: string) => (void))
    constructor(videoElement: any, Sendfunc: ((data:string)=>(void))){
        this.relativeMouse = false;
        this.video = videoElement;
        this.SendFunc = Sendfunc;
        this.Screen = {
            StreamHeight: 0,
            StreamWidth: 0,
            ClientHeight: 0,
            ClientWidth: 0,
            ClientLeft: 0,
            ClientTop: 0,
        }


        var VideoElement : HTMLVideoElement;
        VideoElement = this.video.current;
        /**
         * video event
         */
        VideoElement.addEventListener('contextmenu',   ((event: Event) => {event.preventDefault()})); ///disable content menu key on remote control

        /**
         * mouse event
         */
        VideoElement.addEventListener('wheel',          this.mouseWheel.bind(this));
        VideoElement.addEventListener('mousemove',      this.mouseButtonMovement.bind(this));
        VideoElement.addEventListener('mousedown',      this.mouseButtonDown.bind(this));
        VideoElement.addEventListener('mouseup',        this.mouseButtonUp.bind(this));
        
        /**
         * keyboard event
         */
        window.addEventListener('keydown',        this.keydown.bind(this));
        window.addEventListener('keyup',          this.keyup.bind(this));

        /**
         * mouse lock event
         */
        VideoElement.addEventListener('mouseleave',     this.mouseLeaveEvent.bind(this));
        VideoElement.addEventListener('mouseenter',     this.mouseEnterEvent.bind(this));

        document.addEventListener('pointerlockchange',  this.pointerLock.bind(this));



        this.shortcuts = new Array<Shortcut>();
        this.shortcuts.push(new Shortcut(ShortcutCode.Fullscreen,[KeyCode.Ctrl,KeyCode.Shift,KeyCode.F],(()=> {
            this.video.current.parentElement.requestFullscreen();
        })))
        this.shortcuts.push(new Shortcut(ShortcutCode.PointerLock,[KeyCode.Ctrl,KeyCode.Shift,KeyCode.P],(()=> {
            if(!document.pointerLockElement) {
                this.relativeMouse = true;
                this.SendFunc((new HIDMsg(EventCode.RelativeMouseOn,{ }).ToString()))
                this.video.current.requestPointerLock();
            } else {
                this.relativeMouse = false;
                this.SendFunc((new HIDMsg(EventCode.RelativeMouseOff,{ }).ToString()))
                document.exitPointerLock();
            }
        })))
    }

    mouseEnterEvent(event: MouseEvent) {
        Log(LogLevel.Debug,"Mouse enter")
        this.SendFunc((new HIDMsg(EventCode.KeyReset,{ }).ToString()))
    }
    mouseLeaveEvent(event: MouseEvent) {
        Log(LogLevel.Debug,"Mouse leave")
        this.SendFunc((new HIDMsg(EventCode.KeyReset,{ }).ToString()))
    }
    pointerLock(event: Event) {
        Log(LogLevel.Infor,"toggle pointer lock")
    }
    keydown(event: KeyboardEvent) {
        event.preventDefault();

        let disable_send = false;
        this.shortcuts.forEach((element: Shortcut) => {
            let triggered = element.HandleShortcut(event);

            if (triggered) 
                disable_send = true;
        })

        if (disable_send) 
            return;


        let jsKey = event.key;
        let code = EventCode.KeyDown
        this.SendFunc((new HIDMsg(code,{
            key: jsKey,
        })).ToString());
    }
    keyup(event: KeyboardEvent) {
        let jsKey = event.key;
        let code = EventCode.KeyUp;
        this.SendFunc((new HIDMsg(code,{
            key: jsKey,
        })).ToString());
        event.preventDefault();
    }
    mouseWheel(event: WheelEvent){
        let wheelY = event.deltaY;
        let wheelX = event.deltaX;
        let code = EventCode.MouseWheel
        this.SendFunc((new HIDMsg(code,{
            deltaY: wheelY,
        })).ToString());
    }
    mouseButtonMovement(event: MouseEvent){
        this.elementConfig(this.video.current)
        let code = EventCode.MouseMove
        if (!this.relativeMouse) {
            let mousePosition_X = this.clientToServerX(event.clientX);
            let mousePosition_Y = this.clientToServerY(event.clientY);
            this.SendFunc((new HIDMsg(code,{
                dX: mousePosition_X,
                dY: mousePosition_Y,
            })).ToString());
        } else {
            this.SendFunc((new HIDMsg(code,{
                dX: event.movementX,
                dY: event.movementY,
            })).ToString());
        }
    }
    mouseButtonDown(event: MouseEvent){
        let code = EventCode.MouseDown
        this.SendFunc((new HIDMsg(code,{
            button: event.button
        })).ToString());
    }
    mouseButtonUp(event: MouseEvent){
        let code = EventCode.MouseUp
        this.SendFunc((new HIDMsg(code,{
            button: event.button
        })).ToString());
    }



    clientToServerY(clientY: number): number
    {
        return (clientY - this.Screen.ClientTop) / this.Screen.ClientHeight;
    }

    clientToServerX(clientX: number): number 
    {
        return (clientX - this.Screen.ClientLeft) / this.Screen.ClientWidth;
    }

    elementConfig(VideoElement: HTMLVideoElement) 
    {
        this.Screen.ClientWidth  =  VideoElement.offsetWidth;
        this.Screen.ClientHeight = VideoElement.offsetHeight;
        this.Screen.ClientTop    =  VideoElement.offsetTop;
        this.Screen.ClientLeft   = VideoElement.offsetLeft;
        this.Screen.StreamHeight =  VideoElement.videoHeight;
        this.Screen.StreamWidth  = VideoElement.videoWidth;
    }
}