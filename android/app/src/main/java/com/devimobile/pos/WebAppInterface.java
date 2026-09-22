package com.devimobile.pos;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

/**
 * JavaScript bridge exposed as window.AndroidApp in the WebView.
 * Allows the web login page to persist user identity into Android
 * SharedPreferences and triggers native Android Print Spooler.
 */
public class WebAppInterface {

    private final Context context;
    private final WebView webView;

    public WebAppInterface(Context context, WebView webView) {
        this.context = context;
        this.webView = webView;
    }

    public WebAppInterface(Context context) {
        this(context, null);
    }

    /**
     * Triggers native Android PrintManager on the active WebView
     * when salesman / admin taps "Print Invoice" inside the app.
     */
    @JavascriptInterface
    public void printInvoice() {
        if (webView != null && context instanceof Activity) {
            ((Activity) context).runOnUiThread(() -> {
                try {
                    PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
                    if (printManager != null) {
                        String jobName = "Devi_Invoice_" + System.currentTimeMillis();
                        PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(jobName);
                        printManager.print(jobName, printAdapter, new PrintAttributes.Builder().build());
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }
    }

    /**
     * Called from JS after successful login:
     *   window.AndroidApp.saveUserProfile(name, phone, role)
     */
    @JavascriptInterface
    public void saveUserProfile(String name, String phone, String role) {
        SharedPreferences prefs = context.getSharedPreferences("devi_prefs", Context.MODE_PRIVATE);
        prefs.edit()
                .putString("user_name", name)
                .putString("user_phone", phone)
                .putString("user_role", role)
                .apply();
    }

    /**
     * Called from JS to clear profile on logout:
     *   window.AndroidApp.clearUserProfile()
     */
    @JavascriptInterface
    public void clearUserProfile() {
        SharedPreferences prefs = context.getSharedPreferences("devi_prefs", Context.MODE_PRIVATE);
        prefs.edit()
                .remove("user_name")
                .remove("user_phone")
                .remove("user_role")
                .apply();
    }

    /** Utility: JS can read back the stored name for debugging. */
    @JavascriptInterface
    public String getUserName() {
        SharedPreferences prefs = context.getSharedPreferences("devi_prefs", Context.MODE_PRIVATE);
        return prefs.getString("user_name", "");
    }

    /**
     * Directly launches system browser (Chrome) from Web context to download APK
     */
    @JavascriptInterface
    public void openExternalBrowser(String url) {
        if (context instanceof Activity) {
            ((Activity) context).runOnUiThread(() -> {
                try {
                    android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url));
                    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }
    }
}
