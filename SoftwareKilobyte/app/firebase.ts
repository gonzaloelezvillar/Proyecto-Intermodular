import {initializeApp} from 'firebase/app';
import {getAuth, inMemoryPersistence, setPersistence} from 'firebase/auth';
import {initializeFirestore, persistentLocalCache, persistentMultipleTabManager} from 'firebase/firestore';

export const firebaseConfig = {
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
export const db = initializeFirestore(app,{
  localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()}),
});
auth.languageCode = 'es';

const accountCreationApp = initializeApp(firebaseConfig,'account-creation');
export const accountCreationAuth = getAuth(accountCreationApp);
accountCreationAuth.languageCode = 'es';
export const prepareAccountCreationAuth = () => setPersistence(accountCreationAuth,inMemoryPersistence);
