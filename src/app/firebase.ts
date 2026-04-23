import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA2aS38OONHsj-jS5-cex9-NH3O-J2hM_E',
  authDomain: 'undangan-aa58d.firebaseapp.com',
  projectId: 'undangan-aa58d',
  storageBucket: 'undangan-aa58d.firebasestorage.app',
  messagingSenderId: '659933077431',
  appId: '1:659933077431:web:96a290bfec81ae0ca99232'
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
