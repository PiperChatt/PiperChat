<template>
  <v-container fill-height fluid class="container">
    <v-col :cols="12" class="d-flex flex-column align-center justify-center h-100">
      <template v-if="!register">
        <v-card width="80%" class="align-center justify-center">
          <v-card-title>Login</v-card-title>
          <v-card-text>
            <v-text-field v-model="email" placeholder="Login" prepend-inner-icon="mdi-email-outline" variant="outlined"
              density="compact" />
            <v-text-field v-model="password" placeholder="Passoword" :type="passwordVisible ? 'text' : 'password'"
              :append-inner-icon="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="passwordVisible = !passwordVisible" prepend-inner-icon="mdi-lock-outline"
              variant="outlined" density="compact" />
            <div v-if="errorOnLoginAttempt" class="error-message">
              <span>{{ errorMessage }}</span>
            </div>
          </v-card-text>
          <v-card-actions class="tw-flex tw-flex-col align-center justify-center tw-gap-y-2">
            <v-btn @click="doLogin" block color="primary" variant="flat" :loading="loginInProgress">Login</v-btn>
            <v-btn class="!tw-m-0" @click="() => register = true" block color="primary" variant="flat">Register</v-btn>
          </v-card-actions>
        </v-card>
      </template>

      <template v-else>
        <Register></Register>
      </template>
    </v-col>
  </v-container>
</template>

<script setup>
import { auth } from '@/firebase';
import { signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, onMounted } from 'vue';
import { useAppStore } from '@/store/app'
import Register from './Register'
import { addUser, getProfilePhoto } from '@/firebase/userHelper';

const apppStore = useAppStore()

const email = ref('');
const password = ref('');

const errorMessage = ref('');
const errorOnLoginAttempt = ref('');
const passwordVisible = ref('');
const loginInProgress = ref('');
const register = ref(false);

onMounted(() => {
  console.log("[Login] Componente montado!");
  errorOnLoginAttempt.value = false
  errorMessage.value = ""
  passwordVisible.value = false
  loginInProgress.value = false
});


const doLogin = async () => {
  loginInProgress.value = true

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
    await updateProfileOnRegister(userCredential.user);
    await addUser(userCredential.user);
    let user = userCredential.user;
    console.log("[Login] Usuário logado:", user);
    console.log(auth.currentUser)
    apppStore.login(user);
    loginInProgress.value = false
  } catch (error) {
    console.log("Erro no login:", error.code, error.message);
    if (error.code == "auth/invalid-email" || error.code == "auth/invalid-login-credentials") {
      errorOnLoginAttempt.value = true
      errorMessage.value = "Login ou senha incorretos"
    }
    loginInProgress.value = false
    apppStore.logoff();
  }
}

async function updateProfileOnRegister(user) {
  try {
    await updateProfile(user, { displayName: user.displayName ?? user.email.split("@")[0], photoURL: getProfilePhoto(user.photoURL, user.displayName, user.email) })
  } catch (error) {
    console.log("User created but failed to updateProfile.", error);
  }
}

</script>
<style>
.container {
  height: 100vh;
}

.error-message {
  color: red !important;
  font-weight: 400;
}
</style>
