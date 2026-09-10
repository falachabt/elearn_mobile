import { supabase } from '@/lib/supabase';

/**
 * The OAuth redirect `com.ezadrive.elearn://auth/callback` is handled by three
 * independent listeners at once: WebBrowser.openAuthSessionAsync's own promise
 * result in GoogleLogin/AppleLogin, the expo-router deep link route
 * app/(callbacks)/auth/callback.tsx, and the global Linking listener in
 * DeepLinkHandler.ts. The authorization code is single-use, so whichever of
 * these calls supabase.auth.exchangeCodeForSession(code) second gets an
 * "invalid grant" error — surfacing as an intermittent login failure. Dedup by
 * code so only one exchange ever reaches the network; every caller awaits the
 * same result.
 */
const inFlight = new Map<string, ReturnType<typeof supabase.auth.exchangeCodeForSession>>();

export function exchangeCodeForSessionOnce(code: string) {
    let promise = inFlight.get(code);
    if (!promise) {
        promise = supabase.auth.exchangeCodeForSession(code);
        inFlight.set(code, promise);
        promise.finally(() => {
            setTimeout(() => inFlight.delete(code), 5000);
        });
    }
    return promise;
}
