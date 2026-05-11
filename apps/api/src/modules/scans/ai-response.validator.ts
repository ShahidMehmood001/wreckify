import { BadGatewayException } from '@nestjs/common';
import { DamageSeverity } from '@prisma/client';

const VALID_SEVERITIES = new Set<string>(Object.values(DamageSeverity));

export interface ValidatedDetectedPart {
  part_name: string;
  severity: DamageSeverity;
  confidence_score: number;
  bounding_box: Record<string, number>;
  description: string;
}

export interface ValidatedDetectResult {
  scan_id: string;
  detected_parts: ValidatedDetectedPart[];
}

export interface ValidatedLineItem {
  part: string;
  parts_min: number;
  parts_max: number;
  labor_min: number;
  labor_max: number;
}

export interface ValidatedEstimateResult {
  scan_id: string;
  total_min: number;
  total_max: number;
  currency: string;
  line_items: ValidatedLineItem[];
  narrative: string;
}

export function validateDetectResponse(result: unknown): ValidatedDetectResult {
  if (!result || typeof result !== 'object') {
    throw new BadGatewayException('AI service returned invalid detect response');
  }
  const r = result as any;

  if (!Array.isArray(r.detected_parts)) {
    throw new BadGatewayException('AI detect response missing detected_parts array');
  }

  const validParts: ValidatedDetectedPart[] = [];
  for (const p of r.detected_parts) {
    if (typeof p.part_name !== 'string' || !p.part_name) continue;
    if (!VALID_SEVERITIES.has(p.severity)) continue;
    if (typeof p.confidence_score !== 'number' || p.confidence_score < 0 || p.confidence_score > 1) continue;
    if (!p.bounding_box || typeof p.bounding_box !== 'object') continue;
    validParts.push({
      part_name: p.part_name,
      severity: p.severity as DamageSeverity,
      confidence_score: p.confidence_score,
      bounding_box: p.bounding_box,
      description: typeof p.description === 'string' ? p.description : '',
    });
  }

  return { scan_id: r.scan_id, detected_parts: validParts };
}

export function validateEstimateResponse(result: unknown): ValidatedEstimateResult {
  if (!result || typeof result !== 'object') {
    throw new BadGatewayException('AI service returned invalid estimate response');
  }
  const r = result as any;

  const totalMin = Number(r.total_min);
  const totalMax = Number(r.total_max);

  if (!isFinite(totalMin) || totalMin < 0) {
    throw new BadGatewayException(`AI estimate has invalid total_min: ${r.total_min}`);
  }
  if (!isFinite(totalMax) || totalMax < totalMin) {
    throw new BadGatewayException(`AI estimate has invalid total_max: ${r.total_max}`);
  }
  if (!Array.isArray(r.line_items)) {
    throw new BadGatewayException('AI estimate response missing line_items array');
  }

  const validItems: ValidatedLineItem[] = r.line_items
    .filter((item: any) =>
      typeof item.part === 'string' &&
      isFinite(Number(item.parts_min)) && Number(item.parts_min) >= 0 &&
      isFinite(Number(item.parts_max)) && Number(item.parts_max) >= Number(item.parts_min) &&
      isFinite(Number(item.labor_min)) && Number(item.labor_min) >= 0 &&
      isFinite(Number(item.labor_max)) && Number(item.labor_max) >= Number(item.labor_min),
    )
    .map((item: any) => ({
      part: item.part,
      parts_min: Number(item.parts_min),
      parts_max: Number(item.parts_max),
      labor_min: Number(item.labor_min),
      labor_max: Number(item.labor_max),
    }));

  return {
    scan_id: r.scan_id,
    total_min: totalMin,
    total_max: totalMax,
    currency: typeof r.currency === 'string' && r.currency ? r.currency : 'PKR',
    line_items: validItems,
    narrative: typeof r.narrative === 'string' ? r.narrative : '',
  };
}
