// Utilities
import { defineStore } from "pinia";
import { HubConnectionBuilder } from "@microsoft/signalr";
import SimplePeer from "simple-peer/simplepeer.min.js";
import { useSoundStore } from "@/store/sounds";
import { getCameraResolutions, testCameraResolutions } from "@/utils/camera";
import { isOnlyAudioCall } from "@/utils/tracks";

export const useAppStore = defineStore("app", {
  state: () => ({
    /**
     * @type {import('@microsoft/signalr').HubConnection}
     * */
    signalRConnection: {},
    sounds: useSoundStore(),
    listeningEvents: {
      friends: {
        active: false,
        unsubscribe: [],
      },
    },
    mediaStream: null,
    mediaStreamLoading: false,
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
    currentCallInfo: null,
    eventQueue: [],
    isCalling: false,
    incommingCallInfo: null,
    isLogged: false,
    friends: {
      dict: {},
      list: [],
      rooms: {},
      searchQuery: "",
      unreadMessages: {},
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
    peersStreams: {},
    timeouts: {},
    avaliableCameraResolutions: [],
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
      this.peers[friendId].send(
        JSON.stringify({
          type: "message",
          data: message,
        })
      );
    },
    createSignalRConnection() {
      if (this.signalRConnection && this.signalRConnection.state === "Connected") {
        console.log("SignalR connection already established");
        return;
      }

      this.signalRConnection = new HubConnectionBuilder()
        .withUrl(
          `http://192.168.0.77:5285/signal?UserID=${this.currentUser.uid}`,
          { withCredentials: false }
        )
        .withAutomaticReconnect()
        .build();

      this.signalRConnection.on(
        "WebRtcSignalReceived",
        (friendId, signalData) => {
          try {
            const signalDataParsed = JSON.parse(signalData);
            console.log("Signal received from: ", friendId, signalDataParsed);

            this.signalQueue.pendingFriendsToCheck.push(friendId);

            if (friendId in this.signalQueue.signals) {
              this.signalQueue.signals[friendId].push(signalDataParsed);
            } else {
              this.signalQueue.signals[friendId] = [signalDataParsed];
            }

            if (
              !(friendId in this.peers) ||
              this.peers[friendId].closed ||
              this.peers[friendId].destroyed
            ) {
              console.log("Creating new peer");
              this.peers[friendId] = new SimplePeer({
                initiator: false,
                trickle: true,
              });

              const peer = this.peers[friendId];
              peer.on("signal", (data) => {
                this.webRtcSignal(friendId, JSON.stringify(data));
              });

              peer.on("data", async (data) => {
                const message = JSON.parse(data);
                if (message.type === "message") {
                  let friend = this.friends.list.find(
                    (friend) => friend.data.uid === friendId
                  );

                  this.addReceivedMessage(
                    message.data,
                    friend.data.displayName
                  );
                } else if (message.type === "startCall") {
                  console.log("CALL");
                  this.sounds.call.currentTime = 0;
                  this.sounds.call.loop = true;

                  try {
                    await this.sounds.call.play();
                  } catch (error) {
                    console.warn(
                      "Não interagiu com o site, não foi possível tocar o som."
                    );
                  }

                  this.eventQueue.push({
                    type: "startCall",
                    data: {
                      // TODO: Quando o usuario acaba de ficar online e tem alguém ligando. O Objeto this.friends ainda não existe e da erro.
                      userCalling: this.friends.dict[friendId].data,
                      callType: message.data.callType,
                    },
                  });
                  await this.getMediaStream(message.data.callType);
                } else if (message.type === "callRejected") {
                  console.log("Call rejected");
                  this.eventQueue.push({
                    type: "callRejected",
                    data: {
                      userCalling: this.friends.dict[friendId].data,
                    },
                  });
                } else if (message.type === "callAccepted") {
                  console.warn("Call accepted - CAIU AQUI.");
                  this.acceptCall();
                  await this.addStreamToPeerConnection(
                    this.friends.dict[friendId].data,
                    message.data.callType
                  );
                }

                console.log("Data received: ", message);
              });

              peer.on("stream", (stream) => {
                this.toggleCallasOnlyAudio(isOnlyAudioCall(stream))
                this.eventQueue.push({
                  type: "stream",
                  data: {
                    stream,
                    userCalling: this.friends.dict[friendId].data,
                  },
                });
              });

              peer.on("connect", () => {
                console.log("Connected to peer:", friendId);
              });

              peer.on("close", () => {
                this.cleanupPeerConnection(friendId);
                console.log("Peer connection closed:", friendId);
              });

              peer.on("error", (err) => {
                console.error("Peer connection error:", err);
                this.cleanupPeerConnection(friendId);
              });
            }

            this.peers[friendId].signal(signalDataParsed);
          } catch (error) {
            console.error("Error handling signal data:", error);
          }
        }
      );

      this.signalRConnection.on("FriendsStatus", (friendsStatus) => {
        try {
          const statusUpdates = Array.isArray(friendsStatus) ? friendsStatus : [friendsStatus];

          for (const friend of statusUpdates) {
            if (friend && friend.friendId && this.friends.dict) {
              if (friend.friendId in this.friends.dict) {
                this.friends.dict[friend.friendId].status = friend.status;
              }
            }
          }
        } catch (error) {
          console.error("Error updating friend status:", error);
        }
      });

      this.startSignalRConnection();
    },

    startSignalRConnection() {
      this.signalRConnection
        .start()
        .then(() => {
          console.log("SignalR connection started");
          this.updateFriendsSatus();
        })
        .catch((error) => {
          console.error("Error starting SignalR connection:", error);
          setTimeout(() => {
            this.startSignalRConnection();
          }, 5000);
        });
    },
    cleanupPeerConnection(friendId) {
      try {
        if (this.peers[friendId]) {
          this.peers[friendId].destroy();
        }
        delete this.peers[friendId];
      } catch (error) {
        console.error(`Error cleaning up peer connection for ${friendId}:`, error);
      }
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
    addMessage(message, friend) {
      const userName = friend.displayName;
      if (userName in this.messages) {
        this.messages[userName].push({ Me: message });
      } else {
        this.messages[userName] = [{ Me: message }];
      }

      this.sendMessage(friend.uid, message);
    },
    addReceivedMessage(message, userName) {
      if (userName in this.messages) {
        this.messages[userName].push({ Them: message });
      } else {
        this.messages[userName] = [{ Them: message }];
      }

      const friendId = this.friends.list.find(f => f.data.displayName === userName)?.data?.uid;
      if (friendId) {
        if (this.activeFriend.uid !== friendId) {
          this.friends.unreadMessages[friendId] = true;
        }
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

      if (friend && friend.uid) {
        this.friends.unreadMessages[friend.uid] = false;
      }
    },
    setFriendsList(friends) {
      this.friends.list = friends;
    },
    setMediaStream(stream) {
      this.mediaStream = stream;
    },
    async getMediaStream(callType) {
      try {
        if (this.mediaStreamLoading) {
          await new Promise((resolve) => {
            const interval = setInterval(() => {
              if (!this.mediaStreamLoading) {
                clearInterval(interval);
                resolve();
              }
            }, 500);
          });
        }

        if (this.mediaStream) {
          return this.mediaStream;
        }

        console.log("Creating new media stream");

        this.mediaStreamLoading = true;
        const higherResolutions = await getCameraResolutions();

        let mediaStream = undefined;

        if (callType == "audio") {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
        } else if (callType == "video") {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
              width: higherResolutions[0].resolutions.width,
              height: higherResolutions[0].resolutions.height,
              facingMode: "user",
            },
          });
        }

        this.setMediaStream(mediaStream);
        console.log("successfuly received local stream and saved on store.");
        this.mediaStreamLoading = false;
        return mediaStream;
      } catch (error) {
        console.error(
          "error occurred when triyng to get an access to local stream",
          error
        );

        this.mediaStreamLoading = false;
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
    setCallingAsActive() {
      this.isCalling = true;
    },
    setCallingAsInactive() {
      this.isCalling = false;
    },
    setCallInactive() {
      this.currentCallInfo = null;
    },
    toggleCallasOnlyAudio(value) {
      this.currentCallInfo.audioCall = value;
    },
    setActiveCall(friend) {
      this.currentCallInfo = {
        active: true,
        friend,
      };
    },
    acceptCall() {
      this.sounds.call.pause();
      this.currentCallInfo.accepted = true;
    },
    rejectCall(friend) {
      try {
        this.sounds.call.pause();
        this.sounds.call.currentTime = 0;
        this.peers[friend.uid].send(
          JSON.stringify({
            type: "callRejected",
            data: {},
          })
        );
      } catch (error) {
        console.error("Error rejecting call", error);
      }
    },
    callRejected() {
      this.sounds.call.pause();
      this.sounds.call.currentTime = 0;
      this.setCallInactive();
    },
    /**
     * Adds a media stream to the peer connection for a specified friend.
     *
     * @param {Object} friend - The friend object containing information about the peer.
     */
    async addStreamToPeerConnection(friend, callType) {
      console.log(
        `Adding stream to peer connection for friend: ${friend.uid} with callType: ${callType}`
      );
      if (friend.uid in this.peers) {
        this.peers[friend.uid].addStream(await this.getMediaStream(callType));
      } else {
        console.log(`No peer connection found for friend: ${friend.uid}`);
      }
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
      return !!this.currentCallInfo;
    },
  },
});
