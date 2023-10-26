<template>
  <!-- <HelloWorld /> -->
  <v-row>
    <v-col class="d-flex flex-column" :cols="5">
      <span>Testes sinalização</span>
      <v-btn color="info" @click="createRoomBtn">create-room</v-btn>
      <v-btn color="warning" @click="lock=true">lock</v-btn>
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
  import { createRoom, getAndWatchRooms, joinRoom, watchRoom, getConfiguration, saveUserSignal, saveReadyUser, STATUS } from './signalingAPI'
  import { ref, onMounted  } from 'vue';
  import { useAppStore } from '@/store/app'

  const appStore = useAppStore()


  import HelloWorld from '@/components/HelloWorld.vue'
  let rooms = ref({});
  let localStream = {}
  let peers = {}
  let lock = false
  let alreadyConnected = false
  onMounted(() => {
    console.log("[Home] Componente montado!");

    const updatedRooms = (newRooms) => {
      rooms.value = newRooms;
    };

    getAndWatchRooms(updatedRooms);
  });
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
        if (lock) {
          return;
        }
        console.log('aloco')
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
            console.log('aqui passa')
            peers[readyUser].on('signal', (data) => {
              // webRTC offer, webRTC Answer (SDP information), ice candidates
              const signalData = {
                signal: data,
                participant: appStore.currentUser.uid
              }

              
              // wss.signalPeerData(signalData)
              saveUserSignal(updatedRoom, signalData)
            })
          
            peers[readyUser].on('data', (data) => {
              // const messageData = JSON.parse(data)
              // appendNewMessage(messageData)
          
            })
          
            peers[readyUser].on('stream', (stream) => {
              console.log('new stream detected')
              addStream(stream, readyUser)
              // streams = [...streams, stream]
            })
            await saveReadyUser(room)
          }
        } else if (updatedRoom.currentState === STATUS.STARTING_CONNECTION) {
          const signal = (updatedRoom.signals)
          console.log('chega isso: ', signal)
          // const signal = signals[signals.length - 1]
          // console.log("participante:  ", signal.participant, "Sinal: ", signal)
          // console.log("e tem o que aqui? ",  peers[signal.participant])
          peers[signal.participant].signal(signal.signal)
          if (signal.signal.type === 'answer') {
            alreadyConnected = true
            await joinRoom(room)
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
    watchRoom(room.id, async (updatedRoom) => {
      if (updatedRoom.currentState === STATUS.USER_READY_FOR_CONNECTION ) {
        const readyUsers = JSON.parse(updatedRoom.readyUsers);
        const readyUser = readyUsers[readyUsers.length - 1]
        // const participants = JSON.parse(updatedRoom.participants)
        // const participant = participants[participants.length - 1]
        console.log("Compara ai: ", readyUser, appStore.currentUser.uid)
        if (!peers.hasOwnProperty(readyUser) && readyUser !== appStore.currentUser.uid && !peers[readyUser]) {
          console.log(`[WATCH ROOM]: New user added`)
          const configuration = getConfiguration()
  
          peers[readyUser] = new window.SimplePeer({
            initiator: false,
            config: configuration,
            stream: localStream,
            channelName: "messenger"
          })
          console.log('aqui passa')
          peers[readyUser].on('signal', (data) => {
            // webRTC offer, webRTC Answer (SDP information), ice candidates
            const signalData = {
              signal: data,
              participant: appStore.currentUser.uid
            }
            // wss.signalPeerData(signalData)
            saveUserSignal(updatedRoom, signalData)
          })
        
          peers[readyUser].on('data', (data) => {
            // const messageData = JSON.parse(data)
            // appendNewMessage(messageData)
        
          })
        
          peers[readyUser].on('stream', (stream) => {
            console.log('new stream detected')
            addStream(stream, readyUser)
            // streams = [...streams, stream]
          })
          
          await saveReadyUser(updatedRoom)
        }
      } else if (updatedRoom.currentState === STATUS.STARTING_CONNECTION) {
        const signal = (updatedRoom.signals)
        // const signal = signals[signals.length - 1]
        peers[signal.participant].signal(signal.signal)
        alreadyConnected=true
        if (signal.type === 'answer') {
          alreadyConnected = true
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
    // show local video preview
    const videoContainer = document.getElementById("videos")
    const videoElement = document.createElement('video')
    videoElement.setAttribute('controls', true);
    videoElement.autoplay = true
    videoElement.muted = true
    // videoElement.muted = false
    videoElement.srcObject = stream

    videoElement.onloadedmetadata = () => {
      videoElement.play()
    }
    videoContainer.appendChild(videoElement)
  }

  const addStream = (stream, userId) => {
    // show local video preview
    const videoContainer = document.getElementById("videos")
    const videoElement = document.createElement('video')
    videoElement.setAttribute('controls', true);
    videoElement.autoplay = true
    videoElement.muted = true
    // videoElement.muted = false
    videoElement.srcObject = stream
    videoElement.id = `${userId}-video`

    videoElement.onloadedmetadata = () => {
      videoElement.play()
    }
    videoContainer.appendChild(videoElement)
  }


  // console.log('Daqui eu recebo assim: ', rooms)

</script>

<style>
  .room-container {
    border-bottom: 1px solid black;
  }
</style>