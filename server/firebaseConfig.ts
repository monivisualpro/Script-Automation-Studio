import fs from "fs";
import path from "path";

export interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  [key: string]: any;
}

const DEFAULT_FIREBASE_CONFIG: FirebaseAppletConfig = {
  projectId: "script-automation-studio",
  appId: "1:213799464433:web:4e2a4bb3935976ad60a850",
  apiKey: "AIzaSyCf4GIuPVF53dNYzFGV59tebGzNcPpJXJQ",
  authDomain: "script-automation-studio.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-scriptautomation-e15f32ee-b60f-4480-a137-b06b15abddef",
  storageBucket: "script-automation-studio.firebasestorage.app",
  messagingSenderId: "213799464433",
};

export function loadFirebaseServerConfig(): FirebaseAppletConfig {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (parsed && typeof parsed === "object" && parsed.apiKey && parsed.projectId) {
        return {
          ...DEFAULT_FIREBASE_CONFIG,
          ...parsed,
          firestoreDatabaseId:
            (typeof parsed.firestoreDatabaseId === "string" && parsed.firestoreDatabaseId.trim()) ||
            (process.env.FIREBASE_DATABASE_ID ? process.env.FIREBASE_DATABASE_ID.trim() : "") ||
            "(default)",
        };
      }
    }
  } catch {
    // Fall back to default project config
  }

  return {
    ...DEFAULT_FIREBASE_CONFIG,
    ...(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : {}),
    ...(process.env.FIREBASE_API_KEY ? { apiKey: process.env.FIREBASE_API_KEY } : {}),
    ...(process.env.FIREBASE_DATABASE_ID
      ? { firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID }
      : {}),
  };
}
