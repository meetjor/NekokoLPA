import {Dispatch} from '@reduxjs/toolkit';
import {Platform} from 'react-native';

import {Adapter, Device} from '@/lpa/adapters/Adapter';
import {Adapters, ConnectedBluetoothDevices} from '@/lpa/adapters/registry';
import {CcidDevice} from '@/lpa/adapters/CcidDevice';
import {OmapiDevice} from '@/lpa/adapters/OmapiDevice';
import {EstkMeRed} from '@/lpa/adapters/EstkMeRedDevice';
import {EstkMeRed2} from '@/lpa/adapters/EstkMeRed2Device';
import {BeeSimDevice} from '@/lpa/adapters/BeeSimDevice';
import {SimLinkDevice} from '@/lpa/adapters/SimLinkDevice';
import {CCIDPlugin, OMAPIBridge} from '@/lpa/bridge/nativeModules';
import {setInternalDevices, setTargetDevice, removeDeviceState} from '@/store/slices';
import {getAIDList} from '@/shared/utils/aid';

/** Shape of one entry in OMAPIBridge.listDevices' JSON payload. */
interface OmapiSlot {
  name: string;
  available: string;
  slotAvailable?: string;
  description?: string;
  signatures?: string;
}

/**
 * Bluetooth readers we know how to drive, matched on advertised name.
 *
 * This is the single source of truth for BLE support: the scan sheet filters
 * advertisements through {@link isSupportedBleName} rather than keeping its
 * own copy, so adding an adapter here is enough to make it discoverable.
 *
 * Matching is a predicate rather than a prefix because the two ESTKme-RED
 * generations are distinguished by a space: "ESTKme RED" is the second, which
 * speaks CCID, while "ESTKme-RED" is the first, with its own framing. Sending
 * one's frames to the other gets no usable answer, so the distinction has to
 * be made before a connection is opened. Order matters — the more specific
 * test comes first.
 */
const BLE_ADAPTERS: {matches: (name: string) => boolean; create: (device: any) => Device}[] = [
  {matches: n => /estkme\s+red/i.test(n), create: d => new EstkMeRed2(d)},
  {matches: n => /estkme[-_]?red/i.test(n), create: d => new EstkMeRed(d)},
  {matches: n => /^esim_writer/i.test(n), create: d => new SimLinkDevice(d)},
  {matches: n => /^beesim/i.test(n), create: d => new BeeSimDevice(d)},
];

/** True when a scanned BLE advertisement names a reader we have an adapter for. */
export function isSupportedBleName(name: string | null | undefined): boolean {
  return !!name && BLE_ADAPTERS.some(a => a.matches(name));
}

async function discoverOmapiDevices(): Promise<Device[]> {
  if (Platform.OS !== 'android') {
    return [];
  }
  const slots: OmapiSlot[] = JSON.parse(await OMAPIBridge.listDevices(getAIDList()));
  return slots.map(slot => {
    const device = new OmapiDevice(slot.name, slot.available === 'true');
    if (slot.available !== 'true') {
      device.slotAvailable = slot.slotAvailable === 'true';
      device.description = slot.description ?? '';
      device.signatures = slot.signatures ?? '';
    }
    return device;
  });
}

async function discoverCcidDevices(): Promise<Device[]> {
  try {
    const readers: string[] = (await CCIDPlugin.listReaders()) ?? [];
    return readers.map(
      reader =>
        new CcidDevice(reader, Platform.OS === 'ios' || readers.length > 1 ? reader : 'USB'),
    );
  } catch (error) {
    throw new Error('Failed to list CCID readers');
  }
}

function discoverBluetoothDevices(): Device[] {
  const devices: Device[] = [];
  for (const bleDevice of ConnectedBluetoothDevices) {
    const name = bleDevice.name;
    if (!name) {
      continue;
    }
    const match = BLE_ADAPTERS.find(a => a.matches(name));
    if (match) {
      const device = match.create(bleDevice);
      device.transportIdentity = bleDevice;
      devices.push(device);
    }
  }
  return devices;
}

/**
 * Enumerates every reachable eUICC carrier, reconciles the adapter registry
 * against it, and publishes the resulting device ids to Redux.
 *
 * @param targetDevice device id the UI should switch to once it appears.
 */
async function reconcileDevices(
  dispatch: Dispatch,
  targetDevice: string | null = null,
): Promise<void> {
  if (Object.values(Adapters).some(a => a.isLocked))
    throw new Error('Device operation in progress');
  const devices: Device[] = [
    ...(await discoverOmapiDevices()),
    ...(await discoverCcidDevices()),
    ...discoverBluetoothDevices(),
  ];

  const liveIds = new Set(devices.map(d => d.deviceId));

  // Drop adapters whose device has gone away.
  for (const deviceId of Object.keys(Adapters)) {
    if (!liveIds.has(deviceId)) {
      try {
        await Adapters[deviceId].dispose();
      } catch {
        // The device is already gone; nothing to clean up.
      }
      delete Adapters[deviceId];
      dispatch(removeDeviceState(deviceId));
    }
  }

  let failed = false;
  for (const device of devices) {
    let existing: Adapter | undefined = Adapters[device.deviceId];
    if (
      existing &&
      device.transportIdentity &&
      existing.device.transportIdentity !== device.transportIdentity
    ) {
      // Re-scanning the same BLE id can supply a new transport without an
      // intervening "not found" discovery. Do not reuse the old session.
      await existing.dispose();
      delete Adapters[device.deviceId];
      dispatch(removeDeviceState(device.deviceId));
      existing = undefined;
    }
    const adapter = existing ?? new Adapter(device, dispatch);
    // Preserve transport/session identity while updating current discovery data.
    // Only OMAPI discovery probes availability. USB/BLE constructors start
    // false until connect() performs the card handshake; that is not absence.
    if (device.type === 'omapi') {
      adapter.device.available = device.available;
      adapter.device.slotAvailable = device.slotAvailable;
      adapter.device.description = device.description;
      adapter.device.signatures = device.signatures;
    }
    adapter.setState({available: adapter.device.available});
    if (device.type === 'omapi' && !device.available) {
      await adapter.disconnect();
      adapter.setState({refreshError: true});
      continue;
    }
    try {
      if (existing && adapter.connected) await adapter.refresh();
      else await adapter.initialize();
    } catch {
      adapter.setState({refreshError: true});
      failed = true;
    }
    adapter.setState({available: adapter.device.available});
  }

  dispatch(setInternalDevices(devices.map(d => d.deviceId)));
  if (targetDevice) {
    dispatch(setTargetDevice(targetDevice));
  }
  if (failed) throw new Error('Some devices could not be refreshed');
}

// Serialize discoveries: native enumeration also touches logical channels.
let discovery: Promise<void> = Promise.resolve();
export function setupDevices(
  dispatch: Dispatch,
  targetDevice: string | null = null,
): Promise<void> {
  const next = discovery
    .then(() => reconcileDevices(dispatch, targetDevice))
    .catch(error => {
      dispatch(setInternalDevices(Object.keys(Adapters)));
      throw error;
    });
  discovery = next.catch(() => {});
  return next;
}
