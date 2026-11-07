import type {EuiccInfoResult, Notification} from './euicc';
import type {ProfileMetadataMap, RemoteError} from './profile';
import type {DownloadResult, NotificationResult} from './operations';

export type LpaArg = string | number;
export interface OperationFailure extends RemoteError {
  success: false;
  remoteError?: RemoteError;
}
export interface AuthenticatedProfile {
  success: true;
  isCcRequired: boolean;
  profile: ProfileMetadataMap;
  profileMetadata: ProfileMetadataMap;
  /** Opaque handle owned by the per-device dispatcher, never a card identifier. */
  _internal: string;
}
export type AuthenticationResult = AuthenticatedProfile | OperationFailure;
export type DiscoveryResult =
  | {success: true; smdp_list: string[]}
  | (OperationFailure & {smdp_list: string[]});
export type CommandStatus = {result: number} & Partial<OperationFailure>;

export interface LpaCommandResults {
  set_apdu_mtu: CommandStatus;
  get_eid: {eid: string};
  get_euicc_info: Required<EuiccInfoResult>;
  get_profiles: ProfileMetadataMap[];
  get_notifications: Notification[];
  enable_profile: CommandStatus;
  disable_profile: CommandStatus;
  delete_profile: CommandStatus;
  rename_profile: CommandStatus;
  delete_notification_single: CommandStatus;
  process_notification_single: CommandStatus;
  process_notifications: NotificationResult;
  authenticate_profile: AuthenticationResult;
  discover_profile: DiscoveryResult;
  download_profile: DownloadResult;
  cancel_download: CommandStatus;
}
export type LpaCommand = keyof LpaCommandResults;
export type LpaExecutor = <C extends LpaCommand>(
  command: C,
  args: LpaArg[],
) => Promise<LpaCommandResults[C]>;
