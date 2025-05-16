<template>
  <v-main>
    <v-container class="fill-height pa-0 d-flex flex-column">
      <div v-if="store.getVideoCallStatus && !store.isPopUpCallActive" v-show="store.currentCallInfo.friend.uid === store.activeFriend.uid" class="video-section">
        <v-row class="video-container ma-0">
          <v-col :cols="12" class="video-col pa-0">
            <div v-show="!store.currentCallInfo.audioCall" id="videos" class="videos-container">
            </div>
            <v-row
              v-if="store.currentCallInfo.audioCall && userVideoLoaded"
              class="audio-avatar"
            >
              <v-avatar
                :image="store.currentCallInfo.friend.photoURL"
                size="150"
                class="elevation-5"
              />
            </v-row>
          </v-col>
        </v-row>
        <v-row v-if="userVideoLoaded" class="controls-row ma-5">
          <v-col :cols="5">
            <v-row class="d-flex flex-row pt-4">
              <v-btn variant="plain" rounded @click="toggleVolumeMute">
                <v-icon :color="isVolumeMuted ? 'red' : ''"> {{ isVolumeMuted ? 'mdi-volume-mute' :'mdi-volume-high' }} </v-icon>
              </v-btn>
              <v-btn variant="plain" rounded @click="changeVolume('-')">
                <v-icon>mdi-volume-minus</v-icon>
              </v-btn>
              <v-slider v-model="audioVolume" :max="maxVolume" :min="minVolume" :step="volumeStep" thumb-label color="primary" class="flex-grow-1 mx-3" />
              <v-btn variant="plain" rounded @click="changeVolume('+')">
                <v-icon>mdi-volume-plus</v-icon>
              </v-btn>
            </v-row>
          </v-col>
          <v-col :cols="6">
            <v-row>
              <v-btn @click="toggleMute" :color="store.isMuted ? 'grey' : 'primary'" icon class="ma-2">
                <v-icon>{{ store.isMuted ? 'mdi-microphone-off' : 'mdi-microphone' }}</v-icon>
              </v-btn>
              <v-btn @click="toggleCamera" :color="store.isCameraOff ? 'grey' : 'primary'" icon class="ma-2">
                <v-icon>{{ store.isCameraOff ? 'mdi-video-off' : 'mdi-video' }}</v-icon>
              </v-btn>
              <v-btn @click="toggleScreenShare" :color="!store.isScreenSharing ? 'primary' : 'grey'" icon class="ma-2">
                <v-icon> {{ !store.isScreenSharing ? 'mdi-monitor-share' : 'mdi-monitor-off' }} </v-icon>
              </v-btn>
              <v-btn @click="hangUp" icon="mdi-phone-hangup" density="default" color="red" class="ma-2">
              </v-btn>
            </v-row>
          </v-col>
      </v-row>
      </div>
      <div class="list-container pa-6" :class="{ 'chat-with-video': store.getVideoCallStatus && userVideoLoaded }">
        <div class="messages" ref="messageContainer">
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
import { isOnlyAudioCall } from '@/utils/tracks';
import { getCameraResolutions } from "@/utils/camera";
import { remove } from 'firebase/database';

const props = defineProps({
  selectedFriend: String,
})
const store = useAppStore()
const audioCall = ref(false)
const maxVolume = 100;
const minVolume = 0;
const volumeStep = 1;
const buttomVolumeStep = 10;
const remoteAudioElement = ref<HTMLAudioElement | null>(null);
const isVolumeMuted = ref(false); // necessary because vue do not listen for DOM changes
const messageContainer = ref<HTMLElement | null>(null);
function getFriendUid(friend) {
  return friend && 'uid' in friend ? friend.uid : null;
}


const { selectedFriend } = toRefs(props);

const audioVolume = ref(100)
const forceUpdateTrigger = ref(0);


