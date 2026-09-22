package com.devimobile.pos;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;
import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class DealActionBroadcastReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "devi_deals";
    public static final String KEY_REJECT_REASON = "key_reject_reason";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        final String dealId = intent.getStringExtra("dealId");
        final String productName = intent.getStringExtra("productName") != null ? intent.getStringExtra("productName") : "Device";
        final int notificationId = intent.getIntExtra("notificationId", 1001);

        if (dealId == null || dealId.isEmpty()) return;

        // 1. DIRECT APPROVE (NO APP OPENING)
        if ("ACTION_APPROVE_DEAL".equals(action)) {
            new Handler(Looper.getMainLooper()).post(() -> {
                Toast.makeText(context, "⏳ Approving " + productName + "...", Toast.LENGTH_SHORT).show();
            });

            new Thread(() -> {
                try {
                    String approver = resolveApproverName(context);
                    String payload = "{\"dealId\": \"" + dealId + "\", \"action\": \"approve\", \"decidedBy\": \"" + approver + "\"}";
                    int responseCode = sendPostRequest(payload);

                    if (responseCode >= 200 && responseCode < 300) {
                        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                        NotificationCompat.Builder updated = new NotificationCompat.Builder(context, CHANNEL_ID)
                                .setSmallIcon(R.drawable.ic_stat_devi)
                                .setContentTitle("✅ Deal Approved • " + productName)
                                .setContentText("Approved by " + approver + ". GST Bill generated & salesman notified!")
                                .setAutoCancel(true)
                                .setPriority(NotificationCompat.PRIORITY_HIGH);

                        if (notificationManager != null) {
                            notificationManager.notify(notificationId, updated.build());
                        }

                        new Handler(Looper.getMainLooper()).post(() -> {
                            Toast.makeText(context, "🎉 " + productName + " Approved Successfully!", Toast.LENGTH_LONG).show();
                        });
                    } else {
                        new Handler(Looper.getMainLooper()).post(() -> {
                            Toast.makeText(context, "⚠️ Approval failed (" + responseCode + ")", Toast.LENGTH_LONG).show();
                        });
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        }

        // 2. DIRECT REJECT WITH INLINE REASON (NO APP OPENING)
        else if ("ACTION_REJECT_DEAL".equals(action)) {
            Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
            String reason = "Price / Financing mismatch";
            if (remoteInput != null) {
                CharSequence inputChar = remoteInput.getCharSequence(KEY_REJECT_REASON);
                if (inputChar != null && inputChar.length() > 0) {
                    reason = inputChar.toString().trim();
                }
            }

            final String finalReason = reason;

            new Handler(Looper.getMainLooper()).post(() -> {
                Toast.makeText(context, "⏳ Rejecting " + productName + "...", Toast.LENGTH_SHORT).show();
            });

            new Thread(() -> {
                try {
                    String approver = resolveApproverName(context);
                    String sanitizedReason = finalReason.replace("\"", "\\\"");
                    String payload = "{\"dealId\": \"" + dealId + "\", \"action\": \"reject\", \"decidedBy\": \"" + approver + "\", \"rejectionReason\": \"" + sanitizedReason + "\"}";
                    int responseCode = sendPostRequest(payload);

                    if (responseCode >= 200 && responseCode < 300) {
                        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                        NotificationCompat.Builder updated = new NotificationCompat.Builder(context, CHANNEL_ID)
                                .setSmallIcon(R.drawable.ic_stat_devi)
                                .setContentTitle("⚠️ Deal Rejected • " + productName)
                                .setContentText("Rejected by " + approver + ": \"" + finalReason + "\". Salesman notified.")
                                .setAutoCancel(true)
                                .setPriority(NotificationCompat.PRIORITY_HIGH);

                        if (notificationManager != null) {
                            notificationManager.notify(notificationId, updated.build());
                        }

                        new Handler(Looper.getMainLooper()).post(() -> {
                            Toast.makeText(context, "⚠️ " + productName + " Rejected: " + finalReason, Toast.LENGTH_LONG).show();
                        });
                    } else {
                        new Handler(Looper.getMainLooper()).post(() -> {
                            Toast.makeText(context, "⚠️ Rejection failed (" + responseCode + ")", Toast.LENGTH_LONG).show();
                        });
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }

    private String resolveApproverName(Context context) {
        try {
            android.content.SharedPreferences prefs = context.getSharedPreferences("devi_prefs", Context.MODE_PRIVATE);
            String name = prefs.getString("user_name", null);
            if (name != null && !name.trim().isEmpty()) {
                return name.trim();
            }
            String phone = prefs.getString("user_phone", "");
            if ("9926598700".equals(phone)) {
                return "Prince Verma (Kanthal Manager)";
            } else if ("7828915933".equals(phone)) {
                return "Manav Sharma (Freeganj Manager)";
            } else if ("9893264192".equals(phone)) {
                return "Dilip Kishnani (Super Admin HQ)";
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return "Store Manager";
    }

    private int sendPostRequest(String jsonPayload) throws Exception {
        URL url = new URL("https://devi-rho.vercel.app/api/deals/action");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json; utf-8");
        conn.setRequestProperty("Accept", "application/json");
        conn.setDoOutput(true);
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(10000);

        try (OutputStream os = conn.getOutputStream()) {
            byte[] input = jsonPayload.getBytes("utf-8");
            os.write(input, 0, input.length);
        }
        return conn.getResponseCode();
    }
}
