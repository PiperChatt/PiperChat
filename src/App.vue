<template>
  <Login v-if="!apppStore.isLogged" />
  <router-view v-else />
</template>

<script setup>
import { auth } from '@/firebase';
import { useAppStore } from '@/store/app'
import Login from './views/Login/Login.vue'
import { onAuthStateChanged } from "firebase/auth";
import { ref, onMounted } from 'vue';


const apppStore = useAppStore()
console.log('app.vue')
onMounted(() => {
  console.log("Componente montado!",);

  if (auth.currentUser) {
    console.log("Usuário está logado:", auth.currentUser);
    apppStore.login(auth.currentUser);
  } else {
    console.log("Usuário não está logado.");
    apppStore.logoff();
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("[onAuthStateChanged] Usuário está logado:", user, apppStore.isLogged, apppStore.currentUser);
    apppStore.login(user);
  } else {
    console.log("[onAuthStateChanged] Usuário não está logado.");
    apppStore.logoff();
  }
});

</script>
