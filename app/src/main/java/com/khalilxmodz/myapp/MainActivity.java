package com.khalilxmodz.myapp;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Hosts the packaged website (app/src/main/assets/index.html) inside a WebView.
 * The website files themselves are not modified; this class only provides the native shell.
 */
public class MainActivity extends AppCompatActivity {

    private static final String START_URL = "file:///android_asset/index.html";
    private static final String ASSET_URL_PREFIX = "file:///android_asset/";
    private static final String ASSET_PATH_PREFIX = "/android_asset/";
    private static final long SPLASH_MAX_MS = 2500;

    /** File types WebView can display itself; everything else local is opened in another app. */
    private static final String[] INTERNAL_EXTENSIONS = {
            "html", "htm", "svg", "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico",
            "txt", "css", "js", "json"
    };

    /** Closes the site's own popup (email modal / image lightbox) the same way its Esc key does. */
    private static final String CLOSE_POPUP_JS =
            "(function(){"
                    + "var m=document.getElementById('modal'),l=document.getElementById('lightbox');"
                    + "var open=!!((m&&!m.hidden)||(l&&!l.hidden));"
                    + "if(open){document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));}"
                    + "return open;})()";

    private WebView webView;
    private volatile boolean pageReady = false;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    private ValueCallback<Uri[]> filePathCallback;
    private final ActivityResultLauncher<Intent> fileChooserLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (filePathCallback == null) return;
                Uri[] uris = WebChromeClient.FileChooserParams.parseResult(
                        result.getResultCode(), result.getData());
                filePathCallback.onReceiveValue(uris);
                filePathCallback = null;
            });

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Splash screen (must be installed before super.onCreate)
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> !pageReady);
        handler.postDelayed(() -> pageReady = true, SPLASH_MAX_MS); // safety net

        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        setUpFullscreen();

        webView = findViewById(R.id.webview);
        webView.setBackgroundColor(Color.parseColor("#07070B"));

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage / sessionStorage
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);            // required to load file:///android_asset/
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(false);    // target="_blank" is routed through shouldOverrideUrlLoading
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(true);            // honour the page's <meta name="viewport">
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Prevent accidental pinch / double-tap zoom and system font scaling from breaking the layout
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true); // chrome://inspect for debug builds
        }

        webView.setWebViewClient(new AppWebViewClient());
        webView.setWebChromeClient(new AppWebChromeClient());

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleBack(this);
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Fullscreen + insets                                                  */
    /* ------------------------------------------------------------------ */

    private void setUpFullscreen() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        final View root = findViewById(R.id.root);
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        hideSystemBars();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    /* ------------------------------------------------------------------ */
    /* Back navigation                                                      */
    /* ------------------------------------------------------------------ */

    private void handleBack(final OnBackPressedCallback callback) {
        webView.evaluateJavascript(CLOSE_POPUP_JS, value -> {
            if ("true".equals(value)) return;          // a popup was open and has been closed
            if (webView.canGoBack()) {
                webView.goBack();
            } else {
                callback.setEnabled(false);            // let the system finish the activity
                getOnBackPressedDispatcher().onBackPressed();
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /* WebViewClient: external links + local documents                      */
    /* ------------------------------------------------------------------ */

    private class AppWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handleUrl(request.getUrl());
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            pageReady = true;
        }
    }

    /** @return true if the URL was handled natively, false if WebView should load it. */
    private boolean handleUrl(Uri uri) {
        String url = uri.toString();

        if (url.startsWith(ASSET_URL_PREFIX)) {
            String path = uri.getPath();
            if (path != null && path.startsWith(ASSET_PATH_PREFIX) && !isInternalType(path)) {
                openLocalAsset(path.substring(ASSET_PATH_PREFIX.length()));
                return true;
            }
            return false; // page of the packaged website, in-page anchor, image, ...
        }

        openExternal(uri);
        return true; // never navigate away from the packaged website inside the WebView
    }

    private boolean isInternalType(String path) {
        String ext = extensionOf(path);
        for (String e : INTERNAL_EXTENSIONS) {
            if (e.equals(ext)) return true;
        }
        return false;
    }

    private static String extensionOf(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private void openExternal(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        Intent intent;
        switch (scheme) {
            case "mailto":
                intent = new Intent(Intent.ACTION_SENDTO, uri);
                break;
            case "http":
            case "https":
            case "tel":
            case "sms":
            case "smsto":
            case "geo":
                intent = new Intent(Intent.ACTION_VIEW, uri);
                break;
            default:
                return; // unknown / unsafe scheme: ignore
        }
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, R.string.no_app_found, Toast.LENGTH_SHORT).show();
        }
    }

    /** Copies a packaged document (e.g. a PDF) to the cache and opens it in an external app. */
    private void openLocalAsset(final String assetPath) {
        io.execute(() -> {
            try {
                final String name = new File(assetPath).getName();
                File dir = new File(getCacheDir(), "shared");
                if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("cache dir");
                File out = new File(dir, name);
                try (InputStream in = getAssets().open(assetPath);
                     OutputStream os = new FileOutputStream(out)) {
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                }
                final Uri content = FileProvider.getUriForFile(
                        this, getPackageName() + ".fileprovider", out);
                String mime = MimeTypeMap.getSingleton()
                        .getMimeTypeFromExtension(extensionOf(name));
                final String type = mime != null ? mime : "*/*";
                runOnUiThread(() -> {
                    Intent view = new Intent(Intent.ACTION_VIEW);
                    view.setDataAndType(content, type);
                    view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    try {
                        startActivity(view);
                    } catch (ActivityNotFoundException e) {
                        Toast.makeText(this, R.string.no_app_found, Toast.LENGTH_SHORT).show();
                    }
                });
            } catch (Exception e) {
                runOnUiThread(() ->
                        Toast.makeText(this, R.string.cannot_open_file, Toast.LENGTH_SHORT).show());
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /* WebChromeClient: file uploads                                        */
    /* ------------------------------------------------------------------ */

    private class AppWebChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                         FileChooserParams params) {
            if (filePathCallback != null) filePathCallback.onReceiveValue(null);
            filePathCallback = callback;
            try {
                fileChooserLauncher.launch(params.createIntent());
            } catch (ActivityNotFoundException e) {
                filePathCallback.onReceiveValue(null);
                filePathCallback = null;
            }
            return true;
        }
    }

    /* ------------------------------------------------------------------ */
    /* Lifecycle                                                            */
    /* ------------------------------------------------------------------ */

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        io.shutdown();
        if (webView != null) {
            ((android.view.ViewGroup) webView.getParent()).removeView(webView);
            webView.destroy();
        }
        super.onDestroy();
    }
}
