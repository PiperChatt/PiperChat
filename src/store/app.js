// Utilities
import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    messages: {
      Gedor: [{ Me: "Hello John" }, { Them: "How are you Evan?" }],
      Dorini: [
        { Me: "Hello Gedor" },
        { Them: "How are you Jhonsss?" },
        { Them: "How are you Jhonsss?" },
        { Them: "How are you Jhonsss?" },
      ],
    },
    currentUser: {
      userName: "Evan You",
      avatar:
        "https://miro.medium.com/v2/resize:fit:500/0*xkJgg-6HskYrQ3N7.jpeg",
    },
    isLogged: true,
    friends: {
      list: [
        { Name: "Gedor", avatar: "https://cdn.vuetifyjs.com/images/john.png" },
        { Name: "Camila", avatar: "https://cdn.vuetifyjs.com/images/john.png"  },
        { Name: "Anderson", avatar: "https://cdn.vuetifyjs.com/images/john.png"  },
        { Name: "Dorini", avatar: "https://cdn.vuetifyjs.com/images/john.png"  },
      ],
      searchQuery: "",
    },
    activeFriend: {
      Name: "",
      avatar: "https://cdn.vuetifyjs.com/images/john.png",
    },
  }),
  actions: {
    addMessage(message, userName) {
      if (userName in this.messages) {
        this.messages[userName].push({ Me: message });
      } else {
        this.messages[userName] = [message];
      }
    },
    removeMessage(userName, message) {
      this.messages[userName] = this.messages[userName].filter(
        (msg) => msg !== message
      );
    },
    getMessages(userName) {
      if (!(userName in this.messages)) return [];

      return this.messages[userName];
    },
    setQuery(query) {
      this.friends.searchQuery = query;
    },
    setActiveFriend(friend) {
      this.activeFriend = friend;
    },
    setIsLogged(value) {
      this.isLogged = value;
    },
    setCurrentUser(value) {
      console.log(value)
      this.currentUser = value;
    }
  },
  getters: {
    getFriends(state) {
      if (this.friends.searchQuery === "") return state.friends.list;

      return state.friends.list.filter((friend) => {
        return friend.Name.toLowerCase().includes(
          this.friends.searchQuery.toLowerCase()
        );
      });
    },
  },
});
