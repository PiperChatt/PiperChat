import { ref, set, get, onValue, update } from 'firebase/database';
import { db } from '@/firebase';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '@/store/app'
import { ref as vRef  } from 'vue';
import { fetchTURNCredential, getTurnIceServers } from '../turn'

export const STATUS = Object.freeze({
  CREATING_ROOM: 'creating-room',
  JOINING_ROOM: 'joining-room',
  USER_READY_FOR_CONNECTION: 'user-ready-for-connection',
  STARTING_CONNECTION: 'starting-connection',
  CONNECTED_USER: 'connected-user'
});

const appStore = useAppStore()
// export const peers = {}
fetchTURNCredential();
// export let localStream = {}


export const getConfiguration = () => {
  const turnIceServers = getTurnIceServers()
  if (turnIceServers) {
    console.log('TURN server credentials fetched')
    console.log(turnIceServers)
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



export const createRoom = async () => {

  try {
    console.log("ola amigo: ")
    console.log(appStore.currentUser)
    const roomId= uuidv4()
    const userRef = ref(db, `room/${roomId}`)
    const userData = {
      name: "Sala teste",
      participants: JSON.stringify([appStore.currentUser.uid]),
      id: roomId,
      readyUsers: JSON.stringify([]),
      signals: JSON.stringify([]),
      currentState: STATUS.CREATING_ROOM,
      targets: '*'
    };

    // Escrever dados no banco de dados
    await set(userRef, userData)
    console.log('Data written successfully!')
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
    if (room.targets === '*' || room.targets.includes(appStore.currentUser.uid)) {
      console.log(`Room ${roomId} updated`, room)
      if (room) {
    
        const participants = JSON.parse(room.participants)
        const participant = participants[participants.length - 1]
        updatedRoom(room)
        
      }
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

export const saveReadyUser = async (room) => {
  const roomRef = ref(db, `room/${room.id}`)
  let readyVector = JSON.parse(room.readyUsers)
  readyVector.push(appStore.currentUser.uid)
  const participants = JSON.parse(room.participants)
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
        console.log('A new room was added:', rooms);
        updateRooms(rooms);
    });
}

export const joinRoom = async (room) => {
  try {
    const roomRef = ref(db, `room/${room.id}`)
  
    console.log('Joinning in room: ', room)
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