import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const safeArray = (value) => Array.isArray(value) ? value.filter(isRecord) : [];
const safeAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
};

const normalizeAssistantState = (value) => ({
  pendingConfirmation: isRecord(value?.pendingConfirmation) ? value.pendingConfirmation : null
});

export function normalizeAppState(value, now = () => new Date().toISOString()) {
  if (!isRecord(value)) throw new TypeError('state 必須是物件');

  return {
    schemaVersion: 2,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now(),
    monthlyBudget: safeAmount(value.monthlyBudget),
    settings: isRecord(value.settings) ? value.settings : {},
    transactions: safeArray(value.transactions),
    goals: safeArray(value.goals),
    recurring: safeArray(value.recurring),
    barcode: typeof value.barcode === 'string' ? value.barcode : '',
    theme: ['system', 'light', 'dark'].includes(value.theme) ? value.theme : 'system',
    onboardingCompleted: value.onboardingCompleted === true,
    assistant: normalizeAssistantState(value.assistant)
  };
}

export function createFileStateStore({ filePath, now = () => new Date().toISOString() }) {
  if (!filePath) throw new TypeError('filePath 為必填');

  let pendingWrite = Promise.resolve();
  let writeSequence = 0;

  const afterPendingWrite = (operation) => {
    const result = pendingWrite.then(operation, operation);
    pendingWrite = result.catch(() => {});
    return result;
  };

  const readState = async () => {
    try {
      const document = JSON.parse(await readFile(filePath, 'utf8'));
      if (document?.state == null) return null;
      return normalizeAppState(document.state, now);
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  };

  return {
    async load() {
      await pendingWrite;
      return readState();
    },

    async save(value) {
      return afterPendingWrite(async () => {
        const state = normalizeAppState({ ...value, updatedAt: now() }, now);
        const temporaryPath = `${filePath}.${process.pid}.${writeSequence += 1}.tmp`;
        await mkdir(dirname(filePath), { recursive: true });
        try {
          await writeFile(temporaryPath, JSON.stringify({ state }, null, 2), 'utf8');
          await rename(temporaryPath, filePath);
        } finally {
          await rm(temporaryPath, { force: true });
        }
        return state;
      });
    },

    async clear() {
      await afterPendingWrite(() => rm(filePath, { force: true }));
    }
  };
}

const USER_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

export function validateUserId(userId) {
  if (typeof userId !== 'string' || !USER_ID_PATTERN.test(userId)) {
    throw new TypeError('裝置識別格式不正確');
  }
  return userId;
}

export function createPartitionedFileStateStore({ directoryPath, legacyFilePath, now = () => new Date().toISOString() }) {
  if (!directoryPath) throw new TypeError('directoryPath 為必填');

  const stores = new Map();

  const storeFor = (userId) => {
    const validUserId = validateUserId(userId);
    if (!stores.has(validUserId)) {
      stores.set(validUserId, createFileStateStore({
        filePath: join(directoryPath, `${validUserId}.json`),
        now
      }));
    }
    return stores.get(validUserId);
  };

  const claimLegacyState = async (userId) => {
    if (!legacyFilePath) return;
    await mkdir(directoryPath, { recursive: true });
    const targetPath = join(directoryPath, `${validateUserId(userId)}.json`);
    try {
      await rename(legacyFilePath, targetPath);
    } catch (error) {
      if (!['ENOENT', 'EEXIST'].includes(error?.code)) throw error;
    }
  };

  return {
    async load(userId, { claimLegacy = false } = {}) {
      const store = storeFor(userId);
      const state = await store.load();
      if (state || !claimLegacy) return state;
      await claimLegacyState(userId);
      return store.load();
    },

    async save(userId, value) {
      return storeFor(userId).save(value);
    },

    async clear(userId) {
      return storeFor(userId).clear();
    }
  };
}
