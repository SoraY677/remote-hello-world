"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nowInSec, SkyWayAuthToken, uuidV4 } from "@skyway-sdk/token";
import {
  LocalAudioStream,
  LocalP2PRoomMember,
  LocalStream,
  LocalVideoStream,
  RoomPublication,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
} from "@skyway-sdk/room";
import RemoteMedia from "./RemoteMedia";

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

  // ルーム名
  const [roomName, setRoomName] = useState("");
  // 自分自身の参加者情報
  const [me, setMe] = useState<LocalP2PRoomMember>();

  const canJoin = useMemo(() => {
    return roomName !== "" && localStream != null && me == null;
  }, [roomName, localStream, me]);

  const onJoinClick = useCallback(async () => {
    // canJoinまでにチェックされるので普通は起きない
    // assertionメソッドにしてもいい
    if (localStream == null || token == null) return;

    const context = await SkyWayContext.Create(token);

    // ルームを取得、または新規作成
    const room = await SkyWayRoom.FindOrCreate(context, {
      type: "p2p",
      name: roomName,
    });

    const me = await room.join();
    setMe(me);

    // 映像と音声を配信
    await me.publish(localStream.video);
    await me.publish(localStream.audio);

    // 自分以外の参加者情報を取得
    setOtherUserPublications(
      room.publications.filter((p) => p.publisher.id !== me.id)
    );

    // その後に参加してきた人の情報を取得
    room.onStreamPublished.add((e) => {
      if (e.publication.publisher.id !== me.id) {
        setOtherUserPublications((pre) => [...pre, e.publication]);
      }
    });
  }, [roomName, token, localStream]);

  const [otherUserPublications, setOtherUserPublications] = useState<
    RoomPublication<LocalStream>[]
  >([]);

  return (
    <div>
      <p>ID: </p>
      <div>
        room name:{" "}
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
        <button onClick={onJoinClick} disabled={!canJoin}>
          join
        </button>
      </div>
      <video ref={localVideo} width="400px" muted playsInline></video>
      <div>
        {me != null &&
          otherUserPublications.map((p) => (
            <RemoteMedia key={p.id} me={me} publication={p} />
          ))}
      </div>
    </div>
  );
};

export default MainContent;
