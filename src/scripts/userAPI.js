import { db } from '@/firebase';
import { ref, get, child   } from 'firebase/database';


export async function getUserInfoByUID(uid) {
  const dbRef = ref(db);
  let user = null;
  try {
    user = await get(child(dbRef, `users/${uid}`));
    if (user.exists()) {
      return user.val();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting collection data:', error);
    return null;
  }

}