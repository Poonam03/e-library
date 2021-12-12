import firebase from "firebase"
 require("@firebase/firestore")

 const firebaseConfig = {
    apiKey: "AIzaSyBQUzUWRuEL90EW3cBcXEayQt2ESXkKF9A",
    authDomain: "e-library-d347b.firebaseapp.com",
    projectId: "e-library-d347b",
    storageBucket: "e-library-d347b.appspot.com",
    messagingSenderId: "654414377067",
    appId: "1:654414377067:web:87aad762fd14bf4d9c812e"
  };

  firebase.initializeApp(firebaseConfig);
  export default firebase.firestore;
