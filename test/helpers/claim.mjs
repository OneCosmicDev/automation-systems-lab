import { workerData, parentPort } from 'node:worker_threads';
import { Store } from '../../src/store.mjs';
const store = new Store(workerData.file);
const won = Boolean(store.claim(workerData.id, workerData.owner));
store.close(); parentPort.postMessage(won);
