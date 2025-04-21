<template>
  <v-app-bar density="compact" order="-1">
    <div class="main-search tw-flex tw-row-auto tw-grow tw-justify-center tw-h-full">
      <v-text-field class="inputBox" label="Find a friend" single-line hide-details v-model="query"
        @keyup.enter="executeQuery" dense solo></v-text-field>
    </div>
    <div class="tw-flex tw-justify-between tw-flex-grow">

      <div class="tw-ml-2">
        <div v-if="!store.activeFriend.displayName" class="tw-flex">
          <h2 class="tw-pl-5">Amigos</h2>
          <v-divider vertical class="tw-pl-5"></v-divider>
        </div>

        <div v-else class="userMessage tw-flex">
          <v-avatar :image="store.activeFriend.avatar" size="30"></v-avatar>
          <div class="tw-flex tw-flex-col">
            <span class="tw-font-bold tw-ml-2 tw-mt-1">{{ store.activeFriend.displayName }}</span>
          </div>
          <v-divider vertical class="tw-pl-5"></v-divider>
        </div>
      </div>

      <div v-if="store.activeFriend.displayName" class="tw-flex">
        <v-icon @click="initiateAudioCall" size="28" class="tw-mr-5" icon="mdi-phone-in-talk"></v-icon>
        <v-icon @click="initiateVideoCall" size="28" class="tw-mr-5" icon="mdi-video"></v-icon>
      </div>
    </div>
  </v-app-bar>
</template>

<script setup>
import { useLayout } from 'vuetify'
import { useAppStore } from '@/store/app';
import { ref } from 'vue'
import { startVideoCall, startAudioCall } from '@/scripts/callAPI';

const query = ref();

const store = useAppStore();
const emit = defineEmits(['force-friend-connect']);

const callUnsubscribeVar = null;

function executeQuery() {
  store.setQuery(query.value)
}

function initiateVideoCall() {
  store.setActiveCall(store.activeFriend);
  const isFriendConnected = store.activeFrindIsConnected();
  if (isFriendConnected) {
    startVideoCall(store.activeFriend);
  } else {
    let connectionAttempts = 0;
    const connectionAwaiterControl = setInterval(() => {
      connectionAttempts += 1;
      emit('force-friend-connect');
      if (store.activeFrindIsConnected(true)) {
        clearInterval(connectionAwaiterControl);
        startVideoCall(store.activeFriend);
      } else if (connectionAttempts === 3) {
        console.error('Video call not possible');
        store.setCurrentCallAsInactive();
        clearInterval(connectionAwaiterControl);
      }
    }, 1000)
  }
}

function initiateAudioCall() {
  store.setActiveCall(store.activeFriend);
  const isFriendConnected = store.activeFrindIsConnected();
  if (isFriendConnected) {
    startAudioCall(store.activeFriend);
  } else {
    let connectionAttempts = 0;
    const connectionAwaiterControl = setInterval(() => {
      connectionAttempts += 1;
      emit('force-friend-connect');
      if (store.activeFrindIsConnected(true)) {
        clearInterval(connectionAwaiterControl);
        startAudioCall(store.activeFriend);
      } else if (connectionAttempts === 3) {
        console.error('Audio call not possible');
        store.setCurrentCallAsInactive();
        clearInterval(connectionAwaiterControl);
      }
    }, 1000)
  }
}

</script>


<style>
.v-app-bar {
  box-shadow: 0 1px 0 hsl(0 calc(1*0%) 0.8%/0.2), 0 1.5px 0 hsl(240 calc(1*7.7%) 2.5%/0.05), 0 2px 0 hsl(0 calc(1*0%) 0.8%/0.05) !important;
}

.main-search {
  max-width: 240px !important;
  background-color: #2c2d31 !important;
}
</style>
//1e1f22
