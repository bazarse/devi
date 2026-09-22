package com.devimobile.pos;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 1. Request Runtime Permissions on App Launch (Camera, Bluetooth, Notifications)
        requestAppPermissions();

        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                
                // 2. Custom User Agent for App identification
                String currentUserAgent = settings.getUserAgentString();
                if (!currentUserAgent.contains("DeviMobileApp")) {
                    settings.setUserAgentString(currentUserAgent + " DeviMobileApp/2.5.0");
                }

                // 3. Enable DOM Storage (localStorage/sessionStorage) persistence
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setMediaPlaybackRequiresUserGesture(false);

                // 4. Ensure Cookies persist across app restarts
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);
                cookieManager.flush();

                // 5. Automatic WebChromeClient Camera & Media Permission Bridge
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        runOnUiThread(() -> {
                            request.grant(request.getResources());
                        });
                    }
                });

                // 6. Native JS Bridge to sync active staff profile into Android SharedPreferences and print
                webView.addJavascriptInterface(new WebAppInterface(this, webView), "AndroidApp");

                // 7. Native DownloadListener so APK downloads trigger Android DownloadManager
                webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
                    try {
                        android.app.DownloadManager.Request request = new android.app.DownloadManager.Request(android.net.Uri.parse(url));
                        if (mimeType != null && !mimeType.trim().isEmpty()) {
                            request.setMimeType(mimeType);
                        }
                        String cookies = CookieManager.getInstance().getCookie(url);
                        if (cookies != null) {
                            request.addRequestHeader("cookie", cookies);
                        }
                        if (userAgent != null) {
                            request.addRequestHeader("User-Agent", userAgent);
                        }
                        request.setDescription("Downloading Devi Mobile POS APK...");
                        String filename = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType);
                        if (filename == null || !filename.endsWith(".apk")) {
                            filename = "Devi-Mobile-POS.apk";
                        }
                        request.setTitle(filename);
                        request.allowScanningByMediaScanner();
                        request.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, filename);

                        android.app.DownloadManager dm = (android.app.DownloadManager) getSystemService(android.content.Context.DOWNLOAD_SERVICE);
                        if (dm != null) {
                            dm.enqueue(request);
                            android.widget.Toast.makeText(getApplicationContext(), "Downloading update: " + filename, android.widget.Toast.LENGTH_SHORT).show();
                        }
                    } catch (Exception e) {
                        try {
                            android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url));
                            i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(i);
                        } catch (Exception ex) {
                            ex.printStackTrace();
                        }
                    }
                });

                // 8. Handle notification intent deep-links on launch
                handleDeepLink(getIntent());
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
    }

    private void handleDeepLink(android.content.Intent intent) {
        if (intent == null) return;
        String targetUrl = intent.getStringExtra("url");
        if (targetUrl != null && !targetUrl.trim().isEmpty()) {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView webView = getBridge().getWebView();
                    String cleanUrl = targetUrl.trim();
                    if (cleanUrl.startsWith("/")) {
                        String currentUrl = webView.getUrl();
                        if (currentUrl != null && (currentUrl.startsWith("http://") || currentUrl.startsWith("https://"))) {
                            android.net.Uri uri = android.net.Uri.parse(currentUrl);
                            String fullUrl = uri.getScheme() + "://" + uri.getAuthority() + cleanUrl;
                            webView.post(() -> webView.loadUrl(fullUrl));
                        } else {
                            webView.post(() -> webView.loadUrl("https://devi-mobile.vercel.app" + cleanUrl));
                        }
                    } else {
                        webView.post(() -> webView.loadUrl(cleanUrl));
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void requestAppPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> neededPermissions = new ArrayList<>();

            // Camera for IMEI & Barcode Scanning
            if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                neededPermissions.add(Manifest.permission.CAMERA);
            }

            // Android 13+ (API 33+) Push Notifications
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    neededPermissions.add(Manifest.permission.POST_NOTIFICATIONS);
                }
            }

            // Android 12+ (API 31+) Bluetooth Connect & Scan for Thermal POS Printers
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                    neededPermissions.add(Manifest.permission.BLUETOOTH_CONNECT);
                }
                if (checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                    neededPermissions.add(Manifest.permission.BLUETOOTH_SCAN);
                }
            }

            if (!neededPermissions.isEmpty()) {
                requestPermissions(neededPermissions.toArray(new String[0]), PERMISSION_REQUEST_CODE);
            }
        }
    }
}


