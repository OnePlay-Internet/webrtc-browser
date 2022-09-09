import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import { OneplayApp } from "../webrtc/app";
import { useRouter } from "next/router";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import {
  List,
  VolumeOff,
  VolumeUp,
  Fullscreen,
  FullscreenExit,
} from "@mui/icons-material";
import Draggable from "react-draggable";


function TurnOnAlert(error: string) : void {
  // @Mainak TODO: show Sweetalert notify user about the error,
  // user will turn off this alert manually
}

function TurnOffLoading() : void {
  // @Mainak TODO:
  // this function would be called by an event from OneplayApp
}



const Home = ({ signaling_url }: { signaling_url: string }) => {
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  let router = useRouter();

  const [actions, setActions] = useState<
    {
      icon: JSX.Element;
      name: string;
      action: () => void;
    }[]
  >([]);

  const actions1 = [
    {
      icon: <VolumeUp />,
      name: "Mute",
      action: () => {
        remoteAudio.current.muted = true;
        toggleAction(0, 1);
      },
    },
    {
      icon: <Fullscreen />,
      name: "Enter fullscreen",
      action: () => {
        document.documentElement.requestFullscreen();
        toggleAction(1, 1);
      },
    },
  ];

  const actions2 = [
    {
      icon: <VolumeOff />,
      name: "Unmute",
      action: () => {
        remoteAudio.current.muted = false;
        toggleAction(0, 2);
      },
    },
    {
      icon: <FullscreenExit />,
      name: "exit fullscreen",
      action: () => {
        document.exitFullscreen();
        toggleAction(1, 2);
      },
    },
  ];

  const toggleAction = (index: number, action: 1 | 2) => {
    setActions((s) => {
      const newActions = [...s];
      newActions[index] =
        action === 1 ? { ...actions2[index] } : { ...actions1[index] };
      return newActions;
    });
  };

  useEffect(() => {
    setActions([...actions1]);
    if (remoteVideo.current) {
      let token: string;
      try {
        token = router.asPath;
        token = token.split("?")[1].split("=")[1];
        if (token == "") {
          throw new Error("no valid token");
        }
      } catch (error) {
        // ping token missing message
      }

      console.log(`Started oneplay app with token ${token}`);
      var app = new OneplayApp(remoteVideo, remoteAudio, token, () => {
        window.close();
      });
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
        <video
          ref={remoteVideo}
          className={styles.remoteVideo}
          autoPlay
          muted
          playsInline
          loop
        ></video>
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
      <audio ref={remoteAudio} autoPlay controls style={{ zIndex: -1 }}></audio>
    </div>
  );
};

export default Home;
