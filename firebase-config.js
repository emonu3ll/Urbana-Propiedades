// Importar Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBHTEXP-nv7-MgfFkc0aVKq8h62l8ZT_Tg",
  authDomain: "urbana-propiedades-fca4d.firebaseapp.com",
  projectId: "urbana-propiedades-fca4d",
  storageBucket: "urbana-propiedades-fca4d.firebasestorage.app",
  messagingSenderId: "41501151833",
  appId: "1:41501151833:web:c7cb434000d074b6b31748",
  measurementId: "G-XC4ELT0Z7X"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Exportar TODO correctamente
export { 
  db, 
  storage, 
  auth,
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};