import {initializeApp} from 'firebase/app';
import {getAuth, GoogleAuthProvider} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'software-kilobyte-sl',
  appId: '1:734816414072:web:b7b3a8535fafd8050a808d',
  storageBucket: 'software-kilobyte-sl.firebasestorage.app',
  apiKey: 'AIzaSyBl2p7Rc_4e2qny7ODb6CZtmR5p362En-Y',
  authDomain: 'software-kilobyte-sl.firebaseapp.com',
  messagingSenderId: '734816414072',
  measurementId: 'G-WCQ56VD658',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({prompt: 'select_account'});
