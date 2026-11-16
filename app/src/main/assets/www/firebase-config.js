// Paste your Firebase web app config here to turn on real matching + AI food detection.
// Firebase console → Project settings → Your apps → Web app → "SDK setup and configuration" → Config.
// These values are not secret; security comes from firestore.rules.
// Leave apiKey as "PASTE_ME" to run in demo mode.
window.PLATEMATE_FIREBASE = {
  apiKey: "PASTE_ME",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
  // Optional: recaptchaSiteKey: "",   // only if you enforce App Check
  // Optional: visionModel: ""         // override the Gemini model used for photos
};
