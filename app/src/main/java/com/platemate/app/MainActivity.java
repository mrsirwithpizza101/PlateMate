package com.platemate.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends Activity {

    private static final int REQ_PHOTO = 42;
    private WebView web;
    private ValueCallback<Uri[]> pendingCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);

        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (pendingCallback != null) pendingCallback.onReceiveValue(null);
                pendingCallback = callback;

                Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("image/*");
                Intent chooser = Intent.createChooser(pick, "Add a photo");
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                try {
                    startActivityForResult(chooser, REQ_PHOTO);
                } catch (Exception e) {
                    pendingCallback.onReceiveValue(null);
                    pendingCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl("file:///android_asset/www/index.html");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_PHOTO) return;

        // We hand the photo to the page ourselves, so release the file input.
        if (pendingCallback != null) {
            pendingCallback.onReceiveValue(null);
            pendingCallback = null;
        }
        if (resultCode != RESULT_OK || data == null) return;

        Bitmap bmp = null;
        try {
            Uri uri = data.getData();
            if (uri != null) {
                BitmapFactory.Options bounds = new BitmapFactory.Options();
                bounds.inJustDecodeBounds = true;
                InputStream in1 = getContentResolver().openInputStream(uri);
                BitmapFactory.decodeStream(in1, null, bounds);
                if (in1 != null) in1.close();
                int sample = 1;
                int biggest = Math.max(bounds.outWidth, bounds.outHeight);
                while (biggest / sample > 1600) sample *= 2;
                BitmapFactory.Options opts = new BitmapFactory.Options();
                opts.inSampleSize = sample;
                InputStream in2 = getContentResolver().openInputStream(uri);
                bmp = BitmapFactory.decodeStream(in2, null, opts);
                if (in2 != null) in2.close();
            } else if (data.getExtras() != null) {
                Object o = data.getExtras().get("data");
                if (o instanceof Bitmap) bmp = (Bitmap) o;
            }
        } catch (Exception ignored) { }
        if (bmp == null) return;

        int max = 800;
        int w = bmp.getWidth(), h = bmp.getHeight();
        if (Math.max(w, h) > max) {
            float scale = (float) max / Math.max(w, h);
            bmp = Bitmap.createScaledBitmap(bmp, Math.round(w * scale), Math.round(h * scale), true);
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        bmp.compress(Bitmap.CompressFormat.JPEG, 80, out);
        String b64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        web.evaluateJavascript(
                "window.onNativePhoto && window.onNativePhoto('data:image/jpeg;base64," + b64 + "')",
                null);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.appBack && window.appBack()) ? '1' : '0'", value -> {
            if (value == null || !value.contains("1")) finish();
        });
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }
}
