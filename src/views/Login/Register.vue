<template>
  <v-card width="80%" class="align-center justify-center">
    <v-card-text>
      <v-card-title>Register</v-card-title>
      <v-text-field v-model="name" placeholder="Name" prepend-inner-icon="mdi-email-outline" variant="outlined"
        density="compact" />
      <v-text-field v-model="email" placeholder="Login" prepend-inner-icon="mdi-email-outline" variant="outlined"
        density="compact" />
      <v-text-field v-model="password" placeholder="Passoword" :type="passwordVisible ? 'text' : 'password'"
        :append-inner-icon="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'"
        @click:append-inner="passwordVisible = !passwordVisible" prepend-inner-icon="mdi-lock-outline"
        variant="outlined" density="compact" />
      <v-text-field v-model="photoUrl" placeholder="Photo URL" prepend-inner-icon="mdi-email-outline" variant="outlined"
        density="compact" />
      <div v-if="errorOnRegisterAttempt" class="error-message">
        <span>{{ errorMessage }}</span>
      </div>
    </v-card-text>
    <v-card-actions class="tw-flex tw-flex-col align-center justify-center tw-gap-y-2">
      <v-btn class="!tw-m-0" @click="doRegister" block color="primary" variant="flat"
        :loading="registerProgress">Register</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { auth } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, onMounted } from 'vue';
import { useAppStore } from '@/store/app'

const apppStore = useAppStore()

const email = ref('');
const password = ref('');
const name = ref('');
const photoUrl = ref('');

const errorMessage = ref('');
const errorOnRegisterAttempt = ref('');
const passwordVisible = ref('');
const registerProgress = ref('');

onMounted(() => {
  console.log("[Login] Componente montado!");
  errorOnRegisterAttempt.value = false
  errorMessage.value = ""
  passwordVisible.value = false
  registerProgress.value = false
});


const doRegister = async () => {
  if (!email.value || !password.value || !name.value) {
    errorOnRegisterAttempt.value = true
    errorMessage.value = "Preencha os campos Nome, Login e Password"
    return;
  }

  registerProgress.value = true

  try {
    let userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
    await updateProfileOnRegister(userCredential);
    apppStore.login(userCredential.user);
    registerProgress.value = false
  } catch (error) {
    console.log("Erro no cadastro:", error);
    registerProgress.value = false
    apppStore.logoff();
  }
}

async function updateProfileOnRegister(userCredential) {
  try {
    await updateProfile(userCredential.user, { displayName: name.value, photoURL: getProfilePhoto() })
  } catch (error) {
    console.log("User created but failed to updateProfile.");
  }
}

function getProfilePhoto() {
  return photoUrl.value.trim().length == 0 ? `https://ui-avatars.com/api/?name=${name.value.split(" ").join('+')}` : photoUrl.value
}

</script>
<style></style>
