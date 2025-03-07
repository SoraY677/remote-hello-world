"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { nowInSec, SkyWayAuthToken, uuidV4 } from "@skyway-sdk/token";
import {
  LocalAudioStream,
  LocalVideoStream,
  SkyWayStreamFactory,
} from "@skyway-sdk/room";

const MainContent = () => {
  const appId = useMemo(() => process.env.NEXT_PUBLIC_SKYWAY_APP_ID, []);
  const secretKey = useMemo(
    () => process.env.NEXT_PUBLIC_SKYWAY_SECRET_KEY,
    []
  );

  const localVideo = useRef<HTMLVideoElement>(null);

  const token = useMemo(() => {
    if (appId == null || secretKey == null) return undefined;

    return new SkyWayAuthToken({
      jti: uuidV4(),
      iat: nowInSec(),
      exp: nowInSec() + 60 * 60 * 24,
      scope: {
        app: {
          id: appId,
          turn: true,
          actions: ["read"],
          channels: [
            {
              id: "*",
              name: "*",
              actions: ["write"],
              members: [
                {
                  id: "*",
                  name: "*",
                  actions: ["write"],
                  publication: {
                    actions: ["write"],
                  },
                  subscription: {
                    actions: ["write"],
                  },
                },
              ],
              sfuBots: [
                {
                  actions: ["write"],
                  forwardings: [
                    {
                      actions: ["write"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    }).encode(secretKey);
  }, [appId, secretKey]);

  // ローカスストリームをここに保持する
  const [localStream, setLocalStream] = useState<{
    audio: LocalAudioStream;
    video: LocalVideoStream;
  }>();

  // tokenとvideo要素の参照ができたら実行
  useEffect(() => {
    const initialize = async () => {
      if (token == null || localVideo.current == null) return;
      const stream =
        await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
      stream.video.attach(localVideo.current);
      await localVideo.current.play();
      setLocalStream(stream);
    };

    initialize();
  }, [token, localVideo]);

  return (
    <div>
      <p>ID: </p>
      <div>
        room name:
        <input type="text" />
        <button>join</button>
      </div>
      <video ref={localVideo} width="400px" muted playsInline></video>
      <div>{/* TODO ここに他の人のメディア */}</div>
    </div>
  );
};

export default MainContent;
