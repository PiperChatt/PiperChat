<template>
  <v-app :full-height="true" ref="app">
    <v-layout>
      <v-navigation-drawer permanent class="main-drawer" floating name="drawer" width="240">
        <v-list
          :lines="false"
          density="compact"
          nav
        >
          <v-list-item
            v-for="(item, i) in store.getFriends"
            :key="i"
            :value="item"
            @click="(event) => setItem(item)"
            prepend-avatar="https://cdn.vuetifyjs.com/images/john.png"
          >
            <v-list-item-title v-text="item.Name"></v-list-item-title>
          </v-list-item>
        </v-list>
        <v-list
          :lines="false"
          class="MyUser"
          density="compact"
          nav
        >
          <v-list-item
            :prepend-avatar="store.currentUser.avatar"
          >
            <v-list-item-title v-text="store.currentUser.userName"></v-list-item-title>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>
      <default-bar />
      <default-view :selectedItem="selectedItem" />
      <!-- Starting call dialog -->
      <v-dialog v-model="store.isCalling" max-width="500">
        <v-card title="Calling">
          <v-row class="pa-6">
            <v-col align="center">
              <div class="pulse">
                <v-avatar size="70">
                  <v-img :src="store.activeFriend.avatar" />
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
      <v-dialog v-model="incommingCall" max-width="500">
        <v-card>
          <v-card-title>
            Call from {{ store.incommingCallInfo?.userCalling?.displayName }}
          </v-card-title>
          <v-row class="pa-6">
            <v-col align="center">
              <div class="pulse">
                <v-avatar size="70">
                  <v-img :src="store.incommingCallInfo?.userCalling?.photoURL" />
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

<script setup>
import DefaultBar from './AppBar.vue'
import DefaultView from './View.vue'
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/store/app';
import { dismissInitiatedCall, watchIncommingCall, dismissIncommingCall, acceptCall } from '@/scripts/callAPI';




const selectedItem = ref("");
const incommingCall = ref(false);
const store = useAppStore();

onMounted(() => {
  console.log("[Default] Componente montado!");
  watchIncommingCall(onRinging)
});

function onRinging(call) {
  if (call) {
    incommingCall.value = true;
  } else {
    incommingCall.value = false;
  }
}

function hangUpCall() {
  incommingCall.value = false;
  dismissIncommingCall(false);
}

function onAcceptCallClick() {
  store.isInCall = true;
  incommingCall.value = false;
  dismissIncommingCall(true);
  acceptCall();

}

function setItem(item) {
  store.setActiveFriend(item)
  selectedItem.value = item.Name
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

.pulse::after {
  animation-delay: 1s;
}
</style>
