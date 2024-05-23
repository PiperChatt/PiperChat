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
    isInCall: false,
    isCalling: false,
    isLogged: true,
    friends: {
      list: [
        { Name: "Gedor", avatar: "https://cdn.vuetifyjs.com/images/john.png", uid: "hq9nUq2EPLNPNIiscY8IlmddQJR2" },
        { Name: "Camila", avatar: "https://cdn.vuetifyjs.com/images/john.png"  },
        { Name: "Anderson", avatar: "https://cdn.vuetifyjs.com/images/john.png", uid: "shnDjlTiwRdDhe9xDGzIgLDZAJ32"  },
        { Name: "Dorini", avatar: "https://cdn.vuetifyjs.com/images/john.png"  },
      ],
      searchQuery: "",
    },
    activeFriend: {
      Name: "",
      avatar: "https://cdn.vuetifyjs.com/images/john.png",
      // uid: "hq9nUq2EPLNPNIiscY8IlmddQJR2"
      uid: "shnDjlTiwRdDhe9xDGzIgLDZAJ32"
    },
    incommingCallInfo: null
  }),
  actions: {
    addMessage(message, userName) {
      if (userName in this.messages) {
        this.messages[userName].push({ Me: message });
      } else {
        this.messages[userName] = [userName == this.currentUserName ? { Me: message } : { Them: message }];
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
      this.currentUser = {
        ...this.currentUser,
        ...value,
      };
    },
    setCallActive() {
      this.isInCall = true;
    },
    setCallingAsActive() {
      this.isCalling = true;
    },
    setCallingAsInactive() {
      this.isCalling = false;
    },
    setCallInactive() {
      this.isInCall = false;
    },
    setIncommingCallInfo(incommingCallObj) {
      this.incommingCallInfo = incommingCallObj ? incommingCallObj : null;
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
    getVideoCallStatus() {
      return this.isInCall;
    }
  },
});
