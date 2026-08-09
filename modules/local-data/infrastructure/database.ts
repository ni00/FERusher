const DATABASE_NAME = "devrusher";
const DATABASE_VERSION = 4;

export const localStores = {
  questionProgress: "question-progress",
  settings: "settings",
  interviewSessions: "interview-sessions",
  learningPlans: "learning-plans",
  reviewEvents: "review-events",
  questionAnalyses: "question-analyses",
} as const;

let databasePromise: Promise<IDBDatabase> | undefined;

export function openLocalDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("当前浏览器不支持 IndexedDB"));
  }

  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("本地数据库升级被其他页面阻止"));
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(localStores.questionProgress)) {
        database.createObjectStore(localStores.questionProgress, {
          keyPath: "questionId",
        });
      }
      if (!database.objectStoreNames.contains(localStores.settings)) {
        database.createObjectStore(localStores.settings, { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains(localStores.interviewSessions)) {
        database.createObjectStore(localStores.interviewSessions, {
          keyPath: "id",
        });
      }
      if (!database.objectStoreNames.contains(localStores.learningPlans)) {
        database.createObjectStore(localStores.learningPlans, {
          keyPath: "id",
        });
      }
      if (!database.objectStoreNames.contains(localStores.reviewEvents)) {
        database.createObjectStore(localStores.reviewEvents, {
          keyPath: "id",
        });
      }
      if (!database.objectStoreNames.contains(localStores.questionAnalyses)) {
        database.createObjectStore(localStores.questionAnalyses, {
          keyPath: "id",
        });
      }
    };
  });

  return databasePromise;
}

export async function getAllRecords<T>(storeName: string): Promise<T[]> {
  const database = await openLocalDatabase();

  return new Promise((resolve, reject) => {
    const request = database
      .transaction(storeName, "readonly")
      .objectStore(storeName)
      .getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecord<T>(
  storeName: string,
  key: IDBValidKey
): Promise<T | undefined> {
  const database = await openLocalDatabase();

  return new Promise((resolve, reject) => {
    const request = database
      .transaction(storeName, "readonly")
      .objectStore(storeName)
      .get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function putRecord<T>(storeName: string, value: T): Promise<void> {
  const database = await openLocalDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function deleteRecord(
  storeName: string,
  key: IDBValidKey
): Promise<void> {
  const database = await openLocalDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const database = await openLocalDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function replaceRecords<T>(
  storeName: string,
  values: T[]
): Promise<void> {
  const database = await openLocalDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    store.clear();
    for (const value of values) store.put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
