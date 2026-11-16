# 🍽️ PlateMate

**Swipe on meals, not just people.** Add what's in your kitchen, PlateMate finds meals you could make by combining your ingredients with someone else's, and if you both swipe right on the same meal, you match and cook together.

## How it works
1. **Build your pantry** by typing ingredients (it understands plurals and aliases like "cheddar" → cheese), tapping quick-add tiles, or snapping a photo of your fridge and tagging what's in it.
2. **Cook tab** shows what you can make on your own, plus "almost there" recipes missing 1–2 items.
3. **Match tab** shows swipe cards: a meal, a nearby cook, and who brings what. Swipe right ❤ or left ✖ (or use the buttons). Tap a card to see the recipe.
4. **It's a match!** brings confetti 🎉 and a chat with quick replies to plan when and where.

Salt, pepper, oil and water are always assumed. Users must be 18+.

## Download the APK
Every push to `main` builds the app automatically with GitHub Actions:
- **Releases** (right side of the repo page) → newest `PlateMate v1.0.x` → download **PlateMate.apk**
- Or **Actions** → latest "Build APK" run → **PlateMate-apk** artifact

On your phone, open the APK and allow "Install unknown apps" when Android asks.

## Turning on real matching + AI food detection (Firebase, free)
Out of the box the app runs in **demo mode**. To go live:
1. Create a Firebase project (console.firebase.google.com) — the free **Spark** plan is enough.
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
3. **Build → Firestore Database → Create database** (production mode). Then open the **Rules** tab, paste in everything from [`firestore.rules`](firestore.rules), and click **Publish**.
4. **AI Services → AI Logic → Get started**, choose the **Gemini Developer API** (free tier).
   If the setup turns on App Check enforcement for AI Logic, go to **App Check → APIs → Firebase AI Logic** and choose **Unenforce** (or add a reCAPTCHA v3 key as `recaptchaSiteKey` in the config).
5. **Project settings → Your apps → Web (</>)**, register an app, and copy the `firebaseConfig` values into
   [`app/src/main/assets/www/firebase-config.js`](app/src/main/assets/www/firebase-config.js). Commit — a new APK builds automatically.

The profile screen shows **🟢 Live** once it's connected.

## Project layout
```
app/src/main/assets/www/index.html          ← the app UI (HTML/CSS/JS)
app/src/main/assets/www/firebase-config.js  ← your Firebase config (empty = demo mode)
web/cloud.js                                ← Firebase: accounts, matching, chat, Gemini photo detection
firestore.rules                             ← database security rules (paste into Firebase console)
app/src/main/java/.../MainActivity.java     ← Android wrapper (camera, location, back button)
.github/workflows/build-apk.yml             ← bundles Firebase, builds the APK, publishes a release
```

## How live matching works
- Each person's profile and pantry are saved to Firestore, with their location rounded to about 3 miles.
- The deck shows cooks within roughly 40 miles (or anywhere, which you can switch in the profile), and each card is a meal you can make together.
- A swipe right saves a **like** for *that person + that meal*. If they've liked the same meal with you, a **match** is created. The security rules only allow a match when both likes exist.
- Cards from people who already liked you show **💖 wants to cook this!**
- Chats update in real time. Unmatch, block & report, and safety tips are in the chat's ⋯ menu.

## Current limits
- No push notifications yet: new matches and messages appear when the app is open.
- Accounts are anonymous and tied to the phone. Uninstalling the app loses the account.
- Photo detection needs internet and uses Gemini's free tier, which is rate-limited.
