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

## Project layout
```
app/src/main/assets/www/index.html   ← the whole app UI (HTML/CSS/JS, works offline)
app/src/main/java/.../MainActivity.java ← Android WebView wrapper (camera/gallery + back button)
.github/workflows/build-apk.yml      ← builds the APK and publishes a release
```
To change the app, edit `index.html` and push. A new APK builds automatically. You can also open `index.html` in any browser to preview it.

## Current limits (v1)
- **Nearby cooks are demo profiles** stored in the app. Real matching between phones needs a backend (e.g. Firebase for accounts, pantries, likes and chat). The matching engine (`duoOptions` / `buildDeck`) is already written to work with real profiles.
- **Photo → ingredients is manual tagging.** Automatic food recognition needs an online vision API or an on-device ML model.
- Recipe library: 42 built-in recipes.
