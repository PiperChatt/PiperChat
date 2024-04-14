// Utilities
import { defineStore } from 'pinia'


export const useAppStore = defineStore('app', {
  state: () => ({
    messages: {
      "Gedor": [{"Me": "Hello John"}, {"Them": "How are you Evan?"}],
      "Dorini": [{"Me": "Hello Gedor"}, {"Them": "How are you Jhonsss?"}, {"Them": "How are you Jhonsss?"}, {"Them": "How are you Jhonsss?"}]
    },
    currentUser : {
      "userName": "Evan You",
      "avatar": "https://miro.medium.com/v2/resize:fit:500/0*xkJgg-6HskYrQ3N7.jpeg"
    }
  }),
  actions: {
    addMessage(message, userName) {
      if (userName in this.messages) {
        this.messages[userName].push({"Me": message})
      } else {
        this.messages[userName] = [message]
      }
    },
    removeMessage(userName, message) {
      this.messages[userName] = this.messages[userName].filter(
        (msg) => msg !== message
      )
    },
    getMessages(userName) {
      if (!(userName in this.messages)) return []

      return this.messages[userName]
    }
  }
})
