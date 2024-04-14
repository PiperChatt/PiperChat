<template>
  <v-row>
    <v-col class="d-flex flex-column" :cols="5">
      <span>Testes sinalização</span>
      <v-btn color="info" @click="createRoomBtn">create-room</v-btn>
    </v-col>
    <v-col :cols="5" class="d-flex flex-column">
      <span>Salas criadas</span>
      <v-col v-for="room in rooms" :key="room.id" class="room-container">
        <span>{{ room.id }}</span>
        <v-btn @click="joinRoomBtn(room)">Participar</v-btn>
      </v-col>
    </v-col>
    <v-col :cols="12" id="videos">
    </v-col>
  </v-row>
</template>

<script setup>
  import { createRoom, getAndWatchRooms, joinRoom, watchRoom, getConfiguration, saveUserSignal, saveReadyUser, STATUS, closeConnection } from './signalingAPI'
  import { ref, onMounted, onBeforeUnmount   } from 'vue';
  import { useAppStore } from '@/store/app'

  const appStore = useAppStore()

  let rooms = ref({});
  let localStream = {}
  let peers = {}
  let currentRoom = ''
  let alreadyConnected = false

  const handleBeforeUnloada = (event) => {
    // Encerrar a conexão peer
    const peersList = Object.keys(peers)
    if (peersList.length > 0) {
      for (let i = 0; i < peersList.length; i++) {
        peers[peersList[i]].destroy()
      }
      closeConnection(currentRoom, {signal: null, participant: appStore.currentUser.uid})
    }
  };
  onMounted(() => {
    console.log("[Home] Componente montado!");

    const updatedRooms = (newRooms) => {
      rooms.value = newRooms;
    };

    window.addEventListener('beforeunload', handleBeforeUnloada);
    getAndWatchRooms(updatedRooms);
    
  });

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnloada);
  })

  const joinRoomBtn = async (room) => {
    navigator.mediaDevices.getUserMedia({ 
    audio: true,
    video: {
      width: '480',
      height: '360'
    } 
    }).then(async stream => {
      console.log('successfuly received local stream: ', stream.getAudioTracks().length)
      localStream = stream
      showLocalVideoPreview(stream)
      await saveReadyUser(room)
      watchRoom(room.id, async (updatedRoom) => {
        if (updatedRoom.currentState === STATUS.USER_READY_FOR_CONNECTION ) {

          const readyUsers = JSON.parse(updatedRoom.readyUsers);
          const readyUser = readyUsers[readyUsers.length - 1]
          if (!peers.hasOwnProperty(readyUser) && readyUser !== appStore.currentUser.uid && !peers[readyUser]) {
            console.log(`[WATCH ROOM]: A user is ready for connection`, readyUser)
            const configuration = getConfiguration()
  
            peers[readyUser] = new window.SimplePeer({
              initiator: !alreadyConnected,
              config: configuration,
              stream: localStream,
              channelName: "messenger"
            })
            peers[readyUser].on('signal', (data) => {
              // webRTC offer, webRTC Answer (SDP information), ice candidates
              const signalData = {
                signal: data,
                participant: appStore.currentUser.uid
              }
              saveUserSignal(updatedRoom, signalData)
            })
          
            peers[readyUser].on('data', (data) => {
              console.log("data", data)
            })

            peers[readyUser].on('close', (data) => {
              console.log('close: ', data)
            })

            peers[readyUser].on('error', (data) => {
              console.log('error', data)
            })
            peers[readyUser].on('stream', (stream) => {
              addStream(stream, readyUser)
            })
            await saveReadyUser(room)
          }
        } else if (updatedRoom.currentState === STATUS.STARTING_CONNECTION) {
          const signal = (updatedRoom.signals)
          peers[signal.participant].signal(signal.signal)
          if (signal.signal.type === 'answer') {
            alreadyConnected = true
            currentRoom = room.id
            await joinRoom(room)
          }

        } else if (updatedRoom.currentState === STATUS.CLOSING_CONNECTION) {
          const signal = updatedRoom.signals
          if (peers[signal.participant]) {
            removeStream(signal.participant)
            peers[signal.participant].destroy()
            delete peers[signal.participant]
          }
        }
      })
    }).catch (err => {
      console.log('error occurred when triyng to get an access to local stream')
      console.log(err)
    })
    
  }
  
  const createRoomBtn = async () => {
    const room = await createRoom()
    currentRoom = room.id
    watchRoom(room.id, async (updatedRoom) => {
      if (updatedRoom.currentState === STATUS.USER_READY_FOR_CONNECTION ) {
        const readyUsers = JSON.parse(updatedRoom.readyUsers);
        const readyUser = readyUsers[readyUsers.length - 1]
        if (!peers.hasOwnProperty(readyUser) && readyUser !== appStore.currentUser.uid && !peers[readyUser]) {
          console.log(`[WATCH ROOM]: New user added`)
          const configuration = getConfiguration()
  
          peers[readyUser] = new window.SimplePeer({
            initiator: false,
            config: configuration,
            stream: localStream,
            channelName: "messenger"
          })
          peers[readyUser].on('signal', (data) => {
            const signalData = {
              signal: data,
              participant: appStore.currentUser.uid
            }
            saveUserSignal(updatedRoom, signalData)
          })
        
          peers[readyUser].on('data', (data) => {
            console.log("data", data)
          })
        
          peers[readyUser].on('stream', (stream) => {
            addStream(stream, readyUser)
          })

          peers[readyUser].on('close', (data) => {
            console.log('close: ', data)
          })

          peers[readyUser].on('error', (data) => {
            console.log('error', data)
          })
          await saveReadyUser(updatedRoom)
        }
      } else if (updatedRoom.currentState === STATUS.STARTING_CONNECTION) {
        const signal = (updatedRoom.signals)
        peers[signal.participant].signal(signal.signal)
        alreadyConnected=true
        if (signal.type === 'answer') {
          alreadyConnected = true
        }
      } else if (updatedRoom.currentState === STATUS.CLOSING_CONNECTION) {
          const signal = updatedRoom.signals
          console.log(peers)
          if (peers[signal.participant]) {
            removeStream(signal.participant)
            peers[signal.participant].destroy()
            delete peers[signal.participant]
          }
        }
    })

    navigator.mediaDevices.getUserMedia({ 
    audio: true,
    video: {
      width: '480',
      height: '360'
    } 
   }).then(stream => {
    console.log('successfuly received local stream: ', stream.getAudioTracks().length)
    localStream = stream
    showLocalVideoPreview(stream)
    // dispatch an action to hide overlay
  }).catch (err => {
    console.log('error occurred when triyng to get an access to local stream')
    console.log(err)
  })
  }

  const showLocalVideoPreview = (stream) => {
    const videoContainer = document.getElementById("videos")
    const videoElement = document.createElement('video')
    videoElement.setAttribute('controls', true);
    videoElement.autoplay = true
    videoElement.muted = true
    videoElement.srcObject = stream

    videoElement.onloadedmetadata = () => {
      videoElement.play()
    }
    videoContainer.appendChild(videoElement)
  }

  const addStream = (stream, userId) => {
    const videoContainer = document.getElementById("videos")
    const videoElement = document.createElement('video')
    videoElement.setAttribute('controls', true);
    videoElement.autoplay = true
    videoElement.muted = true
    videoElement.srcObject = stream
    videoElement.id = `${userId}-video`

    videoElement.onloadedmetadata = () => {
      videoElement.play()
    }
    videoContainer.appendChild(videoElement)
  }

  const removeStream = (userId) => {
    try {
      const videoContainer = document.getElementById("videos")
      const videoElement = document.getElementById(`${userId}-video`)
      const tracks = videoElement.srcObject.getTracks()
      tracks.forEach(t => t.stop())
      videoElement.srcObject = null
      videoContainer.removeChild(videoElement)
    } catch (e) {
      console.error("Error removing stream ", e)
    }
  }

</script>

<style>
  .room-container {
    border-bottom: 1px solid black;
  }
</style>