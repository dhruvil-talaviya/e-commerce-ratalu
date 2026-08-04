"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Google Identity Services (GIS) — credential response type.
 * The `credential` field is a JWT (ID token) that the backend can verify.
 */
interface GoogleCredentialResponse {
  credential: string; // JWT ID Token
  select_by?: string;
  clientId?: string;
}

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  avatar: string;
  idToken: string; // raw JWT for server-side verification
}

interface UseGoogleAuthOptions {
  onSuccess: (user: GoogleUser) => void;
  onError?: (error: string) => void;
}

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "298921708703-77b3962ci5p0bkul4fntq8urmma2f2m9.apps.googleusercontent.com";

/**
 * Decodes a JWT token payload without verification (client-side only).
 * The backend MUST verify the token server-side for security.
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

/**
 * Hook to integrate Google Identity Services (Sign In with Google).
 * Loads the GIS script, initialises the client, and exposes a `signIn()` trigger.
 *
 * Flow:
 * 1. User clicks "Continue with Google"
 * 2. Google popup appears → user sees their email & Google privacy consent
 * 3. User selects their account and grants access
 * 4. Google returns a credential (JWT ID token)
 * 5. onSuccess is called with the user's real email, name, avatar
 */
if (typeof window !== "undefined") {
  const isGsiError = (msg: string) =>
    msg.includes("GSI_LOGGER") ||
    msg.includes("FedCM") ||
    msg.includes("AbortError") ||
    msg.includes("signal is aborted") ||
    msg.includes("origin is not allowed");

  window.addEventListener("unhandledrejection", (e) => {
    const msg = String(e.reason?.message || e.reason?.stack || e.reason || "");
    if (isGsiError(msg)) {
      e.preventDefault();
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener("error", (e) => {
    const msg = String(e.message || e.error || "");
    if (isGsiError(msg)) {
      e.preventDefault();
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    }
  }, true);
}

export function useGoogleAuth({ onSuccess, onError }: UseGoogleAuthOptions) {
  const initializedRef = useRef(false);
  const callbackRef = useRef(onSuccess);
  const errorRef = useRef(onError);

  // Keep refs current without re-initialising
  callbackRef.current = onSuccess;
  errorRef.current = onError;

  useEffect(() => {
    if (initializedRef.current) return;
    if (!GOOGLE_CLIENT_ID) {
      console.error("[GoogleAuth] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");
      return;
    }

    // Load GIS script if not already present
    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleClient();
      script.onerror = () =>
        errorRef.current?.("Failed to load Google Sign-In. Please try again.");
      document.head.appendChild(script);
    } else {
      // Script already loaded, just initialise
      if ((window as any).google?.accounts?.id) {
        initGoogleClient();
      } else {
        existingScript.addEventListener("load", () => initGoogleClient());
      }
    }

    function initGoogleClient() {
      if (initializedRef.current) return;
      initializedRef.current = true;

      (window as any).google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
        ux_mode: "popup",
      });
    }

    function handleCredentialResponse(response: GoogleCredentialResponse) {
      try {
        const payload = decodeJwtPayload(response.credential);
        const user: GoogleUser = {
          googleId: payload.sub as string,
          email: payload.email as string,
          name: payload.name as string,
          avatar: (payload.picture as string) || "",
          idToken: response.credential,
        };
        callbackRef.current(user);
      } catch {
        errorRef.current?.("Failed to process Google credentials.");
      }
    }

    return () => {
      try {
        (window as any).google?.accounts?.id?.cancel();
      } catch {
        // Ignore unmount cancel error
      }
    };
  }, []);

  const signIn = useCallback(() => {
    const google = (window as any).google;
    if (!google?.accounts?.id) {
      errorRef.current?.(
        "Google Sign-In is not ready yet. Please wait a moment and try again."
      );
      return;
    }

    google.accounts.id.prompt();
  }, []);

  const renderButton = useCallback((container: HTMLElement) => {
    const google = (window as any).google;
    if (google?.accounts?.id && container) {
      google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 280,
      });
    }
  }, []);

  return { signIn, renderButton };
}
