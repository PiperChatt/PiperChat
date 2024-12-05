<template>
  <v-main>
    <v-container class="fill-height pa-0">
      <v-row v-if="store.getVideoCallStatus" class="video-container">
        <v-col :cols="12" style="background-color: black;">
          <v-progress-circular v-if="!userVideoLoaded" class="ma-8" color="primary" indeterminate :size="68"
            :width="6" />
          <div id="videos">
          </div>
          <v-btn v-if="userVideoLoaded" @click="hangUp" icon="mdi-phone-hangup" density="default" color="red"
            class="ma-3">
          </v-btn>
        </v-col>
      </v-row>
      <div class="list-container ma-3">
        <v-text-field v-if="selectedFriend" class="inputBox" label="Type a message" single-line hide-details
          @keyup.enter="sendNewMessage" rounded dense solo append-icon="" v-model="message"></v-text-field>
        <div v-for="(chatMessage, i) in store.getMessages(selectedFriend).slice().reverse()" :key="chatMessage">
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
  return store.activeFriend.uid in store.peers;
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
      console.log("CALL");
      store.eventQueue.push({
        type: "startCall",
        data: {
          userCalling: store.friends.dict[currentFriendId].data,
          callType: message.data.callType
        },
      });
      await store.getMediaStream(message.type.callType);
    }

    console.log("data", message)
  })
  peer.on('close', (data) => {
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
  console.log(store.getVideoCallStatus);

  const videoContainer = document.getElementById("videos")
  const videoElement = document.createElement('video')
  videoElement.setAttribute('controls', true);
  videoElement.autoplay = true
  videoElement.muted = true
  videoElement.srcObject = stream
  videoElement.id = `${userId}-video`
  
  // Adiciona estilos para ocupar o máximo de espaço do v-col
  videoElement.style.width = "100%";
  videoElement.style.height = "100%";
  videoElement.style.objectFit = "cover"; // Preenche o espaço sem distorção

  videoElement.onloadedmetadata = () => {
    videoElement.play()
  }
  videoContainer.appendChild(videoElement)
  userVideoLoaded.value = true;
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
