import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize the Firebase app
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets scope
provider.addScope("https://www.googleapis.com/auth/spreadsheets");

// Caching variables
let isSigningIn = false;
let cachedAccessToken: string | null = sessionStorage.getItem("quanto_google_access_token");

/**
 * Initializes the auth listener.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Since Firebase Auth doesn't persist the provider raw OAuth credential/access-token
        // across page reloads in standard onAuthStateChanged, we can ask user to press sign-in or
        // we'll require a fresh signInWithPopup if the token is null.
        cachedAccessToken = null;
        sessionStorage.removeItem("quanto_google_access_token");
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem("quanto_google_access_token");
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Perform a pop-up sign in flow.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Gagal memperoleh token akses Google Sheets dari login Firebase.");
    }

    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem("quanto_google_access_token", cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Kesalahan login Google:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve current cached access token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out of current session.
 */
export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  sessionStorage.removeItem("quanto_google_access_token");
};
