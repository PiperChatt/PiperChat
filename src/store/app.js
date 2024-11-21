// Utilities
import { defineStore } from "pinia";
import { HubConnectionBuilder } from "@microsoft/signalr";
import SimplePeer from "simple-peer/simplepeer.min.js";

export const useAppStore = defineStore("app", {
  state: () => ({
    /**
     * @type {import('@microsoft/signalr').HubConnection}
     * */
    signalRConnection: {},
    listeningEvents: {
      friends: {
        active: false,
        unsubscribe: [],
      },
    },
    mediaStream: null,
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
    isInCall: false,
    isCalling: false,
    incommingCallInfo: null,
    isLogged: false,
    friends: {
      dict: {},
      list: [],
      rooms: {},
      searchQuery: "",
    },
    activeFriend: {
      Name: "",
      avatar: "https://cdn.vuetifyjs.com/images/john.png",
      displayName: "",
    },
    signalQueue: {
      pendingFriendsToCheck: [],
      signals: {},
    },
    peers: {},
  }),
  actions: {
    updateFriendsSatus() {
      this.signalRConnection
        .invoke("GetFriendsStatus")
        .then((friendsStatus) => {
          for (const friend of friendsStatus) {
            if (friend.friendId in this.friends.dict) {
              this.friends.dict[friend.friendId].status = friend.status;
            }
          }
        });
    },
    listenForFriendStatus(friendId) {
      this.signalRConnection.invoke("ListenForFriendStatus", friendId);
      this.updateFriendsSatus();
    },
    webRtcSignal(friendId, data) {
      console.log("WebRTC Signal: ", data);
      this.signalRConnection.invoke("WebRtcSignal", friendId, data);
    },
    sendMessage(friendId, message) {
      this.peers[friendId].send(message);
    },
    createSignalRConnection() {
      this.signalRConnection = new HubConnectionBuilder()
        .withUrl(
          `http://localhost:5285/signal?UserID=${this.currentUser.uid}`,
          { withCredentials: false }
        )
        .withAutomaticReconnect()
        .build();

      this.signalRConnection.on(
        "WebRtcSignalReceived",
        (friendId, signalData) => {
          const signalDataParsed = JSON.parse(signalData);
          console.log("Signal received from: ", friendId, signalDataParsed);
          try {
            this.signalQueue.pendingFriendsToCheck.push(friendId);

            if (friendId in this.signalQueue.signals) {
              this.signalQueue.signals[friendId].push(signalDataParsed);
            } else {
              this.signalQueue.signals[friendId] = [signalDataParsed];
            }

            if (!(friendId in this.peers)) {
              console.log("Creating new peer");
              this.peers[friendId] = new SimplePeer({
                initiator: false,
              });
              this.peers[friendId].on("signal", (data) => {
                this.webRtcSignal(friendId, JSON.stringify(data));
              });

              this.peers[friendId].on("data", (data) => {
                let friend = this.friends.list.find(
                  (friend) => friend.data.uid === friendId
                );
                console.log("Friend: ", friend);
                this.addReceivedMessage(data, friend.data.displayName);

                console.log("Data received: ", data);
              });

              this.peers[friendId].on("connect", () => {
                console.log("Connected to peer");
              });
            }
            this.peers[friendId].signal(signalDataParsed);
          } catch (error) {
            console.error("Error handling signal data", error);
          }
        }
      );

      this.signalRConnection.on("FriendsStatus", (friendsStatus) => {
        for (const friend of friendsStatus) {
          if (friend.friendId in this.friends.dict) {
            // console.log("Friend already in list");
            this.friends.dict[friend.friendId].status = friend.status;
          }
        }

        // console.log("Friends status updated: ", this.friends.list);
      });

      this.signalRConnection
        .start()
        .then(() => {
          console.log("SignalR connection started");
        })
        .catch((error) => {
          console.log("Error starting SignalR connection", error);
        });
    },
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

      this.sendMessage(this.activeFriend.uid, message);
    },
    addReceivedMessage(message, userName) {
      if (userName in this.messages) {
        this.messages[userName].push({ Them: message });
      } else {
        this.messages[userName] = [{ Them: message }];
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
    setFriendsList(friends) {
      this.friends.list = friends;
    },
    setMediaStream(stream) {
      this.mediaStream = stream;
    },
    async getMediaStream() {
      try {
        if (this.mediaStream) {
          return this.mediaStream;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: 480,
            height: 360,
          },
        });

        this.setMediaStream(mediaStream);
        console.log("successfuly received local stream and saved on store.");
      } catch (error) {
        console.error(
          "error occurred when triyng to get an access to local stream",
          error
        );
        return null;
      }
    },
    addFriend(friend) {
      const friendData = {
        data: friend,
        status: "offline",
      };
      this.friends.list.push(friendData);
      this.friends.dict[friend.uid] = friendData;
    },
    removeFriend(friendUid) {
      this.friends.list = this.friends.list.filter(
        (friend) => friend.data.uid !== friendUid
      );
    },
    login(user) {
      console.log("User logged: ", user);

      if (user) {
        this.isLogged = true;
        this.currentUser = user;
        this.createSignalRConnection();
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
      this.incommingCallInfo = incommingCallObj || null;
    },
  },
  getters: {
    getFriends(state) {
      if (this.friends.searchQuery === "") return state.friends.list;

      return state.friends.list.filter((friend) => {
        return friend.data.displayName
          .toLowerCase()
          .includes(this.friends.searchQuery.toLowerCase());
      });
    },
    getVideoCallStatus() {
      return this.isInCall;
    },
  },
});
