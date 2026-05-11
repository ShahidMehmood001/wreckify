export const DETECTION_QUEUE = 'detection';
export const DETECTION_JOB = 'detect-scan';

export interface DetectionJobData {
  scanId: string;
  imageUrls: string[];
  vehicleInfo?: { make: string; model: string; year: number };
  provider: string;
  apiKey?: string;
}
