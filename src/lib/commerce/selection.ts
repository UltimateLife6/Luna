import type { CustomizationGroup, CustomizationKind, MeasurementUnit } from "@/lib/catalog-store/types";
import { CommerceError } from "@/lib/commerce/errors";

export type ConfigurationInput = {
  optionIds: string[];
  texts: { groupId: string; value: string }[];
  measurements: { groupId: string; value: string }[];
};

export type SelectionSnapshot = {
  groupId: string;
  groupLabel: string;
  kind: CustomizationKind;
  optionId: string;
  optionLabel: string;
  priceAdjustmentMinor: number;
  detail: string;
};

export function emptyConfiguration(): ConfigurationInput {
  return { optionIds: [], texts: [], measurements: [] };
}

export function configurationFromOptionIds(optionIds: readonly string[]): ConfigurationInput {
  return { optionIds: [...optionIds], texts: [], measurements: [] };
}

export function pricedAdjustment(groups: readonly CustomizationGroup[], input: ConfigurationInput, submittedPrice?: unknown): number {
  void submittedPrice;
  return adjustmentMinor(resolveConfiguration(groups, input));
}

export function resolveConfiguration(groups: readonly CustomizationGroup[], input: ConfigurationInput): SelectionSnapshot[] {
  const errors: string[] = [];
  const snapshots: SelectionSnapshot[] = [];
  const used = new Set<string>();

  for (const group of groups) {
    const kind = group.kind ?? "single";
    const required = group.required ?? true;

    if (kind === "single" || kind === "multi") {
      const chosen = group.options.filter((option) => input.optionIds.includes(option.id));
      const unavailable = chosen.filter((option) => option.available === false);

      if (unavailable.length > 0) {
        errors.push(`${unavailable[0]?.label ?? group.label} is not available.`);
      }

      const available = chosen.filter((option) => option.available !== false);

      if (kind === "single" && available.length > 1) {
        errors.push(`Choose one option for ${group.label}.`);
      }

      if (required && available.length === 0 && unavailable.length === 0) {
        errors.push(`${group.label} is required.`);
      }

      if (!required && kind === "single" && available.length > 1) {
        errors.push(`Choose one option for ${group.label}.`);
      }

      for (const option of available) {
        used.add(option.id);
        snapshots.push({
          groupId: group.id,
          groupLabel: group.label,
          kind,
          optionId: option.id,
          optionLabel: option.label,
          priceAdjustmentMinor: option.priceAdjustmentMinor,
          detail: "",
        });
      }

      continue;
    }

    if (kind === "text") {
      const value = input.texts.find((entry) => entry.groupId === group.id)?.value.trim() ?? "";

      if (required && value.length === 0) {
        errors.push(`${group.label} is required.`);
      }

      if (value.length > 0 && group.textMaxLength !== undefined && value.length > group.textMaxLength) {
        errors.push(`${group.label} must be ${group.textMaxLength} characters or fewer.`);
      }

      if (value.length > 0) {
        snapshots.push({
          groupId: group.id,
          groupLabel: group.label,
          kind,
          optionId: `${group.id}:text`,
          optionLabel: value,
          priceAdjustmentMinor: 0,
          detail: value,
        });
      }

      continue;
    }

    const raw = input.measurements.find((entry) => entry.groupId === group.id)?.value.trim() ?? "";

    if (required && raw.length === 0) {
      errors.push(`${group.label} is required.`);
      continue;
    }

    if (raw.length === 0) {
      continue;
    }

    if (group.unit !== "in" && group.unit !== "cm" && group.unit !== "mm") {
      errors.push(`${group.label} does not have a saved unit.`);
      continue;
    }

    const measurementError = measurementProblem(group, raw);

    if (measurementError) {
      errors.push(measurementError);
      continue;
    }

    const unit = group.unit;
    snapshots.push({
      groupId: group.id,
      groupLabel: group.label,
      kind: "measurement",
      optionId: `${group.id}:measurement`,
      optionLabel: `${raw} ${unit}`,
      priceAdjustmentMinor: 0,
      detail: raw,
    });
  }

  for (const optionId of input.optionIds) {
    if (!used.has(optionId)) {
      errors.push("One selected option is not saved on this product.");
      break;
    }
  }

  if (errors.length > 0) {
    throw new CommerceError([...new Set(errors)]);
  }

  return snapshots;
}

