<template>
  <v-main>
    <v-container class="fill-height">
      <div class="list-container fill-height">
        <v-text-field v-if="selectedItem" class="inputBox" label="Type a message" single-line hide-details
          @keyup.enter="sendNewMessage" rounded dense solo append-icon="" v-model="message"></v-text-field>
        <div v-for="(chatMessage, i) in store.getMessages(selectedItem).slice().reverse()" :key="chatMessage">
          <div class="userMessage tw-flex" v-if="('Me' in chatMessage)">
            <v-avatar :image="store.currentUser.avatar" size="45"></v-avatar>
            <div class="tw-flex tw-flex-col">
              <span class="tw-font-bold">{{ store.currentUser.userName }}</span>
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

<script setup>

import { useAppStore } from '../../store/app';
import { ref } from 'vue'
import { defineProps, reactive, toRefs } from "vue";

const props = defineProps({
  selectedItem: String,
})

const { selectedItem } = toRefs(props);

const message = ref();

function sendNewMessage() {
  if (!message.value) return
  store.addMessage(message.value, selectedItem.value)
  message.value = ''
}

const store = useAppStore()

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
}
</style>
