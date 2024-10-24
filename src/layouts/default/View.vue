<template>
  <v-main>
    <v-container class="fill-height pa-0">
      <div v-if="store.getVideoCallStatus" class="video-container">
        <v-col style="background-color: black;">
          <v-progress-circular v-if="!userVideoLoaded" class="ma-8" color="primary" indeterminate :size="68"
            :width="6" />
          <div id="videos">
          </div>
          <v-btn v-if="userVideoLoaded" @click="hangUp" icon="mdi-phone-hangup" density="default" color="red"
            class="ma-3">
          </v-btn>
        </v-col>
      </div>
      <div class="list-container ma-3">
        <v-text-field v-if="selectedItem" class="inputBox" label="Type a message" single-line hide-details
          @keyup.enter="sendNewMessage" rounded dense solo append-icon="" v-model="message"></v-text-field>
        <div v-for="(chatMessage, i) in store.getMessages(selectedItem).slice().reverse()" :key="chatMessage">
          <div class="userMessage tw-flex" v-if="('Me' in chatMessage)">
            <v-avatar :image="store.currentUser.photoURL" size="45"></v-avatar>
            <div class="tw-flex tw-flex-col">
              <span class="tw-font-bold">{{ store.currentUser.displayName }}</span>
              <span>{{ chatMessage["Me"] }}</span>
            </div>
          </div>
          <div class="userMessage  tw-flex" v-else>
            <v-avatar image="https://cdn.vuetifyjs.com/images/john-smirk.png" size="45"></v-avatar>
            <div class="tw-flex tw-flex-col">
              <span class="tw-font-bold">{{ selectedItem }}</span>
              <span>{{ chatMessage["Them"] }}</span>
            </div>
          </div>
        </div>

      </div>
    </v-container>
  </v-main>
</template>

<script setup lang="ts">

import { useAppStore } from '../../store/app';
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { defineProps, reactive, toRefs } from "vue";
import { watchRoom, joinRoom, saveUserSignal, getConfiguration, saveReadyUser, STATUS, closeConnection } from '@/scripts/signalingAPI';
import { hangUpCurrentCall } from '@/scripts/callAPI';
import SimplePeer from 'simple-peer/simplepeer.min.js';
// import SimplePeer from 'simple-peer';

const props = defineProps({
  selectedItem: String,
})

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
})

const { selectedItem } = toRefs(props);

let alreadyConnected = false;
let localStream: MediaStream = {}
let peers: { [key: string]: SimplePeer.SimplePeer } = {}

const message = ref();
const userVideoLoaded = ref(false);

function sendNewMessage() {
  if (!message.value) return

  if (alreadyConnected) {

    store.addMessage(message.value, selectedItem.value)
    message.value = ''
  }
}

const store = useAppStore()