export function adjustmentMinor(snapshot: readonly SelectionSnapshot[]): number {
  return snapshot.reduce((total, option) => total + option.priceAdjustmentMinor, 0);
}

export function serializeStoredCustomization(input: ConfigurationInput, snapshot: readonly SelectionSnapshot[]): string {
  return JSON.stringify({
    version: 2,
    input: canonicalConfiguration(input),
    snapshot,
  });
}

export function parseStoredCustomization(value: string): { input: ConfigurationInput; snapshot: SelectionSnapshot[] | null } {
  const parsed = JSON.parse(value) as unknown;

  if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
    return { input: configurationFromOptionIds(parsed), snapshot: null };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CommerceError(["Saved customization could not be read."]);
  }

  const record = parsed as { version?: number; input?: ConfigurationInput; snapshot?: SelectionSnapshot[] };

  if (record.version !== 2 || !record.input) {
    throw new CommerceError(["Saved customization could not be read."]);
  }

  return {
    input: {
      optionIds: record.input.optionIds ?? [],
      texts: record.input.texts ?? [],
      measurements: record.input.measurements ?? [],
    },
    snapshot: record.snapshot ?? null,
  };
}

export function snapshotsEqual(left: readonly SelectionSnapshot[], right: readonly SelectionSnapshot[]): boolean {
  return JSON.stringify(left.map(snapshotIdentity).sort()) === JSON.stringify(right.map(snapshotIdentity).sort());
}

export function configurationFromSnapshot(snapshot: readonly SelectionSnapshot[]): ConfigurationInput {
  return {
    optionIds: snapshot.filter((item) => item.kind === "single" || item.kind === "multi" || item.kind === undefined).map((item) => item.optionId),
    texts: snapshot.filter((item) => item.kind === "text").map((item) => ({ groupId: item.groupId, value: item.detail || item.optionLabel })),
    measurements: snapshot.filter((item) => item.kind === "measurement").map((item) => ({ groupId: item.groupId, value: item.detail })),
  };
}

export function measurementUnitName(unit: MeasurementUnit): string {
  if (unit === "cm") {
    return "centimeters";
  }

  if (unit === "mm") {
    return "millimeters";
  }

  return "inches";
}

function canonicalConfiguration(input: ConfigurationInput): ConfigurationInput {
  return {
    optionIds: [...input.optionIds].sort(),
    texts: input.texts
      .map((entry) => ({ groupId: entry.groupId, value: entry.value.trim() }))
      .filter((entry) => entry.value.length > 0)
      .sort((left, right) => left.groupId.localeCompare(right.groupId)),
    measurements: input.measurements
      .map((entry) => ({ groupId: entry.groupId, value: entry.value.trim() }))
      .filter((entry) => entry.value.length > 0)
      .sort((left, right) => left.groupId.localeCompare(right.groupId)),
  };
}

function snapshotIdentity(snapshot: SelectionSnapshot): string {
  return JSON.stringify({
    groupId: snapshot.groupId,
    groupLabel: snapshot.groupLabel,
    optionId: snapshot.optionId,
    optionLabel: snapshot.optionLabel,
    priceAdjustmentMinor: snapshot.priceAdjustmentMinor,
    detail: snapshot.detail,
  });
}

function measurementProblem(group: CustomizationGroup, raw: string): string | null {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(raw)) {
    return `${group.label} must be a number with up to two decimal places.`;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    return `${group.label} must be greater than zero.`;
  }

  if (group.min !== undefined && value < group.min) {
    return `${group.label} must be at least ${group.min} ${group.unit ?? ""}.`.trim();
  }

  if (group.max !== undefined && value > group.max) {
    return `${group.label} must be at most ${group.max} ${group.unit ?? ""}.`.trim();
  }

  if (group.min === undefined && group.max === undefined && value > 500) {
    return `${group.label} is above the technical entry limit.`;
  }

  return null;
}
