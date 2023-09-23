<template>
  <span>{{ email }}</span>
  <v-text-field v-model="email" placeholder="Login"/>
  <v-text-field v-model="password" placeholder="Passoword"/>
  <v-btn @click="doLogin" >Login</v-btn>
</template>

<script setup>
import {auth} from '@/firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, onMounted  } from 'vue';
import { useAppStore } from '@/store/app'

const apppStore = useAppStore()

const email = ref('');
const password = ref('');

onMounted(() => {
  console.log("Componente montado!");
});


const doLogin = async () => {
  console.log('ola amigo', email, password, auth.currentUser);
  signInWithEmailAndPassword(auth, "gedor.silvaneto@gmail.com"/*email.value*/, "teste123"/*password.value*/).then((userCredential) => {
    var user = userCredential.user;
    console.log("Usuário logado:", user);
    console.log(auth.currentUser)
    apppStore.setCurrentUser(user);
    apppStore.setIsLogged(true);

  }).catch((error) => {
     var errorCode = error.code;
      var errorMessage = error.message;
      console.log("Erro no login:", errorCode, errorMessage);
      apppStore.setCurrentUser({});
      apppStore.setIsLogged(false);
  })
}

</script>
