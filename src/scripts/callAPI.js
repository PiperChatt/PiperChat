import { useSoundStore } from "@/store/sounds";
import { useAppStore } from "@/store/app";
import { db } from "@/firebase";
import {
  ref,
  runTransaction,
  onValue,
  update,
  remove,
} from "firebase/database";
import { getUserInfoByUID } from "@/firebase/userHelper";
import { v4 as uuidv4 } from "uuid";
import { createRoom } from "./signalingAPI";
import { generateRoomKey } from "@/firebase/userHelper";

const store = useAppStore();
const sounds = useSoundStore();

async function startWebRtcSignaling(friend) {
  const roomKey = generateRoomKey(
    store.currentUser.uid,
    store.activeFriend.uid
  );
  const roomRef = ref(db, `rooms/${roomKey}`);
}

function waitFor(millisec) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("");
    }, millisec);
  });
}

async function notifyCallToUserV2(friend) {
  let audio = sounds.call;
  audio.currentTime = 0;
  audio.loop = true;
  audio.play();

  const friendId = friend.uid;

  if (friendId in store.peers) {
    store.peers[friendId].send(
      JSON.stringify({
        type: "startCall",
        data: {},
      })
    );

    if (store.timeouts["notifyCall"]) {
      for (let timeout of store.timeouts["notifyCall"]) {
        clearTimeout(timeout);
      }
    }

    let x = setTimeout(
      () => {
        if (!store.currentCallInfo?.accepted) {
          audio.pause();
          store.rejectCall(friend);
          store.callRejected();
        }
      },
      10000,
      "callStart"
    );

    if (!store.timeouts["notifyCall"]) {
      store.timeouts["notifyCall"] = [];
    }

    store.timeouts["notifyCall"].push(x);

    console.log("Call notification sent to: ", friend);
    return;
  }

  let timeout = 0;
  let waitTime = 1000;

  while (timeout < 10000) {
    if (friendId in store.peers) {
      await notifyCallToUserV2(friend);
      return;
    }

    await waitFor(waitTime);
    timeout += waitTime;
  }

  audio.pause();
  store.rejectCall(friend);
  store.callRejected();
}

export async function startVideoCall(friend) {
  console.log(friend);

  store.getMediaStream();
  store.setActiveCall(friend);
  await notifyCallToUserV2(friend);
}

function deleteCallRoom() {
  const documentRef = ref(db, `room/${store.incommingCallInfo.roomId}`);
  remove(documentRef, null)
    .then(() => {})
    .catch((error) => {
      console.error("Error removing document: ", error);
    });
}
