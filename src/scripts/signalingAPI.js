import { ref, set, onValue, update, get, child } from 'firebase/database';
import { db } from '@/firebase';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '@/store/app'
import { fetchTURNCredential, getTurnIceServers } from '../turn'

export const STATUS = Object.freeze({
  CREATING_ROOM: 'creating-room',
  JOINING_ROOM: 'joining-room',
  USER_READY_FOR_CONNECTION: 'user-ready-for-connection',
  STARTING_CONNECTION: 'starting-connection',
  CONNECTED_USER: 'connected-user',
  CLOSING_CONNECTION: 'closing-connection'
});

const appStore = useAppStore()
fetchTURNCredential();

export const handleBeforeUnload = (peers) => {
  if (!peers) return;
  for (const peer of peers) {
    peer.destroy();
  }
};

export const getConfiguration = () => {
  const turnIceServers = getTurnIceServers()
  if (turnIceServers) {
    console.log('TURN server credentials fetched')
    return {
      icServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        },
        ...turnIceServers
      ]
    }
  } else {
    console.warn('Using only STUN server')
    return {
      icServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    }
  }
}

export const createRoom = async (rID) => {
  try {
    const roomId = rID || uuidv4()
    const userRef = ref(db, `room/${roomId}`)
    const userData = {
      name: rID,
      participants: JSON.stringify([appStore.currentUser.uid]),
      id: roomId,
      readyUsers: JSON.stringify([]),
      signals: JSON.stringify([]),
      currentState: STATUS.CREATING_ROOM,
      targets: '*'
    };

    await set(userRef, userData)
    return userData
  } catch (error) {
    console.error('Failed to write data: ', error);
    return {}
  }
}

export const watchRoom = (roomId, updatedRoom) => {
  const dataRef = ref(db, `room/${roomId}`)
  onValue(dataRef, (snapshot) => {
    const room = snapshot.val()
    if (!room) {
      console.log('couldnt find room');
      return;
    }
    if (room.targets === '*' || room.targets.includes(appStore.currentUser.uid)) {
      console.log(`Room ${roomId} updated`, room)
      updatedRoom(room)
    }
  })
}

export const saveUserSignal = async (room, signal) => {
  const roomRef = ref(db, `room/${room.id}`)
  const readyUsers = JSON.parse(room.readyUsers)
  setTimeout(async () => {
    await update(roomRef, {
      signals: signal,
      currentState: STATUS.STARTING_CONNECTION,
      targets: JSON.stringify(readyUsers.filter((p) => p !== appStore.currentUser.uid))
    })
  }, 500)
}

async function getRoomById(id) {
  const dbRef = ref(db);
  let room = null;
  try {
    room = await get(child(dbRef, `room/${id}`));
    if (room.exists()) {
      return room.val();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting collection data:', error);
    return null;
  }

}

export const saveReadyUser = async (room) => {
  const roomRef = ref(db, `room/${room.id}`)
  const roomData = await getRoomById(room.id);
  let readyVector = JSON.parse(roomData.readyUsers)
  readyVector.push(appStore.currentUser.uid)
  setTimeout(async () => {
    await update(roomRef, {
      readyUsers: JSON.stringify(readyVector),
      currentState: STATUS.USER_READY_FOR_CONNECTION,
      targets: '*'
    })
  }, 500)
}

export const getAndWatchRooms = (updateRooms) => {
  const dataRef = ref(db, 'room')
    onValue(dataRef, (snapshot) => {
      const rooms = snapshot.val()
        updateRooms(rooms);
    });
}

export const joinRoom = async (room) => {
  try {
    const roomRef = ref(db, `room/${room.id}`)
    let participants = JSON.parse(room.participants)
    participants.push(appStore.currentUser.uid)
    setTimeout(async () => {
      await update(roomRef, {
        participants: JSON.stringify(participants),
        currentState: STATUS.CONNECTED_USER,
        readyUsers: "[]",
        targets: JSON.stringify(participants.filter((p) => p !== appStore.currentUser.uid))
      })
    }, 500)

    return true
  } catch (error) {
    console.log("[ERROR ON UPDATE ROOM]: ", error)
    return false
  }
}

export const closeConnection = async (room, signal) => {
  const roomRef = ref(db, `room/${room}`)
  await update(roomRef, {
    currentState: STATUS.CLOSING_CONNECTION,
    targets: '*',
    signals: signal
  })
}
