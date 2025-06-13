
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore'; // Added getFirestore, initializeFirestore
// import { getPerformance } from 'firebase/performance'; // Commented out

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firestore
// To prevent issues with multiple initializations, especially with HMR
let db;
try {
    db = getFirestore(app);
} catch (e) {
    console.warn("Firestore already initialized or error during initial getFirestore:", e);
    // Fallback or specific error handling if needed, for now, we ensure it's initialized once.
    if (!getApps().some(existingApp => existingApp.name === app.name && (existingApp as any)._firestoreClient)) {
         initializeFirestore(app, {
            ignoreUndefinedProperties: true, // Example setting, adjust as needed
        });
    }
    db = getFirestore(app);
}


// Initialize Performance Monitoring only on the client side
// if (typeof window !== 'undefined') {
//   getPerformance(app); // Commented out to prevent error
// }

export { app, db }; // Export db (Firestore instance)
