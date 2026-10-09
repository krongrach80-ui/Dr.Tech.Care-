import { describe, it, expect } from "vitest";
import {
  exerciseAnalysisConfigSchema,
  STANDARD_EXERCISE_CONFIGS,
} from "@/features/pose/exerciseConfig";

describe("Exercise Analysis Config Validation", () => {
  it("has at least 8 standard exercises defined with Thai descriptions", () => {
    const keys = Object.keys(STANDARD_EXERCISE_CONFIGS);
    expect(keys.length).toBeGreaterThanOrEqual(8);
  });

  it("validates every exercise configuration through Zod schema successfully", () => {
    for (const [key, config] of Object.entries(STANDARD_EXERCISE_CONFIGS)) {
      const parsed = exerciseAnalysisConfigSchema.safeParse(config);
      expect(parsed.success, `Exercise ${key} failed Zod schema`).toBe(true);
      if (parsed.success) {
        expect(parsed.data.exerciseNameThai).toBeTruthy();
        expect(parsed.data.joints.length).toBeGreaterThanOrEqual(1);
        expect(parsed.data.cameraDistanceMeters).toBeGreaterThan(0);
      }
    }
  });
});
