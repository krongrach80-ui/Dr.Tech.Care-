import { describe, it, expect } from "vitest";
import {
  decideIdentity,
  type IdentityCandidate,
  checkPoseYawCompliance,
} from "@/lib/biometrics";

describe("Biometric Decision Engine & Mirror Yaw Safety", () => {
  describe("decideIdentity Outcomes", () => {
    it("returns 'match' when best candidate is within threshold and exceeds ambiguous delta", () => {
      const candidates: IdentityCandidate[] = [
        { profileId: "pat-001", distance: 0.28, fullName: "สมพงษ์ สุขใจ" },
        { profileId: "pat-002", distance: 0.38, fullName: "สมชาย รักดี" },
      ];

      const result = decideIdentity(candidates, { matchThreshold: 0.40, ambiguousDelta: 0.05 });
      expect(result.outcome).toBe("match");
      expect(result.profileId).toBe("pat-001");
      expect(result.message).toContain("สำเร็จ");
      // CRITICAL: Guarantees no distance or vector leakage in return object
      expect("distance" in result).toBe(false);
      expect("score" in result).toBe(false);
    });

    it("returns 'ambiguous' when top 2 candidates are both within threshold and too close (delta < 0.05)", () => {
      const candidates: IdentityCandidate[] = [
        { profileId: "pat-001", distance: 0.28, fullName: "สมพงษ์ สุขใจ" },
        { profileId: "pat-002", distance: 0.30, fullName: "สมหมาย สุขใจ" }, // delta = 0.02 < 0.05
      ];

      const result = decideIdentity(candidates, { matchThreshold: 0.40, ambiguousDelta: 0.05 });
      expect(result.outcome).toBe("ambiguous");
      expect(result.profileId).toBeNull();
      expect(result.candidateProfileIds).toEqual(["pat-001", "pat-002"]);
      expect(result.message).toContain("ใกล้เคียงกัน");
      expect("distance" in result).toBe(false);
    });

    it("returns 'no_match' when candidates list is empty", () => {
      const result = decideIdentity([]);
      expect(result.outcome).toBe("no_match");
      expect(result.profileId).toBeNull();
      expect("distance" in result).toBe(false);
    });

    it("returns 'no_match' when best candidate exceeds match threshold", () => {
      const candidates: IdentityCandidate[] = [
        { profileId: "pat-999", distance: 0.52, fullName: "บุคคลภายนอก" },
      ];

      const result = decideIdentity(candidates, { matchThreshold: 0.40 });
      expect(result.outcome).toBe("no_match");
      expect(result.profileId).toBeNull();
    });

    it("returns 'inconsistent' when distance is NaN, negative, or invalid", () => {
      const corruptCandidates: IdentityCandidate[] = [
        { profileId: "pat-bad", distance: -0.15 },
      ];
      expect(decideIdentity(corruptCandidates).outcome).toBe("inconsistent");

      const nanCandidates: IdentityCandidate[] = [
        { profileId: "pat-nan", distance: NaN },
      ];
      expect(decideIdentity(nanCandidates).outcome).toBe("inconsistent");
    });
  });

  describe("Mirror Yaw Direction Safety", () => {
    it("ensures physical user turning left maps to negative yaw and right maps to positive yaw without inversion", () => {
      // เมื่อผู้ใช้หันศีรษะไปทางซ้ายของตนเอง มุม yaw ต้องเป็นลบ (เช่น -25 องศา)
      const userLeftYaw = -25;
      expect(checkPoseYawCompliance("left", userLeftYaw).isCompliant).toBe(true);
      expect(checkPoseYawCompliance("right", userLeftYaw).isCompliant).toBe(false);

      // เมื่อผู้ใช้หันศีรษะไปทางขวาของตนเอง มุม yaw ต้องเป็นบวก (เช่น +28 องศา)
      const userRightYaw = 28;
      expect(checkPoseYawCompliance("right", userRightYaw).isCompliant).toBe(true);
      expect(checkPoseYawCompliance("left", userRightYaw).isCompliant).toBe(false);
    });
  });
});