// TODO: O status de "Em chamada" é global. Então, quando troca de usuário, o vídeo vai permanecer na tela. Mudar esse estado para estar atrelado ao usuário selecionado.'
watch(() => store.friends.dict[store.activeFriend.uid]?.status, (newStatus) => {
  const activeFriend = store.activeFriend.uid;
  console.log('watching friendsDict', activeFriend);

  if (store.isConnectionCreatedForActiveFriend()) {
    console.log('[connection] Peer already exists');
    return;
  }

  if (newStatus == 'online') {
    console.log('[connection] Friend is now online. Creating WebRtConnection');
    createSimplePeerForActiveFriend();
  } else {
    console.log('Friend is still offline');
  }
})

watch(() => audioVolume.value, (newVal, oldVal) => {
  console.log('changed my friend: ', newVal);
  applyAudioVolume();
})

watch(() => {
  const uid = getFriendUid(store.activeFriend);
  return uid ? store.friends.dict[uid]?.status : null;
}, (newStatus) => {
  const activeFriendUid = getFriendUid(store.activeFriend);
  console.log('watching friendsDict', activeFriendUid);
})

watch(() => store.getMessages(selectedFriend.value), (newMessages, oldMessages) => {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
  });
}, { deep: true }); // Use deep watch if messages are objects and their properties might change



function createSimplePeerForActiveFriend() {
  if(store.isConnectionCreatedForActiveFriend()) {
    return;
  }
  // store.setCallInactive();
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
    store.setActiveFriendAsConnected();
  })

  peer.on('data', async (data) => {
    const message = JSON.parse(data);

    if (message.type === 'message') {
      let friend = store.friends.list.find(friend => friend.data.uid === currentFriendId);
      store.addReceivedMessage(message.data, friend.data.displayName);
    } else if (message.type === 'callAccepted') {
      store.setPopUpCallingAsInactive();
      store.acceptCall();
      await store.addStreamToPeerConnection(currentFriend, message.data.callType);
      if (message.data.callType === 'audio') {
        store.toggleCallasOnlyAudio(true);
        store.toggleCameraOff(true);
      }
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
    } else if (message.type === 'video-status') {
      if (message.enabled === false) {
        store.toggleCallasOnlyAudio(true)
        store.eventQueue.push({
          type: "removeStream",
          data: {
            type: 'video',
            userCalling: store.friends.dict[store.currentCallInfo.friend.uid].data,
          },
        });
      }
    } else if (message.type === 'audio-status') {
      if (message.enabled === false) {
        store.eventQueue.push({
          type: "removeStream",
          data: {
            type: 'audio',
            userCalling: store.friends.dict[store.currentCallInfo.friend.uid].data,
          },
        });
      }
    }

    console.log("data", message)
  })
  peer.on('close', (data) => {
    store.peers[currentFriendId].destroy();
    delete store.peers[currentFriendId];
    console.log('close: ', data)
    if (currentFriend == store.currentCallInfo.friend.uid) {
      removeStream(currentFriendId, 'both');
      store.setCallInactive();
      freeCam();
    }
  })
  peer.on('error', (data) => {
    console.log('error', data)
  })
  peer.on('stream', (stream) => {
    store.toggleCallasOnlyAudio(isOnlyAudioCall(stream))
  })

  peer.on('track', (track, stream) => {
    addTrack(track, store.currentCallInfo.friend.uid);

  })
}

onBeforeUnmount(() => {
  console.log('Unmounting');
})

const message = ref();
const userVideoLoaded = ref(false);

async function toggleMute() {
  const peer = store.peers[store.currentCallInfo.friend.uid];
  const audioTracks = store.mediaStream.getAudioTracks();
  const isAudioEnabled = audioTracks.some(track => track.readyState === 'live');

  if (!isAudioEnabled) {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });

    const newTrack = newStream.getAudioTracks()[0];
    store.mediaStream.addTrack(newTrack);
    peer.addTrack(newTrack, store.mediaStream);
    peer.send(JSON.stringify({ type: 'audio-status', enabled: true }));
    store.isMuted = false;
  } else {
    console.log('[toggle] Desligando audio', audioTracks);
    audioTracks.forEach((track) => {
      console.log('[toggle] trabalhando com essa:: ', track);
      if (track.readyState === 'ended') {
        store.mediaStream.removeTrack(track);
        peer.removeTrack(track, store.mediaStream);
      } else if (track.readyState === 'live') {
        track.stop();
      }

    })

    peer.send(JSON.stringify({ type: 'audio-status', enabled: false }));
    store.isMuted = true;
  }
}

