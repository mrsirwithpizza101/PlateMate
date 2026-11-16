// PlateMate cloud layer: Firebase Auth (anonymous), Firestore (profiles, likes, matches, chat)
// and Firebase AI Logic (Gemini) for food detection in photos.
// Bundled by GitHub Actions into app/src/main/assets/www/cloud.bundle.js
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore, persistentLocalCache, persistentSingleTabManager, memoryLocalCache,
  doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, where, orderBy, limit,
  onSnapshot, addDoc, updateDoc, serverTimestamp
} from "firebase/firestore";
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "firebase/ai";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const cfg = window.PLATEMATE_FIREBASE;
const configured = !!(cfg && cfg.apiKey && !/PASTE|YOUR_/i.test(cfg.apiKey));
window.Cloud = null;

if (configured) {
  const app = initializeApp(cfg);
  if (cfg.recaptchaSiteKey) {
    try {
      initializeAppCheck(app, { provider: new ReCaptchaV3Provider(cfg.recaptchaSiteKey), isTokenAutoRefreshEnabled: true });
    } catch (e) { console.warn("App Check", e); }
  }
  const auth = getAuth(app);
  let db;
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }) });
  } catch (e) {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
  }
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const MODELS = [cfg.visionModel, "gemini-3.8-flash", "gemini-3.7-flash", "gemini-flash-latest", "gemini-2.5-flash"]
    .filter((m, i, a) => m && a.indexOf(m) === i);

  let uid = null;
  const ready = (async () => {
    await auth.authStateReady();
    if (!auth.currentUser) await signInAnonymously(auth);
    uid = auth.currentUser.uid;
    return uid;
  })();

  const ms = ts => (ts && ts.toMillis ? ts.toMillis() : Date.now());
  const userDoc = d => ({ uid: d.id, ...d.data() });

  async function ensureMatch(other, rid) {
    const users = [uid, other].sort();
    const id = users.join("_") + "_" + rid;
    const ref = doc(db, "matches", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { users, rid, createdAt: serverTimestamp(), lastAt: serverTimestamp(), lastText: "", lastFrom: "" });
    }
    return id;
  }

  window.Cloud = {
    ready,
    get uid() { return uid; },

    async saveMe(data) {
      await ready;
      await setDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    },

    async findCooks(cells) {
      await ready;
      const q = cells && cells.length
        ? query(collection(db, "users"), where("gh4", "in", cells.slice(0, 30)), limit(300))
        : query(collection(db, "users"), orderBy("updatedAt", "desc"), limit(200));
      const s = await getDocs(q);
      return s.docs.map(userDoc).filter(u => u.uid !== uid);
    },

    async getUser(id) {
      const s = await getDoc(doc(db, "users", id));
      return s.exists() ? userDoc(s) : null;
    },

    // Like a meal with someone. Returns the match id if they already liked it back.
    async like(to, rid) {
      await ready;
      await setDoc(doc(db, "likes", `${uid}_${to}_${rid}`), { from: uid, to, rid, t: serverTimestamp() });
      const back = await getDoc(doc(db, "likes", `${to}_${uid}_${rid}`));
      return back.exists() ? ensureMatch(to, rid) : null;
    },

    async ensureMatch(other, rid) { await ready; return ensureMatch(other, rid); },

    watchIncomingLikes(cb) {
      return onSnapshot(query(collection(db, "likes"), where("to", "==", uid)),
        s => cb(s.docs.map(d => d.data())), e => console.warn("likes", e));
    },

    watchMatches(cb) {
      return onSnapshot(query(collection(db, "matches"), where("users", "array-contains", uid)), s => {
        cb(s.docs.map(d => {
          const x = d.data({ serverTimestamps: "estimate" });
          return {
            id: d.id, rid: x.rid, users: x.users, other: x.users.find(u => u !== uid) || x.users[0],
            lastText: x.lastText || "", lastFrom: x.lastFrom || "", lastAt: ms(x.lastAt),
            createdAt: ms(x.createdAt), closed: !!x.closed
          };
        }));
      }, e => console.warn("matches", e));
    },

    watchMessages(mid, cb) {
      return onSnapshot(query(collection(db, "matches", mid, "messages"), orderBy("t", "asc"), limit(300)), s => {
        cb(s.docs.map(d => { const x = d.data({ serverTimestamps: "estimate" }); return { id: d.id, from: x.from, text: x.text, t: ms(x.t) }; }));
      }, e => console.warn("messages", e));
    },

    async send(mid, text) {
      await addDoc(collection(db, "matches", mid, "messages"), { from: uid, text, t: serverTimestamp() });
      await updateDoc(doc(db, "matches", mid), { lastText: text.slice(0, 120), lastFrom: uid, lastAt: serverTimestamp() });
    },

    async closeMatch(mid) { await updateDoc(doc(db, "matches", mid), { closed: true, closedBy: uid }); },

    async report(target, reason, mid) {
      await addDoc(collection(db, "reports"), { by: uid, target, reason: String(reason).slice(0, 500), mid: mid || "", t: serverTimestamp() });
    },

    async deleteMe() {
      await deleteDoc(doc(db, "users", uid));
      try { await auth.currentUser.delete(); } catch (e) { /* ignore */ }
    },

    // Ask Gemini what food is in the photo. Returns an array of ingredient names.
    async detectFood(dataUrl, vocab) {
      const b64 = String(dataUrl).split(",")[1];
      const schema = Schema.object({ properties: { items: Schema.array({ items: Schema.string() }) } });
      const prompt =
        "This is a photo of someone's fridge, pantry, counter, or groceries. List every distinct food " +
        "ingredient you can clearly see. Use these exact names whenever one fits: " + vocab.join(", ") +
        ". For anything else use a short common name (1-3 words, singular, lowercase). Ignore non-food items " +
        "and anything you can't identify with confidence. Return JSON like {\"items\":[\"egg\",\"milk\"]}.";
      let lastErr;
      for (const m of MODELS) {
        try {
          const model = getGenerativeModel(ai, {
            model: m,
            generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 }
          });
          const r = await model.generateContent([prompt, { inlineData: { mimeType: "image/jpeg", data: b64 } }]);
          const j = JSON.parse(r.response.text());
          return Array.isArray(j.items) ? j.items : [];
        } catch (e) {
          lastErr = e;
          if (!/not.?found|404|not supported|unsupported|invalid.*model/i.test(String(e && e.message))) throw e;
        }
      }
      throw lastErr;
    }
  };
}
