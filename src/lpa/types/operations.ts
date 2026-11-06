/** Installation and follow-up work must never share a success flag. */
export interface DownloadResult {
  success: boolean;
  refreshWarning?: boolean;
  notificationWarning?: boolean;
  message?: string;
  status?: string;
  reasonCode?: string;
  subjectCode?: string;
}

export interface NotificationResult {
  result: number;
  total: number;
  sent: number;
  failed: number;
  removed: number;
  retained: number;
  refreshWarning?: boolean;
}
