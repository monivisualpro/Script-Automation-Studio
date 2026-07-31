import { initializeApp, getApps, getApp } from "firebase/app";
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

const ADMIN_EMAILS = ["tahsinirshad7370@gmail.com"];

export async function syncUserProfile(user: User, providerName: string = "password", customName?: string): Promise<UserProfile> {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  const fallbackAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`;
  const userEmail = (user.email || "").toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(userEmail);
  const role: "admin" | "user" = isAdmin ? "admin" : "user";

  if (!snap.exists()) {
    const newProfile: UserProfile = {
      userId: user.uid,
      name: customName || user.displayName || user.email?.split("@")[0] || "Script Author",
      email: user.email || "",
      profilePhoto: user.photoURL || fallbackAvatar,
      provider: providerName,
      role,
      isAdmin,
      apiKeyMasked: null,
      hasApiKey: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(userRef, {
      ...newProfile,
      encryptedApiKey: null,
    });

    if (isAdmin) {
      const adminRef = doc(db, "admins", user.uid);
      await setDoc(adminRef, {
        userId: user.uid,
        email: user.email || userEmail,
        role: "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return newProfile;
  } else {
    const data = snap.data();
    const storedRole = data.role || role;
    const finalIsAdmin = isAdmin || storedRole === "admin";
    const updated: UserProfile = {
      userId: user.uid,
      name: customName || data.name || user.displayName || user.email?.split("@")[0] || "Script Author",
      email: data.email || user.email || "",
      profilePhoto: data.profilePhoto || user.photoURL || fallbackAvatar,
      provider: data.provider || providerName,
      role: finalIsAdmin ? "admin" : "user",
      isAdmin: finalIsAdmin,
      apiKeyMasked: data.apiKeyMasked || null,
      hasApiKey: Boolean(data.encryptedApiKey || data.apiKeyMasked),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (finalIsAdmin) {
      const adminRef = doc(db, "admins", user.uid);
      await setDoc(adminRef, {
        userId: user.uid,
        email: data.email || user.email || userEmail,
        role: "admin",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return updated;
  }
}

export { app, auth, db, googleProvider, firebaseConfig };

/**
 * Helper authentication functions
 */
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