const handleBeforeUnload = (event) => {
  // Encerrar a conexão peer
  const peersList = Object.keys(peers)
  if (peersList.length > 0) {
    for (let i = 0; i < peersList.length; i++) {
      peers[peersList[i]].destroy()
    }
    closeConnection(store.incommingCallInfo.roomId, { signal: null, participant: store.currentUser.uid })
  }
};
watch(
  () => store.isInCall,
  (isInCall) => {
    if (!isInCall) return;

    // the user that was accepted the call are the initiator
    if (store.incommingCallInfo.callerUID != store.currentUser.uid) {
      navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 480,
          height: 360
        }
      }).then(async stream => {
        localStream = stream
        console.log('successfuly received local stream: ')
        await saveReadyUser({ id: store.incommingCallInfo.roomId })
        watchAsInitiator();
      }).catch(err => {
        console.error('error occurred when triyng to get an access to local stream')
        console.error(err)
      })
    } else {
      watchCallAsNotInitator();
      navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 480,
          height: 360
        }
      }).then(stream => {
        console.log('successfuly received local stream: ')
        localStream = stream
      }).catch(err => {
        console.error('error occurred when triyng to get an access to local stream')
        console.error(err)
      })
    }
  },
  { immediate: true }
);
function watchCallAsNotInitator() {
  watchRoom(store.incommingCallInfo.roomId, async (updatedRoom) => {
    if (updatedRoom.currentState === STATUS.USER_READY_FOR_CONNECTION) {
      const readyUsers = JSON.parse(updatedRoom.readyUsers);
      const readyUser = readyUsers[readyUsers.length - 1]
      if (!peers.hasOwnProperty(readyUser) && readyUser !== store.currentUser.uid && !peers[readyUser]) {
        console.log(`[WATCH ROOM]: New user added`)
        const configuration = getConfiguration()
        peers[readyUser] = new SimplePeer({
          initiator: false,
          config: configuration,
          stream: localStream,
          channelName: "messenger",
        })
        peers[readyUser].on('signal', (data) => {
          console.log(data);
          const signalData = {
            signal: data,
            participant: store.currentUser.uid
          }
          saveUserSignal(updatedRoom, signalData)
        })

        peers[readyUser].on('data', (data) => {
          console.log("data", data)
        })

        peers[readyUser].on('stream', (stream) => {
          addStream(stream, readyUser)
          userVideoLoaded.value = true;
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
      alreadyConnected = true
      if (signal.type === 'answer') {
        alreadyConnected = true
      }
    } else if (updatedRoom.currentState === STATUS.CLOSING_CONNECTION) {
      const signal = updatedRoom.signals
      hangUp();
      if (peers[signal.participant]) {
        removeStream(signal.participant)
        peers[signal.participant].destroy()
        delete peers[signal.participant]
      }
    }
  })
}
function watchAsInitiator() {
  watchRoom(store.incommingCallInfo.roomId, async (updatedRoom) => {
    if (updatedRoom.currentState === STATUS.USER_READY_FOR_CONNECTION) {
      const readyUsers = JSON.parse(updatedRoom.readyUsers);
      const readyUser = readyUsers[readyUsers.length - 1]
      if (!peers.hasOwnProperty(readyUser) && readyUser !== store.currentUser.uid && !peers[readyUser]) {
        console.log(`[WATCH ROOM]: A user is ready for connection`, readyUser)
        const configuration = getConfiguration()
        peers[readyUser] = new SimplePeer({
          initiator: !alreadyConnected,
          config: configuration,
          stream: localStream,
          channelName: "messenger"
        })
        peers[readyUser].on('signal', (data) => {
          // webRTC offer, webRTC Answer (SDP information), ice candidates
          const signalData = {
            signal: data,
            participant: store.currentUser.uid
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
          console.log('recebi a stream');
          addStream(stream, readyUser)
          userVideoLoaded.value = true;
        })
        await saveReadyUser({ id: store.incommingCallInfo.roomId })
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
      hangUp();
      const signal = updatedRoom.signals
      if (peers[signal.participant]) {
        removeStream(signal.participant)
        peers[signal.participant].destroy()
        delete peers[signal.participant]
      }
    }
  })
}
const showLocalVideoPreview = (stream) => {
  const videoContainer = document.getElementById("videos")
  const videoElement = document.createElement('video')
  videoElement.setAttribute('controls', true);
  videoElement.autoplay = true
  videoElement.muted = true
  videoElement.style.padding = "5px";
  // videoElement.style.width = "50%";
  videoElement.style.height = "80%";
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
function freeCam() {
  if (localStream) {
    localStream.getTracks().forEach(track => {
      track.stop();
    });
  }
}
function hangUp() {
  handleBeforeUnload();
  freeCam();
  store.setCallInactive();
  userVideoLoaded.value = false;
  alreadyConnected = false;
  peers = {};
  hangUpCurrentCall();
}
</script>


<style scoped>
span {
  padding-left: 15px;
  padding-bottom: 2px;
  display: inline-block;
  vertical-align: middle;
}

.inputBox {
  margin-top: 20px;
  margin-bottom: 20px;
  width: 500px;
  max-height: 20px;
}

.userMessage {
  margin-top: 20px;
}

.list-container {
  display: flex;
  flex-direction: column-reverse;
  align-self: end;
  margin-bottom: 5px;
}

.video-container {
  display: flex;
  width: 100%;
  align-self: start;
  align-items: center;
  text-align: center;
  justify-content: center;
  background-color: black;
  height: 50%;
}

#videos {
  display: flex;
  align-self: start;
  width: 100%;
  background-color: black;
  align-items: center;
  justify-content: center
}
</style>
