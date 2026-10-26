import { CanceledError } from 'axios';
import { confirmAction } from '@/core/utils/themedSwal';
import { captureCriticalAction, consumeConfirmation } from '@/core/utils/confirmationContext';
import { criticalAction, requestBody } from './criticalActionPolicy';

let dialogQueue = Promise.resolve();
const pending = new Set();
const files = new WeakMap();
let fileSequence = 0;
const stable = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof URLSearchParams) return Array.from(value.entries());
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    if (!files.has(value)) files.set(value, ++fileSequence);
    return { file: files.get(value), name: value.name, size: value.size };
  }
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
};
const fingerprint = (config) => JSON.stringify([config.method, config.baseURL, config.url, stable(config.params),
  stable(typeof FormData !== 'undefined' && config.data instanceof FormData ? Array.from(config.data.entries()) : requestBody(config))]);

export const cancelledAction = (config) => Object.assign(new CanceledError('Action cancelled. No changes were made.'), { isActionCancelled: true, config });

export function captureConfirmationOptions(instance) {
  for (const method of ['post', 'put', 'patch', 'delete']) {
    const send = instance[method].bind(instance);
    instance[method] = (...args) => {
      const options = captureCriticalAction();
      if (options) {
        const index = method === 'delete' ? 1 : 2;
        args[index] = { ...args[index], criticalAction: options, ...(options.confirmation ? { confirmation: options.confirmation } : {}) };
      }
      return send(...args);
    };
  }
}

export async function requireCriticalConfirmation(config) {
  if (config.data && typeof config.data === 'object' && config.data.__sheriaConfirmation) {
    const { __sheriaConfirmation, ...body } = config.data;
    config.data = body;
    config.confirmation ||= __sheriaConfirmation;
  }
  const policy = criticalAction(config);
  if (!policy) return config;
  const key = fingerprint(config);
  // Axios retries keep approval only for the exact original method, path and
  // body. A new request or changed body must be confirmed again.
  if (config._retry && config._criticalFingerprint === key) return config;
  if (config._criticalPending && config._criticalPending !== key) pending.delete(config._criticalPending);
  if (pending.has(key)) throw cancelledAction(config);
  pending.add(key);
  config._criticalPending = key;
  if (consumeConfirmation(config.confirmation)) {
    config._criticalFingerprint = key;
    return config;
  }
  const ask = async () => {
    if (config.signal?.aborted) throw cancelledAction(config);
    const answer = await confirmAction({ ...policy, ...config.criticalAction });
    if (!answer || config.signal?.aborted) throw cancelledAction(config);
    config._criticalFingerprint = key;
    return config;
  };
  const result = dialogQueue.then(ask);
  dialogQueue = result.catch(() => {});
  try { return await result; }
  catch (error) { releaseCriticalAction(config); throw error; }
}

export function releaseCriticalAction(config) {
  if (config?._criticalPending) pending.delete(config._criticalPending);
  if (config) {
    delete config._criticalFingerprint;
    delete config._criticalPending;
    delete config.confirmation;
  }
}
