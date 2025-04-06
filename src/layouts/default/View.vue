<template>
  <v-main>
    <v-container class="fill-height pa-0 d-flex flex-column">
      <div v-if="store.getVideoCallStatus" class="video-section">
        <v-row class="video-container ma-0">
          <v-col :cols="12" class="video-col pa-0">
            <v-progress-circular v-if="!userVideoLoaded" class="loader" color="primary" indeterminate :size="68"
              :width="6" />
            <div id="videos" class="videos-container">
            </div>
          </v-col>
        </v-row>
        <v-row v-if="userVideoLoaded" class="controls-row ma-0 pa-0">
          <v-col class="d-flex justify-center pa-0">
            <div class="call-controls">
              <v-btn @click="toggleMute" :color="isMuted ? 'grey' : 'primary'" icon class="ma-2">
                <v-icon>{{ isMuted ? 'mdi-microphone-off' : 'mdi-microphone' }}</v-icon>
              </v-btn>
              <v-btn @click="toggleCamera" :color="isCameraOff ? 'grey' : 'primary'" icon class="ma-2">
                <v-icon>{{ isCameraOff ? 'mdi-video-off' : 'mdi-video' }}</v-icon>
              </v-btn>
              <v-btn @click="hangUp" icon="mdi-phone-hangup" density="default" color="red" class="ma-2">
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </div>
      <div class="list-container pa-6" :class="{ 'chat-with-video': store.getVideoCallStatus && userVideoLoaded }">
        <div class="messages">
          <div v-for="(chatMessage, i) in store.getMessages(selectedFriend)" :key="chatMessage">
            <div class="userMessage tw-flex" v-if="('Me' in chatMessage)">
              <v-avatar :image="store.currentUser.photoURL" size="45"></v-avatar>
              <div class="tw-flex tw-flex-col">
                <span class="tw-font-bold">{{ store.currentUser.displayName }}</span>
                <span>{{ chatMessage["Me"] }}</span>
              </div>
            </div>
            <div class="userMessage  tw-flex" v-else>
              <v-avatar :image="store.activeFriend.photoURL" size="45"></v-avatar>
              <div class="tw-flex tw-flex-col">
                <span class="tw-font-bold">{{ selectedFriend }}</span>
                <span>{{ chatMessage["Them"] }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="selectedFriend" class="message-input-container">
        <v-text-field class="inputBox" label="Type a message" single-line hide-details @keyup.enter="sendNewMessage"
          rounded dense variant="solo-filled" append-icon="" v-model="message"></v-text-field>
      </div>
    </v-container>
  </v-main>
</template>

<script setup lang="ts">

import { useAppStore } from '../../store/app';
import { ref, watch, onMounted, onBeforeUnmount, WatchStopHandle, nextTick } from 'vue'
import { defineProps, reactive, toRefs } from "vue";
import { watchRoom, joinRoom, saveUserSignal, getConfiguration, saveReadyUser, STATUS, closeConnection } from '@/scripts/signalingAPI';
import SimplePeer from 'simple-peer/simplepeer.min.js';
// import SimplePeer from 'simple-peer';

const props = defineProps({
  selectedFriend: String,
})
const store = useAppStore()
const { selectedFriend } = toRefs(props);

const isMuted = ref(false);
const isCameraOff = ref(false);

// TODO: O status de "Em chamada" é global. Então, quando troca de usuário, o vídeo vai permanecer na tela. Mudar esse estado para estar atrelado ao usuário selecionado.'
watch(() => store.friends.dict[store.activeFriend.uid]?.status, (newStatus) => {
  const activeFriend = store.activeFriend.uid;
  console.log('watching friendsDict', activeFriend);

  if (isConnectionCreatedForActiveFriend()) {
    console.log('Peer already exists');
    return;
  }

  if (newStatus == 'online') {
    console.log('Friend is now online. Creating WebRtConnection');
    createSimplePeerForActiveFriend();
  } else {
    console.log('Friend is still offline');
  }
})

function isConnectionCreatedForActiveFriend() {
  return store.activeFriend.uid in store.peers && !(store.peers[store.activeFriend.uid].closed || store.peers[store.activeFriend.uid].destroyed);
}

function createSimplePeerForActiveFriend() {
  const configuration = getConfiguration();
  const currentFriend = store.activeFriend;
  const currentFriendId = currentFriend.uid;

  store.peers[currentFriendId] = new SimplePeer({
    initiator: true,
    config: configuration,
    channelName: "messenger",
  })

  const peer = store.peers[currentFriendId];

  peer.on('signal', (data) => {
    console.log(`Signaling friend ${currentFriend.displayName}`);
    store.webRtcSignal(currentFriendId, JSON.stringify(data));
  })

  peer.on('connect', () => {
    console.log('connected');
  })

  peer.on('data', async (data) => {
    const message = JSON.parse(data);

    if (message.type === 'message') {
      let friend = store.friends.list.find(friend => friend.data.uid === currentFriendId);
      store.addReceivedMessage(message.data, friend.data.displayName);
    } else if (message.type === 'callAccepted') {
      console.log('callAccepted');
      store.acceptCall();
      await store.addStreamToPeerConnection(currentFriend, message.data.callType);
    } else if (message.type === "callRejected") {
      console.log('callRejected');
      await friendHungUp(currentFriend);
    } else if (message.type === "startCall") {
      console.log("CALL received");
      store.eventQueue.push({
        type: "startCall",
        data: {
          userCalling: store.friends.dict[currentFriendId].data,
          callType: message.data.callType
        },
      });
      await store.getMediaStream(message.data.callType);
    }

    console.log("data", message)
  })
  peer.on('close', (data) => {
    store.peers[currentFriendId].destroy();
    delete store.peers[currentFriendId];
    console.log('close: ', data)
  })
  peer.on('error', (data) => {
    console.log('error', data)
  })
  peer.on('stream', (stream) => {
    console.log('recebi a stream');
    addStream(stream, currentFriendId);
  })
}

onBeforeUnmount(() => {
  console.log('Unmounting');
})

const message = ref();
const userVideoLoaded = ref(false);

function toggleMute() {
  if (store.mediaStream) {
    const audioTracks = store.mediaStream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = !track.enabled;
    });
    isMuted.value = audioTracks.length > 0 ? !audioTracks[0].enabled : false;
    console.log(`Microphone ${isMuted.value ? 'muted' : 'unmuted'}`);
  }
}

