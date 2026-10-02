import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  deleteUser,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";

import firebaseConfig from "../../firebase-applet-config.json";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
const googleProvider = new GoogleAuthProvider();

// Conditionally initialize free Firebase App Check (reCAPTCHA v3) when a site key is configured
if (typeof window !== "undefined" && firebaseConfig.recaptchaSiteKey && firebaseConfig.recaptchaSiteKey.trim() !== "") {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(firebaseConfig.recaptchaSiteKey.trim()),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn("Firebase App Check initialization skipped:", err);
  }
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  profilePhoto: string;
  provider: string;
  role: "admin" | "user";
  isAdmin: boolean;
  apiKeyMasked: string | null;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

const SOLE_ADMIN_EMAIL = "tahsinirshad7370@gmail.com";

function sanitizeString(value: string | null | undefined, maxLength: number, fallback = ""): string {
  const trimmed = (value || fallback).trim();
  return trimmed.slice(0, maxLength);
}

export async function syncUserProfile(user: User, providerName: string = "password", customName?: string): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, "users", user.uid);
  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }

  const fallbackAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`;
  const rawEmail = sanitizeString(user.email, 254, "");
  const userEmail = rawEmail.toLowerCase();
  const isSoleOwner = userEmail === SOLE_ADMIN_EMAIL;
  const role: "admin" | "user" = isSoleOwner ? "admin" : "user";

  const safeName = sanitizeString(
    customName || user.displayName || rawEmail.split("@")[0] || "Script Author",
    120,
    "Script Author"
  );
  const safePhoto = sanitizeString(user.photoURL, 1024, fallbackAvatar);
  const safeProvider = sanitizeString(providerName, 64, "password");
  const nowIso = new Date().toISOString().slice(0, 64);

  if (!snap.exists()) {
    const newProfile: UserProfile = {
      userId: user.uid.slice(0, 128),
      name: safeName,
      email: rawEmail,
      profilePhoto: safePhoto,
      provider: safeProvider,
      role,
      isAdmin: isSoleOwner,
      apiKeyMasked: null,
      hasApiKey: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await setDoc(userRef, {
        ...newProfile,
        encryptedApiKey: null,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, userPath);
    }

    return newProfile;
  } else {
    const data = snap.data();
    const updated: UserProfile = {
      userId: user.uid.slice(0, 128),
      name: sanitizeString(customName || data.name || safeName, 120, "Script Author"),
      email: sanitizeString(data.email || rawEmail, 254, ""),
      profilePhoto: sanitizeString(data.profilePhoto || safePhoto, 1024, fallbackAvatar),
      provider: sanitizeString(data.provider || safeProvider, 64, "password"),
      role: isSoleOwner ? "admin" : "user",
      isAdmin: isSoleOwner,
      apiKeyMasked: data.apiKeyMasked ? String(data.apiKeyMasked).slice(0, 64) : null,
      hasApiKey: Boolean(data.encryptedApiKey || data.apiKeyMasked),
      createdAt: data.createdAt ? String(data.createdAt).slice(0, 64) : nowIso,
      updatedAt: data.updatedAt ? String(data.updatedAt).slice(0, 64) : nowIso,
    };

    return updated;
  }
}

export { app, auth, db, googleProvider, firebaseConfig };

export const registerWithEmail = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const loginWithEmail = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const watchAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
