// Utilities
import { defineStore } from "pinia";
import discordCallSound from '@/assets/sounds/discord-call-sound.mp3';
import busyUser from '@/assets/sounds/busy-user.mp3';
import discordJoined from '@/assets/sounds/discord-joined.mp3';
import discordLeft from '@/assets/sounds/discord-left.mp3';

export const useSoundStore = defineStore("sounds", {
  state: () => ({
    call: new Audio(discordCallSound),
    busyUser: new Audio(busyUser),
    joined: new Audio(discordJoined),
    left: new Audio(discordLeft)
  }),
  actions: {

  },
  getters: {
  }
});
