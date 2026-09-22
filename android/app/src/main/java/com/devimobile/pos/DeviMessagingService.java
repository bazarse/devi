package com.devimobile.pos;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class DeviMessagingService extends com.capacitorjs.plugins.pushnotifications.MessagingService {
    private static final String CHANNEL_ID = "devi_deals";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        // Forward to Capacitor Push plugin
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        if (data != null && data.containsKey("dealId")) {
            createDealNotification(remoteMessage);
        }
    }

    private void createDealNotification(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String dealId = data.get("dealId");
        String productName = data.get("productName") != null ? data.get("productName") : "Device";
        String finalPrice = data.get("finalPrice") != null ? data.get("finalPrice") : "0";
        String customerName = data.get("customerName") != null ? data.get("customerName") : "Customer";
        String customerPhone = data.get("customerPhone") != null ? data.get("customerPhone") : "";
        String storeId = data.get("storeId") != null ? data.get("storeId") : "DM-01";
        String paymentMethod = data.get("paymentMethod") != null ? data.get("paymentMethod") : "Cash";
        String staff = data.get("salesPersonName") != null ? data.get("salesPersonName") : "Sales Staff";

        int notificationId = dealId != null ? Math.abs(dealId.hashCode()) : 1001;

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        // Ensure Channel exists with high priority
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Devi Deals & Approvals",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Push notifications for live sales approvals");
            channel.enableLights(true);
            channel.setLightColor(Color.BLUE);
            channel.enableVibration(true);
            notificationManager.createNotificationChannel(channel);
        }

        // 1. ACTION: [✅ APPROVE] (Bina App Khole One-Tap Background Approval)
        Intent approveIntent = new Intent(this, DealActionBroadcastReceiver.class);
        approveIntent.setAction("ACTION_APPROVE_DEAL");
        approveIntent.putExtra("dealId", dealId);
        approveIntent.putExtra("productName", productName);
        approveIntent.putExtra("notificationId", notificationId);
        PendingIntent approvePendingIntent = PendingIntent.getBroadcast(
                this,
                notificationId + 1,
                approveIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // 2. ACTION: [❌ REJECT] with RemoteInput Inline Reply (Notification Se Hi Reason Type Karke Reject)
        RemoteInput remoteInput = new RemoteInput.Builder(DealActionBroadcastReceiver.KEY_REJECT_REASON)
                .setLabel("Enter reason to reject...")
                .build();

        Intent rejectIntent = new Intent(this, DealActionBroadcastReceiver.class);
        rejectIntent.setAction("ACTION_REJECT_DEAL");
        rejectIntent.putExtra("dealId", dealId);
        rejectIntent.putExtra("productName", productName);
        rejectIntent.putExtra("notificationId", notificationId);
        PendingIntent rejectPendingIntent = PendingIntent.getBroadcast(
                this,
                notificationId + 2,
                rejectIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0))
        );

        NotificationCompat.Action rejectAction = new NotificationCompat.Action.Builder(
                R.drawable.ic_stat_devi,
                "❌ REJECT",
                rejectPendingIntent
        )
        .addRemoteInput(remoteInput)
        .build();

        // 3. ACTION: [✏️ EDIT DEAL] (Opens App Directly With Full Edit Form Pre-opened)
        Intent editIntent = new Intent(this, MainActivity.class);
        editIntent.setAction(Intent.ACTION_VIEW);
        editIntent.putExtra("url", "/admin/super/approvals?editDealId=" + dealId);
        editIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent editPendingIntent = PendingIntent.getActivity(
                this,
                notificationId + 3,
                editIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // Formatted BigText for Expandable View
        String bigText = "📱 Product: " + productName + "\n"
                + "💰 Agreed Price: ₹" + finalPrice + " (" + paymentMethod + ")\n"
                + "👤 Customer: " + customerName + (customerPhone.isEmpty() ? "" : " • " + customerPhone) + "\n"
                + "🏪 Branch: " + storeId + " | Staff: " + staff + "\n\n"
                + "👉 [Approve] or [Reject] right here, or tap [Edit Deal] to modify!";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_devi)
                .setContentTitle("🚨 Pending Deal Approval • ₹" + finalPrice)
                .setContentText("📱 " + productName + " | " + storeId + " | Tap to review")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(bigText))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(editPendingIntent)
                .addAction(R.drawable.ic_stat_devi, "✅ APPROVE", approvePendingIntent)
                .addAction(rejectAction)
                .addAction(R.drawable.ic_stat_devi, "✏️ EDIT DEAL", editPendingIntent);

        notificationManager.notify(notificationId, builder.build());
    }
}
