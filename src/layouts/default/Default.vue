<template>
  <v-app :full-height="true" ref="app">
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


          <v-list-item v-for="(item, i) in store.getFriends" :key="i" :value="item" @click="(event) => setItem(item)"
            :prepend-avatar="item.photoURL">
            <v-list-item-title v-text="item.displayName"></v-list-item-title>
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
      <default-bar />
      <default-view :selectedItem="selectedItem" />

    </v-layout>
  </v-app>
</template>

<script async setup>
import { auth } from '@/firebase';
import { getFriendsList, listenForNewFriends } from '@/firebase/userHelper';
import DefaultBar from './AppBar.vue'
import DefaultView from './View.vue'
import { addFriend } from '@/firebase/userHelper';
import { ref } from 'vue'
import { useAppStore } from '../../store/app';


const store = useAppStore();

const email = ref('');

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

function setItem(item) {
  store.setActiveFriend(item)
  selectedItem.value = item.displayName
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

const selectedItem = ref("");

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
</style>
