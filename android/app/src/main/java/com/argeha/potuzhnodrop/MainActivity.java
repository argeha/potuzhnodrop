package com.argeha.potuzhnodrop;

import android.os.Build;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

/**
 * Native shell settings for the Potuzhno Drop web client.
 *
 * Gameplay still runs from the common web bundle, but these settings make the
 * bundle behave like a phone-first application: images are allowed to load
 * immediately, the cache is preserved between launches, and the keyboard
 * resizes the page instead of covering inputs.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void load() {
        super.load();
        configureWebView();
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    }

    private void configureWebView() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // Keep real skin artwork available in the native catalog and let the
        // WebView reuse its disk cache on the next app launch.
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setLoadsImagesAutomatically(true);
        settings.setBlockNetworkImage(false);
        settings.setDomStorageEnabled(true);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(true);

        // The site supplies its own mobile scroll affordances. Disabling the
        // Android overscroll glow avoids accidental pull effects in game UI.
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setScrollbarFadingEnabled(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }
    }
}
