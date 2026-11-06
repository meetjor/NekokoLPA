import {Dispatch} from '@reduxjs/toolkit';

import {Adapters} from '@/lpa/adapters/registry';
import type {DownloadResult, NotificationResult} from '@/lpa/types/operations';
import {setupDevice} from '@/lpa/bridge/runtime';
import {setDeviceState} from '@/store/slices';
import type {DeviceState} from '@/store/slices';
import type {EuiccInfoResult, Notification, ProgressUpdate} from '@/lpa/types/euicc';
import type {ProfileMetadataMap} from '@/lpa/types/profile';

/** Arguments accepted by an LPA command. */
export type LpaArg = string | number;

/**
 * How long to let a card settle after a state-changing operation before we read
 * profiles back. Disabling needs the longest pause because the modem drops and
 * re-attaches. Device types absent here (ccid, ble_9el) settle immediately,
 * matching the original behaviour.
 */
const SETTLE_MS: Record<string, {disable: number; standard: number}> = {
  omapi: {disable: 1000, standard: 500},
  ble: {disable: 300, standard: 200},
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * A physical or virtual eUICC carrier: an on-device eSIM (OMAPI), a USB CCID
 * reader, or a Bluetooth writer. Implementations only need to move APDUs.
 */
export interface Device {
  available: boolean;
  slotAvailable?: boolean;
  description?: string;
  signatures?: string;
  channel: string;
  type: string;
  deviceName: string;
  displayName: string;
  deviceId: string;
  explicitConnectionRequired: boolean;
  connect: () => Promise<boolean>;
  accessRule?: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  refresh: () => Promise<boolean>;
  reconnect: () => Promise<boolean>;
  transmit: (apdu: string) => Promise<string>;
}

/**
 * Drives one {@link Device} through the LPA (Local Profile Assistant) protocol
 * and mirrors the results into Redux so screens can render them.
 *
 * Instances are interned in {@link Adapters} by device id — constructing an
 * Adapter for a device that already has one returns the existing instance.
 */
export class Adapter {
  obsolete = false;
  connected = false;
  eid = '';
  deviceId = '';
  device: Device;
  profiles: ProfileMetadataMap[] = [];
  smdp = '';
  notifications: Notification[] = [];
  dispatch: Dispatch;
  /** Guards the stateful APDU channel against concurrent commands. */
  isLocked = false;
  /** Invalidates delayed reconciliation whenever another switch starts. */
  private switchGeneration = 0;

  setState = (state: DeviceState) => {
    if (!this.obsolete) this.dispatch(setDeviceState([state, this.deviceId]));
  };

  /** Progress sink, replaced per-operation by download/authenticate calls. */
  callback: (update: ProgressUpdate) => void = () => {};

  constructor(device: Device, dispatcher: Dispatch) {
    this.obsolete = false;
    this.device = device;
    this.dispatch = dispatcher;
    this.deviceId = device.deviceId;

    const existing = Adapters[device.deviceId];
    if (existing) {
      existing.obsolete = false;
      return existing;
    }
    Adapters[device.deviceId] = this;
  }

  private settle(kind: 'disable' | 'standard'): Promise<void> {
    const ms = SETTLE_MS[this.device.type]?.[kind] ?? 0;
    return ms > 0 ? delay(ms) : Promise.resolve();
  }

  async reconnect(): Promise<boolean> {
    await this.disconnect();
    return this.connect();
  }

  async connect(): Promise<boolean> {
    if (this.obsolete) return false;
    if (this.connected) return true;
    try {
      if (!this.connected && (await this.device.connect())) {
        this.connected = true;
        return true;
      }
    } catch {
      // fall through to the failure path below
    }
    this.connected = false;
    return false;
  }

  async disconnect(): Promise<boolean> {
    try {
      if (this.connected) {
        await this.device.disconnect();
      }
      this.connected = false;
      return true;
    } catch {
      return false;
    } finally {
      this.connected = false;
    }
  }

  async dispose(): Promise<void> {
    this.obsolete = true;
    this.switchGeneration++;
    this.callback = () => {};
    await this.disconnect();
  }

  async initialize(): Promise<void> {
    if (!(await this.connect())) throw new Error('Device connection failed');
    await this.getEuiccInfo();
    await this.getProfiles();
  }

  async refresh(): Promise<void> {
    try {
      await this.getEuiccInfo();
      await this.getProfiles();
    } catch (error) {
      if (this.isLocked || this.obsolete) throw error;
      try {
        if (!(await this.reconnect())) throw new Error('Device connection failed');
        await this.initialize();
      } catch (recoveryError) {
        this.setState({refreshError: true});
        throw recoveryError;
      }
    }
  }

  async _execute(command: string, args: LpaArg[]): Promise<any> {
    return (await setupDevice(this))(command, args);
  }

  /**
   * Runs a single LPA command against the device.
   *
   * Only one command may be in flight at a time. Retry a complete read-only
   * transaction once after reconnect; never replay a state-changing command
   * when the card may already have accepted it.
   */
  async execute(command: string, args: LpaArg[]): Promise<any> {
    if (this.obsolete) throw new Error('Device disconnected');
    if (this.isLocked) {
      throw new Error(`Device ${this.deviceId} is busy; cannot run "${command}" concurrently`);
    }
    this.isLocked = true;
    try {
      try {
        return await this._execute(command, args);
      } catch (error) {
        if (!['get_eid', 'get_euicc_info', 'get_profiles', 'get_notifications'].includes(command)) {
          // SIM REFRESH can sever OMAPI after the eUICC accepted a switch.
          // Replaying this command can fail even when the first one worked.
          throw error;
        }
        if (this.obsolete || !(await this.reconnect())) throw error;
        return await (await setupDevice(this))(command, args);
      }
    } finally {
      // Must run even when the retry throws, otherwise the device stays
      // locked for the rest of the session.
      this.isLocked = false;
    }
  }

  async getEid(): Promise<string> {
    const result = await this.execute('get_eid', []);
    this.connected = true;
    this.eid = result.eid;
    return result.eid;
  }

  async getEuiccInfo(): Promise<EuiccInfoResult | undefined> {
    const info: EuiccInfoResult | undefined = await this.execute('get_euicc_info', []);
    if (info) {
      this.eid = info.eidValue;
      this.smdp = info.EuiccConfiguredAddresses?.defaultDpAddress ?? '';
      this.setState({
        eid: info.eidValue,
        euiccInfo2: info.EUICCInfo2,
        euiccAddress: info.EuiccConfiguredAddresses,
        bytesFree: info.EUICCInfo2?.extCardResource?.freeNonVolatileMemory,
      });
    }
    return info;
  }

  async getProfiles(publish = true): Promise<ProfileMetadataMap[]> {
    const profiles = await this.execute('get_profiles', []);
    if (Array.isArray(profiles)) {
      if (publish) {
        this.switchGeneration++;
        this.profiles = profiles;
        this.setState({profiles, refreshError: false, switchSyncing: false, switchSyncError: false, switchTargetIccid: undefined});
      }
      return profiles;
    }
    throw new Error('Invalid profile response');
  }

  async getNotifications(): Promise<Notification[]> {
    const notifications: Notification[] = await this.execute('get_notifications', []);
    this.notifications = notifications;
    this.setState({notifications});
    return notifications;
  }

  async deleteNotification(seqNumber: number): Promise<Notification[]> {
    await this.execute('delete_notification_single', [seqNumber]);
    return this.getNotifications();
  }

  async sendNotification(seqNumber: number): Promise<any> {
    return this.execute('process_notification_single', [seqNumber]);
  }

  /**
   * Show the requested target as pending while a switch is attempted. This is
   * never hardware confirmation: a fresh eUICC read must verify it before the
   * syncing label is removed. Kept compatible with the device-tested flow.
   */
  private showExpectedState(expected: {iccid: string; enabled: boolean}): number {
    const generation = ++this.switchGeneration;
    const profiles = this.profiles.map(profile => ({
      ...profile,
      profileState: expected.enabled
        ? profile.iccid === expected.iccid ? 1 : 0
        : profile.iccid === expected.iccid ? 0 : profile.profileState,
    }));
    this.profiles = profiles;
    this.setState({
      profiles,
      switchSyncing: true,
      switchSyncError: false,
      switchTargetIccid: expected.iccid,
    });
    return generation;
  }

  /** Re-read the real card to confirm the optimistic UI after a switch. */
  private async reloadAfterChange(
    kind: 'disable' | 'standard',
    expected?: {iccid: string; enabled: boolean},
    generation?: number,
  ): Promise<void> {
    await this.settle(kind);
    if (!expected) {
      await this.getEuiccInfo();
      await this.getProfiles();
      return;
    }

    const isCurrent = () => !this.obsolete && generation === this.switchGeneration;
    const matches = (profiles: ProfileMetadataMap[]) =>
      profiles.some(
        profile =>
          profile.iccid === expected.iccid &&
          (profile.profileState === 1) === expected.enabled,
      );

    const verify = async (): Promise<boolean> => {
      // A manual pull-to-refresh first reads eUICC info and then profiles.
      // Follow that SAME sequence: direct GetProfiles polling alone left some
      // Android modems reporting the pre-switch state indefinitely.
      try {
        await this.getEuiccInfo();
      } catch (error) {
        console.warn('[QianLesim] eUICC info re-read failed');
      }
      try {
        const fresh = await this.getProfiles(false);
        if (isCurrent() && matches(fresh)) {
          this.profiles = fresh;
          this.setState({
            profiles: fresh,
            switchSyncing: false,
            switchSyncError: false,
            switchTargetIccid: undefined,
          });
          return true;
        }
      } catch (error) {
        console.warn('[QianLesim] Profile status verification failed');
      }
      return false;
    };

    // Keep the blocking loader bounded; do not display the old status again
    // just because the modem has not yet finished re-attaching.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!isCurrent()) return;
      if (await verify()) return;
      if (attempt < 2) await delay(700);
    }

    // Continue reconciling in the background. This reads genuine card state,
    // it does not forge a successful hardware result.
    const reconcile = async (): Promise<void> => {
      for (let attempt = 0; attempt < 6; attempt++) {
        await delay(attempt === 0 ? 2000 : 3000);
        if (this.obsolete || !isCurrent()) return;
        if (await verify()) return;
      }
      if (!isCurrent()) return;
      console.warn('[QianLesim] Cannot confirm switched profile; pull to refresh.');
      // The switch was never verified. Read the actual card state once more
      // and render it if available instead of claiming the optimistic state.
      try {
        const actual = await this.getProfiles(false);
        if (isCurrent() && actual.length > 0) {
          this.profiles = actual;
          this.setState({profiles: actual});
        }
      } catch (error) {
        console.warn('[QianLesim] Final switch reconciliation read failed');
      }
      if (isCurrent()) this.setState({switchSyncing: false, switchSyncError: true});
    };
    void reconcile();
  }

  /**
   * OMAPI may lose the final APDU reply when a successful switch resets the
   * modem. Treat the reply as uncertain, then verify the real card state.
   * Do not blindly retry a possibly already accepted switch command.
   */
  private async changeProfileByIccId(iccid: string, enabled: boolean): Promise<void> {
    if (this.obsolete || this.isLocked) throw new Error('Device unavailable or busy');
    const generation = this.showExpectedState({iccid, enabled});
    const refreshFlag = this.device.type === 'omapi' ? '1' : '0';
    const command = enabled ? 'enable_profile' : 'disable_profile';
    try {
      await this.execute(command, [iccid, refreshFlag]);
    } catch (error) {
      console.warn('[QianLesim] Switch outcome uncertain, verifying hardware state');
    }
    await this.reloadAfterChange(
      enabled ? 'standard' : 'disable',
      {iccid, enabled},
      generation,
    );
  }

  async disableProfileByIccId(iccid: string): Promise<void> {
    await this.changeProfileByIccId(iccid, false);
  }

  async enableProfileByIccId(iccid: string): Promise<void> {
    await this.changeProfileByIccId(iccid, true);
  }

  async setNicknameByIccId(iccid: string, nickname: string): Promise<any> {
    const result = await this.execute('rename_profile', [iccid, nickname]);
    await this.getProfiles();
    return result;
  }

  async deleteProfileByIccId(iccid: string): Promise<any> {
    const result = await this.execute('delete_profile', [iccid]);
    await this.reloadAfterChange('standard');
    return result;
  }

  async authenticateProfile(
    smdp: string,
    matchingId: string,
    callback: (update: ProgressUpdate) => void,
    imei = '',
  ): Promise<any> {
    this.callback = callback;
    return this.execute('authenticate_profile', [smdp, matchingId, imei]);
  }

  async smdsDiscovery(callback: (update: ProgressUpdate) => void): Promise<any> {
    this.callback = callback;
    return this.execute('discover_profile', ['lpa.ds.gsma.com', '356303455555555']);
  }

  async cancelSession(internalState: string): Promise<any> {
    return this.execute('cancel_download', [internalState]);
  }

  async downloadProfile(
    internalState: string,
    confirmationCode: string,
    callback: (update: ProgressUpdate) => void,
  ): Promise<DownloadResult> {
    this.callback = callback;
    const result: DownloadResult = await this.execute('download_profile', [internalState, confirmationCode]);
    if (result.success) {
      try {
        await this.getProfiles();
        await this.getEuiccInfo();
      } catch {
        this.setState({refreshError: true});
        return {...result, refreshWarning: true};
      }
    }
    return result;
  }

  /**
   * Acknowledges pending notifications with the operator.
   *
   * Delete notifications are sent but kept on the card (flag 0); install/enable/
   * disable notifications are sent and then removed (flag 1).
   */
  async processNotifications(iccid: string): Promise<NotificationResult> {
    const DELETE = 0x10;
    const INSTALL_ENABLE_DISABLE = 0x20 | 0x40 | 0x80;
    const a: NotificationResult = await this.execute('process_notifications', [iccid, DELETE, 0]);
    const b: NotificationResult = await this.execute('process_notifications', [iccid, INSTALL_ENABLE_DISABLE, 1]);
    const result: NotificationResult = {
      result: a.result || b.result, total: a.total + b.total, sent: a.sent + b.sent,
      failed: a.failed + b.failed, removed: a.removed + b.removed, retained: a.retained + b.retained,
    };
    try { await this.getNotifications(); } catch { result.refreshWarning = true; }
    return result;
  }
}
