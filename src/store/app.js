// Utilities
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    isLogged: true,
    currentUser: {}
  }),
  actions: {
    setIsLogged(value) {
      this.isLogged = value;
    },
    setCurrentUser(value) {
      this.currentUser = value;
    }
  }
})