async function toggleCamera() {
  const peer = store.peers[store.currentCallInfo.friend.uid];
  const videoTracks = store.mediaStream.getVideoTracks();
  const isVideoEnabled = videoTracks.some(track => track.readyState === 'live') && !store.isCameraOff;
  const isScreenSharingEnabled =  videoTracks.some(track => track.readyState === 'live') && store.isScreenSharing;
  console.log('[screen] but camera results: ', isVideoEnabled, isScreenSharingEnabled)
  if (isScreenSharingEnabled) {
    await toggleScreenShare();
  }

  if (!isVideoEnabled) {
    const higherResolutions = await getCameraResolutions();
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: higherResolutions[0].resolutions.width,
        height: higherResolutions[0].resolutions.height,
        facingMode: "user",
      },
      audio: false, // você já tem áudio da chamada anterior
    });

    const newTrack = newStream.getVideoTracks()[0];
    // store.mediaStream.addTrack(newTrack)
    // Realiza o replace
    store.mediaStream.addTrack(newTrack);
    peer.addTrack(newTrack, store.mediaStream);

    peer.send(JSON.stringify({ type: 'video-status', enabled: true }));

    store.isCameraOff = false;
  } else {
    videoTracks.forEach((track) => {
      if (track.readyState === 'ended') {
        store.mediaStream.removeTrack(track);
        peer.removeTrack(track, store.mediaStream);
      } else if (track.readyState === 'live') {
        track.stop();
      }

    })


    peer.send(JSON.stringify({ type: 'video-status', enabled: false }));
    store.isCameraOff = true;

  }
}


function sendNewMessage() {
  if (!message.value) return
  if (store.activeFriend.uid in store.peers) {
    store.addMessage(message.value, store.activeFriend)
    message.value = ''
  }
}

const addTrack = (track, userId) => {
  if (!track) return;
  const videoContainer = document.getElementById("videos");

  // Cria uma MediaStream com a track individual
  const stream = new MediaStream([track]);

  if (track.kind === 'audio') {
    const audioElement = document.createElement('audio');
    audioElement.autoplay = true;
    audioElement.srcObject = stream;
    audioElement.id = `${userId}-audio`;
    audioElement.style.display = 'none'; // invisível
    videoContainer.appendChild(audioElement);

    remoteAudioElement.value = audioElement;

  } else if (track.kind === 'video') {
    const videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', 'true');
    videoElement.autoplay = true;
    videoElement.srcObject = stream;
    videoElement.id = `${userId}-video`;
    videoElement.className = 'video-element';
    videoElement.style.maxWidth = "100%";
    videoElement.style.maxHeight = "100%";
    videoElement.style.objectFit = "cover";
    videoElement.style.width = "100%";
    videoElement.style.height = "100%";
    videoElement.style.margin = "0 auto";

    videoElement.onloadedmetadata = () => {
      videoElement.play();
    };

    videoContainer.appendChild(videoElement);
    store.toggleCallasOnlyAudio(false);
  }
  userVideoLoaded.value = true;
};


const removeStream = (userId, kind='both') => {
  try {
    const videoContainer = document.getElementById("videos")
    if (kind === 'video' || kind === 'both') {
      try {
        const videoElement = document.getElementById(`${userId}-video`)
        const videoTracks = videoElement.srcObject.getVideoTracks()
        videoTracks.forEach(t => t.stop())
        videoElement.srcObject = null
        videoContainer.removeChild(videoElement)
        forceUpdateTrigger.value++;
      } catch (e) {
        console.error('[removeStream] erro ao remover track de video', e);
      }
    }
    if (kind === 'audio' || kind === 'both') {
      try {
        const audioElement = document.getElementById(`${userId}-audio`)
        const audioTracks = audioElement.srcObject.getAudioTracks()
        audioTracks.forEach(t => t.stop())
        audioElement.srcObject = null
        videoContainer.removeChild(audioElement)
        forceUpdateTrigger.value++;
      } catch (e) {
        console.error('[removeStream] erro ao remover track de audio', e);
      }
    }


  } catch (e) {
    console.error("Error removing stream ", e)
  }
};






