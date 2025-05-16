<template>
  <v-app :full-height="true" ref="app" style="overflow-y: hidden !important;">
    <v-layout>
      <v-navigation-drawer permanent class="main-drawer" floating name="drawer" width="240">
        <v-list :lines="false" density="compact" nav>
          <v-dialog max-width="500">
            <template v-slot:activator="{ props: activatorProps }">
              <v-list-item v-bind="activatorProps">
                <div class="tw-flex tw-flex-row tw-justify-between v-list-item-title">
                  <span>Adicionar amigo</span>
                  <v-icon size="18" icon="mdi-account-plus"></v-icon>
                </div>
              </v-list-item>
            </template>

            <template v-slot:default="{ isActive }">
              <v-card title="Adicionar amigo">
                <v-card-text>
                  <v-text-field v-model="email" placeholder="Email" prepend-inner-icon="mdi-email-outline"
                    variant="outlined" density="compact" />
                </v-card-text>

                <v-card-actions>
                  <v-spacer></v-spacer>

                  <v-btn text="Enviar pedido de amizade" @click="tryAddFriend(isActive)"></v-btn>
                </v-card-actions>
              </v-card>
            </template>
          </v-dialog>


          <v-list-item v-for="(friend, i) in store.getFriends" :key="i" :value="friend"
            @click="(event) => setActiveFriend(friend.data)">
            <template v-slot:prepend>
              <div class="avatar-wrapper">
                <v-avatar>
                  <v-img :src="friend.data.photoURL" />
                </v-avatar>
                <div :class="['status-indicator', friend.status]"></div>
              </div>
            </template>
            <v-list-item-title class="tw-ml-1" v-text="friend.data.displayName"></v-list-item-title>
            <template v-slot:append v-if="store.friends.unreadMessages[friend.data.uid]">
              <v-icon color="#32b6e6" icon="mdi mdi-brightness-1" size="small"></v-icon>
            </template>
          </v-list-item>
        </v-list>
        <v-list :lines="false" class="MyUser" density="compact" nav>
          <v-list-item :prepend-avatar="store.currentUser.photoURL">
            <div class="tw-flex tw-flex-row tw-justify-between v-list-item-title">
              <span>{{ store.currentUser.displayName }}</span>
              <v-icon @click="signOut" size="18" icon="mdi-logout"></v-icon>
            </div>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>
      <default-bar @force-friend-connect="handleForceFriendConnect"/>
      <default-view ref="friendView" :selectedFriend="selectedFriend" />
      <!-- Starting call dialog -->
      <v-dialog v-model="store.isPopUpCallActive" max-width="500">
        <v-card title="Calling">
          <v-row class="pa-6">
            <v-col align="center">
              <div class="pulse">
                <v-avatar size="70">
                  <v-img :src="store.activeFriend.photoURL" />
                </v-avatar>
              </div>
            </v-col>
          </v-row>
          <v-col>
            <v-btn @click="dismissInitiatedCall" color="red" block>
              <v-icon size="x-large">mdi-phone-cancel</v-icon>
            </v-btn>
          </v-col>
        </v-card>
      </v-dialog>
      <!-- Icomming call dialog -->
      <v-dialog v-model="incommingCall.active" max-width="500">
        <v-card>
          <v-card-title>
            Call from {{ incommingCall.userCalling?.displayName }}
          </v-card-title>
          <v-row class="pa-6">
            <v-col align="center">
              <div class="pulse">
                <v-avatar size="70">
                  <v-img :src="incommingCall?.userCalling?.photoURL" />
                </v-avatar>
              </div>
            </v-col>
          </v-row>
          <v-col>
            <v-btn @click="onAcceptCallClick" color="green" block>
              <v-icon size="x-large">mdi-phone-check</v-icon>
            </v-btn>
            <v-btn @click="hangUpCall" color="red" block class="mt-3">
              <v-icon size="x-large">mdi-phone-cancel</v-icon>
            </v-btn>
          </v-col>
        </v-card>
      </v-dialog>
    </v-layout>
  </v-app>
</template>

