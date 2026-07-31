import firebaseConfig from "../firebase-applet-config.json" with { type: "json" };

function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return null;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return parseFloat(val.doubleValue);
  if ("booleanValue" in val) return val.booleanValue;
  if ("nullValue" in val) return null;
  if ("timestampValue" in val) return val.timestampValue;
  if ("mapValue" in val) return parseFirestoreFields(val.mapValue.fields);
  if ("arrayValue" in val) {
    const values = val.arrayValue.values || [];
    return values.map((v: any) => parseFirestoreValue(v));
  }
  return null;
}

export function parseFirestoreFields(fields: Record<string, any> | undefined): Record<string, any> {
  if (!fields) return {};
  const result: Record<string, any> = {};
  for (const [key, valueObj] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(valueObj);
  }
  return result;
}

function encodeFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === "string") {
    return { stringValue: val };
  }
  if (typeof val === "boolean") {
    return { booleanValue: val };
  }
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return { integerValue: val.toString() };
    }
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => encodeFirestoreValue(item)),
      },
    };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = encodeFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function encodeFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = encodeFirestoreValue(v);
  }
  return fields;
}

const getBaseUrl = () => {
  const projectId = firebaseConfig.projectId;
  const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents`;
};

export async function getFirestoreDoc(
  collectionPath: string,
  docId: string,
  idToken: string
): Promise<{ exists: boolean; data?: Record<string, any> }> {
  const url = `${getBaseUrl()}/${collectionPath}/${docId}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (response.status === 404) {
    return { exists: false };
  }
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore REST get failed (${response.status}): ${errText}`);
  }

  const json = await response.json();
  return { exists: true, data: parseFirestoreFields(json.fields) };
}

export async function updateFirestoreDoc(
  collectionPath: string,
  docId: string,
  data: Record<string, any>,
  idToken: string
): Promise<Record<string, any>> {
  const keys = Object.keys(data);
  const updateMask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const url = `${getBaseUrl()}/${collectionPath}/${docId}?${updateMask}`;

  const fields = encodeFirestoreFields(data);
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore REST update failed (${response.status}): ${errText}`);
  }
  const json = await response.json();
  return parseFirestoreFields(json.fields);
}

export async function deleteFirestoreDoc(
  collectionPath: string,
  docId: string,
  idToken: string
): Promise<void> {
  const url = `${getBaseUrl()}/${collectionPath}/${docId}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errText = await response.text();
    throw new Error(`Firestore REST delete failed (${response.status}): ${errText}`);
  }
}

export async function listFirestoreCollection(
  collectionPath: string,
  idToken: string
): Promise<Array<{ id: string; data: Record<string, any> }>> {
  const url = `${getBaseUrl()}/${collectionPath}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore REST list failed (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const docs = json.documents || [];
  return docs.map((doc: any) => {
    const parts = (doc.name || "").split("/");
    const id = parts[parts.length - 1];
    return {
      id,
      data: parseFirestoreFields(doc.fields),
    };
  });
}