function freeCam() {
  if (store.mediaStream) {
    store.mediaStream.getTracks().forEach(track => {
      track.stop();
    });
    store.mediaStream = null;

    store.isMuted = false;
    store.isCameraOff = false;
  }
}

async function friendHungUp(friend) {
  freeCam();
  store.setCallInactive();
  store.setPopUpCallingAsInactive();
  userVideoLoaded.value = false;
  store.callRejected();
}

async function hangUp() {
  freeCam();
  store.setCallInactive();
  userVideoLoaded.value = false;
  store.setPopUpCallingAsInactive();
  store.rejectCall(store.activeFriend);
}
function changeVolume(operation: '+' | '-') {
  if (operation === '+') {
    if (audioVolume.value < 100) {
      audioVolume.value += buttomVolumeStep;
    }
  } else if (operation === '-' ) {
    if (audioVolume.value > 0) {
      audioVolume.value -= buttomVolumeStep;
    }
  }
  applyAudioVolume();
}

function applyAudioVolume(): void {
  if (remoteAudioElement.value) {
    const newVolumeValue = audioVolume.value / 100;
    if (newVolumeValue === 0) {
      isVolumeMuted.value = remoteAudioElement.value.muted = true;
    } if (newVolumeValue > remoteAudioElement.value.volume) {
      isVolumeMuted.value = remoteAudioElement.value.muted = false;
    }
    remoteAudioElement.value.volume = newVolumeValue;
  }
}

function toggleVolumeMute(): void {
  isVolumeMuted.value = remoteAudioElement.value.muted = !remoteAudioElement.value.muted;
}

async function toggleScreenShare() {
  const peer = store.peers[store.currentCallInfo.friend.uid];
  const videoTracks = store.mediaStream.getVideoTracks();
  const isVideoEnabled = videoTracks.some(track => track.readyState === 'live') && !store.isCameraOff;
  const isScreenSharingEnabled =  videoTracks.some(track => track.readyState === 'live') && store.isScreenSharing;


  if (isVideoEnabled) {
    await toggleCamera();
  }

  if (!isScreenSharingEnabled) {
    const newStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    });

    const newTrack = newStream.getVideoTracks()[0];
    store.mediaStream.addTrack(newTrack);
    peer.addTrack(newTrack, store.mediaStream);

    peer.send(JSON.stringify({ type: 'video-status', enabled: true }));
    store.toggleScreenSharing(true);

  } else {
    videoTracks.forEach((track) => {
      if (track.readyState === 'ended') {
        store.mediaStream.removeTrack(track);
        peer.removeTrack(track, store.mediaStream);
      } else if (track.readyState === 'live') {
        track.stop();
      }
    })

    peer.send(JSON.stringify({ type: 'video-status', enabled: false }));
    store.toggleScreenSharing(false);
  }
}

function cleanupVideoElements() {
  console.log("Thoroughly cleaning up ALL video elements");
  const videoContainer = document.getElementById("videos");
  if (videoContainer) {
    console.log(`Video container has ${videoContainer.childNodes.length} children before cleanup`);
    const videoElements = videoContainer.querySelectorAll('video');
    videoElements.forEach(video => {
      if (video.srcObject) {
        try {
          const tracks = video.srcObject.getTracks();
          if (tracks) {
            tracks.forEach(track => {
              track.stop();
              console.log(`Stopped track: ${track.kind}`);
            });
          }
          video.srcObject = null;
          video.pause();
        } catch (e) {
          console.error("Error stopping tracks", e);
        }
      }
    });
    while (videoContainer.firstChild) {
      videoContainer.removeChild(videoContainer.firstChild);
    }
    console.log(`Video container has ${videoContainer.childNodes.length} children after cleanup`);
  }
}

defineExpose({
  addTrack,
  removeStream,
  friendHungUp,
  createSimplePeerForActiveFriend
})

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
  height: calc(80vh);
  overflow: hidden;
  position: relative;
  padding-bottom: 80px;
  margin-bottom: 50px;
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

.audio-avatar {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

</style>