function toggleCamera() {
  if (store.mediaStream) {
    const videoTracks = store.mediaStream.getVideoTracks();
    videoTracks.forEach(track => {
      track.enabled = !track.enabled;
    });
    isCameraOff.value = videoTracks.length > 0 ? !videoTracks[0].enabled : true;
    console.log(`Camera ${isCameraOff.value ? 'disabled' : 'enabled'}`);
  }
}

function sendNewMessage() {
  if (!message.value) return
  if (store.activeFriend.uid in store.peers) {
    store.addMessage(message.value, store.activeFriend)
    message.value = ''
  }
}

const showLocalVideoPreview = (stream) => {
  const videoContainer = document.getElementById("videos")
  const videoElement = document.createElement('video')
  videoElement.setAttribute('controls', true);
  videoElement.autoplay = true
  videoElement.muted = true
  videoElement.className = 'video-element local-video'
  videoElement.style.maxWidth = "100%";
  videoElement.style.maxHeight = "100%";
  videoElement.style.objectFit = "cover";
  videoElement.style.width = "100%";
  videoElement.style.height = "100%";
  videoElement.style.margin = "0 auto";
  videoElement.style.padding = "5px";

  videoElement.srcObject = stream
  videoElement.onloadedmetadata = () => {
    videoElement.play()
  }
  videoContainer.appendChild(videoElement)
}
const addStream = (stream, userId) => {
  console.log(store.getVideoCallStatus);

  const videoContainer = document.getElementById("videos")
  const videoElement = document.createElement('video')
  videoElement.setAttribute('controls', true);
  videoElement.autoplay = true
  videoElement.muted = true
  videoElement.srcObject = stream
  videoElement.id = `${userId}-video`
  videoElement.className = 'video-element'
  videoElement.style.maxWidth = "100%";
  videoElement.style.maxHeight = "100%";
  videoElement.style.objectFit = "cover";
  videoElement.style.width = "100%";
  videoElement.style.height = "100%";
  videoElement.style.margin = "0 auto";

  videoElement.onloadedmetadata = () => {
    videoElement.play()
  }
  videoContainer.appendChild(videoElement)
  userVideoLoaded.value = true;

  isMuted.value = false;
  isCameraOff.value = false;
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
  if (store.mediaStream) {
    store.mediaStream.getTracks().forEach(track => {
      track.stop();
    });
    store.mediaStream = null;

    isMuted.value = false;
    isCameraOff.value = false;
  }
}

async function friendHungUp(friend) {
  freeCam();
  store.setCallInactive();
  userVideoLoaded.value = false;
  store.callRejected();
}

defineExpose({
  addStream,
  friendHungUp
})

async function hangUp() {
  freeCam();
  store.setCallInactive();
  userVideoLoaded.value = false;
  store.rejectCall(store.activeFriend);
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
  margin-bottom: 10px;
  width: 100% !important;
  max-height: 50px;
  position: relative;
  bottom: 0;
  left: 0;
  right: 0;
}

.userMessage {
  margin-top: 20px;
}

.video-section {
  display: flex;
  flex-direction: column;
  width: 100%;
  background: #000;
}

.video-container {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: black;
  min-height: 300px;
  height: 50vh;
}

.video-col {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.videos-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.videos-container video {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
  width: 100%;
  height: 100%;
}

.loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.controls-row {
  width: 100%;
  padding: 10px 0;
  border-radius: 100px;
}

.call-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 100px;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.list-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  padding-bottom: 80px;
}

.chat-with-video {
  height: calc(50vh - 450px);
  margin-bottom: 50px;
}

.list-container .messages {
  overflow-y: auto;
  flex-grow: 1;
  width: 100%;
  margin-bottom: 10px;
  padding-bottom: 10px;
}

.list-container .messages::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.list-container .messages::-webkit-scrollbar-thumb {
  background-color: black;
  border-radius: 8px;
}

.list-container .messages::-webkit-scrollbar-track {
  background: transparent;
}

.message-input-container {
  position: fixed;
  bottom: 0;
  left: 240px;
  right: 0;
  padding: 16px 24px;
  background-color: #323338;
  z-index: 1000;
  box-shadow: 0 -1px 5px rgba(0, 0, 0, 0.1);
}
</style>
