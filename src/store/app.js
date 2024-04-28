// Utilities
import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    listeningEvents: {
      friends: {
        active: false,
        unsubscribe: [],
      },
    },
    messages: {
      Gedor: [{ Me: "Hello John" }, { Them: "How are you Evan?" }],
      Dorini: [
        { Me: "Hello Gedor" },
        { Them: "How are you Jhonsss?" },
        { Them: "How are you Jhonsss?" },
        { Them: "How are you Jhonsss?" },
      ],
    },
    currentUser: {},
    isLogged: false,
    friends: {
      list: [],
      searchQuery: "",
    },
    activeFriend: {
      Name: "",
      avatar: "https://cdn.vuetifyjs.com/images/john.png",
    },
  }),
  actions: {
    isEventActive(event) {
      if (event in this.listeningEvents) {
        return this.listeningEvents[event].active;
      }

      return false;
    },
    registerEvent(event, callbacks) {
      if (event in this.listeningEvents) {
        this.listeningEvents[event].active = true;
        for (const element of this.listeningEvents[event].unsubscribe) {
          element();
        }
        this.listeningEvents[event].unsubscribe = [...callbacks];
      }
    },
    clearEvent(event) {
      if (event in this.listeningEvents) {
        console.log("Clearing event: ", event);
        this.listeningEvents[event].active = false;

        console.log(
          "Unsubscribing events: ",
          this.listeningEvents[event].unsubscribe.length
        );
        for (const element of this.listeningEvents[event].unsubscribe) {
          element();
        }
        this.listeningEvents[event].unsubscribe = [];
      }
    },
    addMessage(message, userName) {
      if (userName in this.messages) {
        this.messages[userName].push({ Me: message });
      } else {
        this.messages[userName] = [{ Me: message }];
      }
    },
    removeMessage(userName, message) {
      this.messages[userName] = this.messages[userName].filter(
        (msg) => msg !== message
      );
    },
    getMessages(userName) {
      if (!(userName in this.messages)) return [];
      console.log(`tá voltando isso: `, this.messages[userName]);

      return this.messages[userName];
    },
    setQuery(query) {
      this.friends.searchQuery = query;
    },
    setActiveFriend(friend) {
      this.activeFriend = friend;
    },
    setFriendsList(friends) {
      this.friends.list = friends;
    },
    addFriend(friend) {
      this.friends.list.push(friend);
    },
    removeFriend(friendUid) {
      this.friends.list = this.friends.list.filter(
        (friend) => friend.uid !== friendUid
      );
    },
    login(user) {
      if (user) {
        this.isLogged = true;
        this.currentUser = user;
      }
    },
    logoff() {
      this.isLogged = false;
      this.currentUser = {};
      try {
        this.clearEvent("friends");
      } catch (error) {
        console.error("Error trying to clear events", error);
      }

      this.$reset();
    },
  },
  getters: {
    getFriends(state) {
      if (this.friends.searchQuery === "") return state.friends.list;

      return state.friends.list.filter((friend) => {
        return friend.displayName
          .toLowerCase()
          .includes(this.friends.searchQuery.toLowerCase());
      });
    },
  },
});
