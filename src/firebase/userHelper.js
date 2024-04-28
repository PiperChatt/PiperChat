import { db } from "@/firebase";
import {
  set,
  onValue,
  update,
  push,
  query,
  equalTo,
  get,
  child,
  orderByChild,
  ref,
  onChildAdded,
  onChildRemoved,
} from "firebase/database";
import { useAppStore } from "@/store/app";

/**
 * Adds a user to the database.
 * @param {Object} user - The user object containing user information.
 * @param {string} user.uid - The unique identifier of the user.
 * @param {string} user.email - The email address of the user.
 * @param {string} user.displayName - The display name of the user.
 * @param {string} user.photoURL - The URL of the user's profile photo.
 * @returns {Promise<void>} - A promise that resolves when the user is added to the database.
 */
export async function addUser(user) {
  try {
    const userRef = ref(db, `users/${user.uid}`);
    console.log(user);

    let userExists = await get(userRef);

    if (userExists.exists()) {
      console.log("User already exists");
      return;
    }

    await set(userRef, {
      email: user.email,
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      friends: [],
    });
    console.log("User added successfully");
  } catch (error) {
    console.error("Error adding user: ", error);
  }
}

export async function findUserByEmail(userDbRef, email) {
  const userRef = userDbRef ?? ref(db, "users");
  const emailQuery = query(userRef, orderByChild("email"), equalTo(email));

  let data = await get(emailQuery);

  return data;
}

export async function getFriendsList(userId) {
  try {
    const friendsRef = ref(db, `users/${userId}/friends`);

    let data = await get(friendsRef);

    if (!data.exists()) {
      return [];
    }

    const friendsUids = data.val();

    console.log(friendsUids);

    let friends = [];

    let friendsTasks = Object.values(friendsUids).map((friendUid) => {
      const friendRef = ref(db, `users/${friendUid}`);
      return get(friendRef);
    });

    let result = await Promise.all(friendsTasks);

    for (const element of result) {
      friends.push(element.val());
    }

    return friends;
  } catch (error) {
    console.log("Error getting friends list: ", error);
    return [];
  }
}

export async function listenForNewFriends(userId) {
  const friendsRef = ref(db, `users/${userId}/friends`);
  const store = useAppStore();

  let onAddedEvent = onChildAdded(friendsRef, async (data) => {
    const newFriendUid = data.val();
    console.log("New friend added: ", newFriendUid);
    const friendData = await fetchFriendDetails(null, newFriendUid);
    console.log(friendData);
    store.addFriend(friendData);
  });

  let onRemovedEvent = onChildRemoved(friendsRef, async (data) => {
    const removedFriendUid = data.val();
    console.log("Friend removed: ", removedFriendUid);
    store.removeFriend(removedFriendUid);
  });

  store.registerEvent("friends", [onAddedEvent, onRemovedEvent]);
}

export async function fetchFriendDetails(friendRef, friendUid) {
  try {
    const friendDbRef = friendRef ?? ref(db, `users/${friendUid}`);

    let data = await get(friendDbRef);
    if (data.exists()) {
      return data.val();
    } else {
      console.log("Friend data not found");
    }
  } catch (error) {
    console.error("Error fetching friend data:", error);
  }
}

export async function addFriend(userId, friendEmail) {
  try {
    const friendRef = ref(db, "users");
    console.log("Adding friend: ", friendEmail);

    let friendData = await findUserByEmail(friendRef, friendEmail);

    if (!friendData.exists()) {
      return { success: false, message: "User not found" };
    }

    const friendDbData = Object.values(friendData.val())[0];
    console.log(friendDbData);
    const friendUid = friendDbData.uid;

    console.log("Adding friend: ", friendUid);

    const friendsRef = ref(db, `users/${userId}/friends`);

    let data = await get(friendsRef);

    console.log(data.val());

    if (!data.exists()) {
      await set(friendsRef, {
        [friendUid]: friendUid,
      });

      return { success: true, message: "Friend added successfully" };
    }

    if (data.exists() && data.val().hasOwnProperty(friendUid)) {
      return { success: false, message: "Friend already added" };
    }

    await update(friendsRef, {
      [friendUid]: friendUid,
    });

    return { success: true, message: "Friend added successfully" };
  } catch (error) {
    console.error("Error adding friend: ", error);
    return { success: false, message: `Error adding friend: ${error}` };
  }
}

export function getProfilePhoto(photoURL, name, email) {
  if (photoURL?.trim().length > 0) {
    return photoURL;
  }

  if (name?.trim().length > 0) {
    return `https://ui-avatars.com/api/?name=${name.split(" ").join("+")}`;
  }

  return `https://ui-avatars.com/api/?name=${email.split("@")[0]}`;
}
