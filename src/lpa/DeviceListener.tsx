import React, {PropsWithChildren, useEffect} from 'react';
import {useDispatch} from 'react-redux';

import {setupDevices} from '@/lpa/deviceManager';

/**
 * Kicks off device discovery once the app mounts, then renders its children.
 */
export function DeviceListener({children}: PropsWithChildren) {
  const dispatch = useDispatch();

  useEffect(() => {
    setupDevices(dispatch).catch(() => console.error('[LPA] Initial device discovery failed'));
  }, [dispatch]);

  return <>{children}</>;
}
