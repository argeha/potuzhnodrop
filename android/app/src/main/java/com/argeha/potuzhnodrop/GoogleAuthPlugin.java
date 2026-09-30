package com.argeha.potuzhnodrop;

import android.content.Intent;
import androidx.activity.result.ActivityResult;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PluginMethod;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

/**
 * Opens Android's own Google account chooser and returns an ID token to the
 * bundled client.  The token is never trusted by the application: the
 * Cloudflare Worker validates Google’s signature and audience before a
 * Potuzhno session is created.
 */
@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {

    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = call.getString("serverClientId", "").trim();
        if (!serverClientId.matches("^[0-9A-Za-z-]+\\.apps\\.googleusercontent\\.com$")) {
            call.reject("Некоректний Google Client ID.");
            return;
        }

        GoogleSignInOptions options = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(serverClientId)
            .requestEmail()
            .build();
        GoogleSignInClient client = GoogleSignIn.getClient(getActivity(), options);
        // Clearing an old Google Play Services selection makes the account
        // picker explicit and lets a player choose a different Google account.
        client.signOut().addOnCompleteListener(task -> {
            Intent intent = client.getSignInIntent();
            startActivityForResult(call, intent, "handleGoogleSignIn");
        });
    }

    @ActivityCallback
    private void handleGoogleSignIn(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getData() == null) {
            call.reject("Вхід через Google скасовано.");
            return;
        }
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(result.getData());
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            String idToken = account != null ? account.getIdToken() : null;
            if (idToken == null || idToken.isEmpty()) {
                call.reject("Google не повернув токен входу.");
                return;
            }
            JSObject response = new JSObject();
            response.put("idToken", idToken);
            call.resolve(response);
        } catch (ApiException error) {
            call.reject("Google не підтвердив вхід (код " + error.getStatusCode() + ").", error);
        }
    }
}
