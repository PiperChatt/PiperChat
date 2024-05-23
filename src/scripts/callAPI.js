import { useSoundStore } from '@/store/sounds'
import { useAppStore } from '@/store/app';
import { db } from '@/firebase';
import { ref, runTransaction, onValue, update, remove } from 'firebase/database';
import { getUserInfoByUID } from './userAPI';
import { v4 as uuidv4 } from 'uuid';
import { createRoom } from './signalingAPI';


const store = useAppStore();
const sounds = useSoundStore();



async function notifyCallToUser() {
  const userRef = ref(db, `users/${store.activeFriend.uid}`);
  const ring = await runTransaction(userRef, (userData) => {
    const roomId= uuidv4();

    if (userData === null) {
      // Se os dados não existirem, inicialize-os
      return { callRoom: { ringing: true, inCall: false, callerUID: store.currentUser.uid, roomId: roomId } };
    } else if (!userData.callRoom ) {
      return { ...userData, callRoom: { ringing: true, roomId: roomId } }
    } else if(userData.callRoom && !userData.callRoom.ringing && !userData.callRoom.inCall) {
      userData.callRoom.ringing = true;
      userData.callRoom.callerUID = store.currentUser.uid;
      userData.callRoom.roomId = roomId;
      return userData;
    } else {
      return ;
    }
  }).then((result) => {
    if (result.committed) {
      return true;
    } else {
      return false;
    }
  }).catch((error) => {
    console.error('Transaction failed: ', error);
    return false;
  });
  return ring;
}

export async function startVideoCall(callWatcher, callUnsubscribeVar) {
  const successRinging = await notifyCallToUser();
  if (successRinging) {
    let audio = sounds.call;
    audio.currentTime = 0;
    audio.loop = true;
    audio.play();
  
    store.setCallingAsActive();
    watchInitiatedCallStatus(callWatcher, callUnsubscribeVar);
    return true;
  } else {
    let audio = sounds.busyUser;
    audio.play();
    return false;
  }
}

function watchInitiatedCallStatus(callWatcher, callUnsubscribeVar) {
  const dataRef = ref(db, `users/${store.activeFriend.uid}/callRoom`)
  callUnsubscribeVar = onValue(dataRef, async (snapshot) => {
    const call = snapshot.val();
    if(call.callAccepted) {
      sounds.call.pause();
      sounds.joined.play();
    }
    callWatcher(call);
  })
}

export async function dismissInitiatedCall() {
  const userRef = ref(db, `users/${store.activeFriend.uid}`);
  const ring = await runTransaction(userRef, (userData) => {
    if (userData === null) {
      // Se os dados não existirem, inicialize-os
      return { callRoom: { ringing: false, inCall: false, callerUID: null, callAccepted: false } };
    } else if (!userData.callRoom ) {
      return { ...userData, callRoom: { ringing: false, inCall: false, callerUID: null, callAccepted: false } }
    } else {
      userData.callRoom.ringing = false;
      userData.callRoom.callerUID = null;
      userData.callRoom.callAccepted = false;
      return userData;
    }
  }).then((result) => {
    if (result.committed) {
      return true;
    } else {
      return false;
    }
  }).catch((error) => {
    console.error('Transaction failed: ', error);
    return false;
  });
  sounds.call.pause();
  store.setCallingAsInactive();
}


export const watchIncommingCall = (update) => {
  const dataRef = ref(db, `users/${store.currentUser.uid}/callRoom`)
  onValue(dataRef, async (snapshot) => {
    const call = snapshot.val()
    if (call.ringing) {
      const userCalling = await getUserInfoByUID(call.callerUID);
      delete userCalling.callRoom;
      store.setIncommingCallInfo({...call, userCalling, userCalled: store.currentUser});
      let audio = sounds.call;
      audio.currentTime = 0;
      audio.loop = true;
      audio.play();
      update(call);
    } else {
      sounds.call.pause();
      update(null);
    }
  })
}


export async function dismissIncommingCall(callAccepted) {
  const userRef = ref(db, `users/${store.currentUser.uid}/callRoom`);
  const ring = await runTransaction(userRef, (room) => {
    room.ringing = false;
    if (!callAccepted) {
      room.callerUID = null;
    }
    return room;
  }).then((result) => {
    if (result.committed) {
      return true;
    } else {
      return false;
    }
  }).catch((error) => {
    console.error('Transaction failed: ', error);
    return false;
  });
  if (!callAccepted) {
    store.setIncommingCallInfo(null);
  }
  sounds.call.pause();
}

export function acceptCall() {
  createRoom(store.incommingCallInfo.roomId);
  update(ref(db, `users/${store.currentUser.uid}/callRoom`), {
    callAccepted: true,
    inCall: true
  });
  store.setCallActive();
  sounds.joined.play();
}

export async function hangUpCurrentCall() {
  sounds.left.play();
  const userRef = ref(db, `users/${ store.incommingCallInfo.userCalled.uid}/callRoom`);
  await runTransaction(userRef, (room) => {
    room.ringing = false;
    room.callAccepted = false;
    room.inCall = false;
    return room;
  }).then((result) => {
    if (result.committed) {
      deleteCallRoom();
      return true;
    } else {
      return false;
    }
  }).catch((error) => {
    console.error('Transaction failed: ', error);
    return false;
  });

}

function deleteCallRoom(){
  const documentRef = ref(db, `room/${ store.incommingCallInfo.roomId}`);
  remove(documentRef, null)
  .then(() => {
  })
  .catch((error) => {
      console.error('Error removing document: ', error);
  });
}