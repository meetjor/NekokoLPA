import {Adapter} from '@/lpa/adapters/Adapter';
import {CustomHttp} from '@/lpa/bridge/nativeModules';
import {CLA_PROPRIETARY, LpaDispatcher, channelClaHex} from '@/lpa/core';

/** Status word returned to the card when an APDU transmit fails locally. */
const SW_TRANSMIT_FAILED = '6000';

/** MTU the 9eSIM Bluetooth writer needs for chunked APDUs. */
const NINE_ESIM_APDU_MTU = 63;

import type {LpaExecutor} from '../types/commands';
export type {LpaExecutor} from '../types/commands';

/**
 * One dispatcher per device.
 *
 * Unlike the wasm runtime this replaced, the LPA is not a singleton: each
 * device gets its own instance, which also keeps its open download sessions
 * (the `_internal` handle returned by `authenticate_profile`) alive between
 * commands. `Adapter.execute` calls `setupDevice` on every command, so these
 * are cached rather than rebuilt each time.
 */
const dispatchers = new WeakMap<Adapter, LpaDispatcher>();

/**
 * Builds (or reuses) the LPA for `adapter`'s device and installs the resulting
 * executor on the adapter.
 *
 * The adapters open the logical channel and SELECT the ISD-R when they
 * connect, so the LPA itself only speaks ES10 over STORE DATA / GET RESPONSE.
 */
export async function setupDevice(adapter: Adapter): Promise<LpaExecutor> {
  let dispatcher = dispatchers.get(adapter);

  if (!dispatcher) {
    dispatcher = new LpaDispatcher({
      transmit: async (apdu: string) => {
        try {
          if (adapter.obsolete) throw new Error('Device disconnected');
          // Rewrite the class byte to target this device's logical channel.
          const channel = parseInt(adapter.device.channel ?? '1', 16);
          return await adapter.device.transmit(
            channelClaHex(channel, CLA_PROPRIETARY) + apdu.substring(2),
          );
        } catch (error) {
          console.warn('[LPA] APDU transport failed');
          return SW_TRANSMIT_FAILED;
        }
      },

      http: async (url: string, body: string) => {
        try {
          return await CustomHttp.sendHttpRequest(url, body);
        } catch (error) {
          console.warn('[LPA] HTTPS request failed');
          throw error;
        }
      },

      onProgress: (message: string, progress: number, total: number) => {
        if (!adapter.obsolete) adapter.callback({message, progress, total});
      },

      maxSegment: adapter.device.type === 'ble_9el' ? NINE_ESIM_APDU_MTU : undefined,
    });
    dispatchers.set(adapter, dispatcher);
  }

  // The channel is renegotiated on every reconnect.
  dispatcher.setChannel(parseInt(adapter.device.channel ?? '1', 16));

  const execute: LpaExecutor = (command, args) => dispatcher.execute(command, args);
  adapter._execute = execute;
  return execute;
}
