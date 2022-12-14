import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import { AskSelectBitrate, AskSelectDisplay, AskSelectFramerate, AskSelectSoundcard, TurnOnAlert, TurnOnStatus} from "../components/popup";
import { WebRTCClient } from "../webrtc/app";
import { useRouter } from "next/router";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import {
  List,
  VolumeOff,
  VolumeUp,
  Fullscreen,
  FullscreenExit,
  ArrowBackIos,
} from "@mui/icons-material";
import Draggable from "react-draggable";
import { DeviceSelection, DeviceSelectionResult, Soundcard } from "../webrtc/models/devices.model";
import { ConnectionEvent, Log, LogConnectionEvent, LogLevel } from "../webrtc/utils/log";
import { GetServerSideProps, NextPage } from "next";
import { stepButtonClasses } from "@mui/material";
import { frame } from "websocket";


type Props = { host: string | null };

export const getServerSideProps: GetServerSideProps<Props> =
  async context => ({ props: { host: context.req.headers.host || null } });




const Home = ({ host }) => {
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  let router = useRouter();

  const [volumeButton, setVolumeButton] = useState<JSX.Element>();
  const [actions, setActions] = useState<{
    icon: JSX.Element;
    name: string;
    action: () => void;
  }[] >([]);





  useEffect(() => {
    if (remoteVideo.current) {
      let signalingURL = (host.split(":")[0] != "localhost" )? `wss://${host}/handshake` : "wss://remote.thinkmay.net/handshake";
      let token = router.asPath?.split("?")[1]?.split("=")[1] ?? "";
      if (token == "") {
        window.location.replace("https://service.thinkmay.net/dashboard");
      }

      var defaultSoundcard = "Default Audio Render Device";
      var defaultBitrate   = null;
      var defaultFramerate = 55;

      let client = new WebRTCClient(signalingURL,remoteVideo, remoteAudio, token, (async (offer: DeviceSelection) => {
          LogConnectionEvent(ConnectionEvent.WaitingAvailableDeviceSelection)

          let ret = new DeviceSelectionResult(offer.soundcards[0].DeviceID,offer.monitors[0].MonitorHandle.toString());
          if(offer.soundcards.length > 1) {

            let exist = false;
            if (defaultSoundcard != null) {
              offer.soundcards.forEach(x => {
                if (x.Name == defaultSoundcard) {
                  exist = true;
                  ret.SoundcardDeviceID = x.DeviceID;
                  defaultSoundcard = null;
                }
              })
            }

            if (!exist) {
              ret.SoundcardDeviceID = await AskSelectSoundcard(offer.soundcards)
              Log(LogLevel.Infor,`selected audio deviceid ${ret.SoundcardDeviceID}`)
            }
          }           

          if(offer.monitors.length > 1) {
            ret.MonitorHandle = await AskSelectDisplay(offer.monitors)
            Log(LogLevel.Infor,`selected monitor handle ${ret.MonitorHandle}`)
          }

          if (defaultBitrate == null) {
            ret.bitrate= await AskSelectBitrate();
          } else {
            ret.bitrate = defaultBitrate;
          }
          if (defaultFramerate == null) {
            ret.framerate = await AskSelectFramerate();
          } else {
            ret.framerate = defaultFramerate;
          }

          return ret;
      })).Notifier(message => {
        console.log(message);
        TurnOnStatus(message);
      }).Alert(message => {
        TurnOnAlert(message);
      });  

      const actions = [ {
        icon: <Fullscreen/>,
        name: "Framerate",
        action: async () => {
          let framerate = await AskSelectFramerate();
          if (client != null && framerate > 10 && framerate < 61) {
            console.log(`framerate is change to ${framerate}`)
            client.ChangeFramerate(framerate)
          } 
        }, }, {
        icon: <Fullscreen/>,
        name: "Bitrate",
        action: async () => {
          let bitrate = await AskSelectBitrate();
          if (client != null && bitrate > 100 && bitrate < 30000) {
            console.log(`bitrate is change to ${bitrate}`)
            client.ChangeBitrate(bitrate);
          }
        }, }, {
        icon: <VolumeUp/>,
        name: "Mute",
        action: async () => {
          if (remoteAudio.current.muted) {
            remoteAudio.current.muted = false;
          } else {
            remoteAudio.current.muted = true;
          }
        }, }, {
        icon: <Fullscreen/>,
        name: "Lock Pointer",
        action: async () => {
          client.VideoPointerLock();
        }, }, {
        icon: <Fullscreen />,
        name: "Enter fullscreen",
        action: async () => {
          document.documentElement.requestFullscreen();
        }, 
      }, ];

      setActions([...actions]);

    }
  }, []);

  return (
    <div>
      <Head>
        <title>WebRTC remote viewer</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.app}>
        <Draggable>
          <SpeedDial
            ariaLabel="SpeedDial basic example"
            sx={{ position: "absolute", bottom: 16, right: 16 }}
            icon={<List />}
          >
            {actions.map((action) => (
              <SpeedDialAction
                key={action.name}
                icon={action.icon}
                tooltipTitle={action.name}
                onClick={action.action}
              />
            ))}
          </SpeedDial>
        </Draggable>
      </div>
      <video ref={remoteVideo} className={styles.remoteVideo} autoPlay muted playsInline loop ></video>
      <audio ref={remoteAudio} autoPlay controls style={{ zIndex: -1 }}></audio>
    </div>
  );
};

export default Home;
