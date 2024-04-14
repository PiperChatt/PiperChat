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
            v-for="(item, i) in items"
            :key="i"
            :value="item"
            @click="(event) => setItem(item.name)"
            prepend-avatar="https://cdn.vuetifyjs.com/images/john.png"
          >
            <v-list-item-title v-text="item.name"></v-list-item-title>
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
    </v-layout>
  </v-app>
</template>

<script setup>
import DefaultBar from './AppBar.vue'
import DefaultView from './View.vue'
import {ref} from 'vue'
import { useAppStore } from '../../store/app';


const store = useAppStore();

function setItem(item) {
  selectedItem.value = item
}

const selectedItem = ref("");

let items = [
        { name: 'Gedor'},
        { name: 'Camila'},
        { name: 'Anderson'},
        { name: 'Dorini'}
      ]

</script>

<style scoped>
.main-drawer {
  background-color: #2c2d31;
}

/* Create a class that position the myUser at the bottom of the .main-drawer */
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

</style>