<script async setup>
import { auth } from '@/firebase';
import { getFriendsList, listenForNewFriends } from '@/firebase/userHelper';
import DefaultBar from './AppBar.vue'
import DefaultView from './View.vue'
import { addFriend } from '@/firebase/userHelper';
import { ref, onMounted, watch } from 'vue'
import { useAppStore } from '@/store/app';

const selectedFriend = ref("");
const incommingCall = ref({
  active: false,
  userCalling: null,
  callType: null
});
const store = useAppStore();

const email = ref('');
const friendView = ref(null);

if (!store.isEventActive("friends")) {
  listenForNewFriends(auth.currentUser.uid, store);
}

async function tryAddFriend(isActive) {
  let result = await addFriend(auth.currentUser.uid, email.value);
  if (result.success) {
    console.log("Friend request sent");
  } else {
    console.log("Error while sending friend request", result.message);
  }

  isActive.value = false;
}

async function dismissInitiatedCall() {
  store.setCallInactive();
  store.setPopUpCallingAsInactive();
  store.rejectCall(store.activeFriend);
}

watch(() => store.eventQueue[0], (event) => {
  console.log("Event queue", event);

  if (event) {
    if (event.type == "startCall") {
      newCall(event.data);
    } else if (event.type == "stream") {
      console.log(friendView.value);

      friendView.value.addTrack(event.data.stream, event.data.userCalling.uid);
    } else if (event.type == 'removeStream') {
      friendView.value.removeStream( event.data.userCalling.uid, event.data.type);

    } else if (event.type == 'callRejected') {
      incommingCall.value = {
        active: false,
        userCalling: null,
        callType: null
      }

      friendView.value.friendHungUp(event.data.userCalling);
    }

    store.eventQueue.shift();
  }
});

function newCall(callData) {
  incommingCall.value = {
    active: true,
    userCalling: callData.userCalling,
    callType: callData.callType
  }

  store.sounds.call.play();
}

// onMounted(() => {
//   console.log("[Default] Componente montado!");
//   watchIncommingCall(onRinging)
// });

function hangUpCall() {
  store.rejectCall(incommingCall.value.userCalling);
  incommingCall.value = {
    active: false,
    userCalling: null,
    callType: null
  };
}

async function onAcceptCallClick() {
  const userCalling = incommingCall.value.userCalling;
  const callType = incommingCall.value.callType;
  setActiveFriend(userCalling);
  store.setActiveCall(userCalling)
  store.addStreamToPeerConnection(userCalling, callType);
  store.peers[userCalling.uid].send(JSON.stringify({ type: 'callAccepted', data: { callType } }));
  store.setPopUpCallingAsInactive();
  store.acceptCall();
  if (callType === 'audio') {
    store.toggleCallasOnlyAudio(true);
    store.toggleCameraOff(true);
  }
  incommingCall.value = {
    active: false,
    userCalling: null,
    callType: null
  };
}

function setActiveFriend(friend) {
  store.setActiveFriend(friend)
  selectedFriend.value = friend.displayName
}

async function signOut() {
  try {
    await auth.signOut();
    store.logoff();
    console.log("successfuly signed out.")
  } catch (error) {
    console.log("Error while signing out");
  }
}

function handleForceFriendConnect() {
  friendView.value.createSimplePeerForActiveFriend();
}

</script>

<style scoped>
.main-drawer {
  background-color: #2c2d31;
}

.MyUser {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px;
  background-color: #2c2d31;
  color: white;
  text-align: center;
}

/* CSS para o efeito de pulso */
.pulse {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 70px;
  border-radius: 50%;
}

.pulse::before,
.pulse::after {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: #4062eb;
  border-radius: 50%;
  z-index: -1;
  opacity: .4;
  animation: pulse 2s ease-out infinite
}

@keyframes pulse {
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
}

.status-indicator.online {
  background-color: #43b581;
  /* Green for online */
}

.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border: 2px solid white;
  border-radius: 50%;
}

.status-indicator.offline {
  background-color: #747f8d;
  /* Gray for offline */
}

.pulse::after {
  animation-delay: 1s;
}
</style>
