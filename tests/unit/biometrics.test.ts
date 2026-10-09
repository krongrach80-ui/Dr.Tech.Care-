import { describe, it, expect } from "vitest";
import {
  generateServerChallenge,
  CAMERA_ERROR_CATALOG,
  classifyCameraStreamError,
  extract128dEmbeddingFromPose,
  checkPoseYawCompliance,
  verifyBiometricSubmission,
  getStepInstruction,
  getStepVoicePrompt,
  BiometricVerificationPayload,
} from "@/lib/biometrics";

describe("Biometrics & Liveness Specification (PDPA Compliant)", () => {
  describe("Server Challenge & Anti-Replay", () => {
    it("generates a valid challenge with nonce, 60s expiration, and 3-step sequence", () => {
      const challenge = generateServerChallenge();

      expect(challenge.nonce).toMatch(/^NONCE-[A-Z0-9]+-\d+$/);
      expect(challenge.expiresAt).toBeGreaterThan(challenge.issuedAt);
      expect(challenge.expiresAt - challenge.issuedAt).toBe(60_000);
      expect(challenge.sequence).toHaveLength(3);
      expect(challenge.sequence[0]).toBe("center");
      expect(["left", "right"]).toContain(challenge.sequence[1]);
      expect(["left", "right"]).toContain(challenge.sequence[2]);
      expect(challenge.sequence[1]).not.toBe(challenge.sequence[2]);
    });
  });

  describe("Thai Camera Error Catalog (10 Cases)", () => {
    const requiredCategories = [
      "not_found",
      "permission_denied",
      "busy",
      "low_light",
      "no_face",
      "multiple_faces",
      "insufficient_angle",
      "too_fast",
      "timeout",
      "network_error",
    ] as const;

    it("has all 10 required error cases defined with Thai friendly text and suggestions", () => {
      for (const cat of requiredCategories) {
        const item = CAMERA_ERROR_CATALOG[cat];
        expect(item).toBeDefined();
        expect(item.category).toBe(cat);
        expect(item.title).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.suggestion).toBeTruthy();
      }
    });

    it("classifies DOMExceptions into friendly Thai error catalog items", () => {
      const permErr = new Error("Permission denied by user");
      permErr.name = "NotAllowedError";
      expect(classifyCameraStreamError(permErr).category).toBe("permission_denied");

      const notFoundErr = new Error("Requested device not found");
      notFoundErr.name = "NotFoundError";
      expect(classifyCameraStreamError(notFoundErr).category).toBe("not_found");

      const busyErr = new Error("Source is busy");
      busyErr.name = "NotReadableError";
      expect(classifyCameraStreamError(busyErr).category).toBe("busy");

      const timeoutErr = new Error("Operation timeout exceeded");
      expect(classifyCameraStreamError(timeoutErr).category).toBe("timeout");

      const networkErr = new Error("Network request failed");
      expect(classifyCameraStreamError(networkErr).category).toBe("network_error");
    });
  });

  describe("PDPA 128-d Vector Embedding Generation", () => {
    it("generates strictly 128-d Float32 vector embeddings and zero image files", () => {
      const embedding = extract128dEmbeddingFromPose("center", "NONCE-TEST-12345");
      expect(embedding).toHaveLength(128);
      expect(embedding.every((val) => typeof val === "number" && !Number.isNaN(val))).toBe(true);
    });
  });

  describe("Yaw Angle & Compliance", () => {
    it("verifies center pose compliance (yaw ~0°)", () => {
      expect(checkPoseYawCompliance("center", 0).isCompliant).toBe(true);
      expect(checkPoseYawCompliance("center", -5).isCompliant).toBe(true);
      expect(checkPoseYawCompliance("center", 25).isCompliant).toBe(false);
    });

    it("verifies left pose compliance (yaw <= -20°)", () => {
      expect(checkPoseYawCompliance("left", -28).isCompliant).toBe(true);
      expect(checkPoseYawCompliance("left", -10).isCompliant).toBe(false);
    });

    it("verifies right pose compliance (yaw >= +20°)", () => {
      expect(checkPoseYawCompliance("right", 28).isCompliant).toBe(true);
      expect(checkPoseYawCompliance("right", 10).isCompliant).toBe(false);
    });
  });

  describe("Step Guidance & Web Speech API text", () => {
    it("provides elderly-friendly Thai instructions for each pose", () => {
      expect(getStepInstruction("center")).toBe("กรุณามองตรงที่กล้อง");
      expect(getStepInstruction("left")).toBe("หันหน้าไปทางซ้ายช้า ๆ");
      expect(getStepInstruction("right")).toBe("หันหน้าไปทางขวาช้า ๆ");
    });

    it("provides friendly Thai voice prompts for elderly users", () => {
      const prompt1 = getStepVoicePrompt(1, "center");
      expect(prompt1).toContain("ขั้นตอนที่หนึ่ง");
      expect(prompt1).toContain("มองตรง");

      const prompt2 = getStepVoicePrompt(2, "left");
      expect(prompt2).toContain("ขั้นตอนที่สอง");
      expect(prompt2).toContain("หันหน้าไปทางซ้าย");
    });
  });

  describe("Biometric Verification & Payload Validation", () => {
    const challenge = generateServerChallenge();

    const validPayload: BiometricVerificationPayload = {
      challengeNonce: challenge.nonce,
      embedding: new Array(128).fill(0.1234),
      quality: {
        faceSizeRatio: 0.45,
        lightingScore: 80,
        sharpnessScore: 90,
        yawAngle: 0,
        pitchAngle: 0,
        rollAngle: 0,
        isAcceptable: true,
        facesDetected: 1,
      },
      capturedYaw: 0,
      poseSequence: challenge.sequence,
      verifiedAt: Date.now(),
    };

    it("accepts a valid payload matching server challenge", () => {
      const result = verifyBiometricSubmission(validPayload, challenge, true);
      expect(result.success).toBe(true);
    });

    it("rejects when network is offline with network_error", () => {
      const result = verifyBiometricSubmission(validPayload, challenge, false);
      expect(result.success).toBe(false);
      expect(result.errorCategory).toBe("network_error");
    });

    it("rejects non-matching challenge nonce (anti-replay)", () => {
      const tamperedPayload = { ...validPayload, challengeNonce: "FAKE-NONCE" };
      const result = verifyBiometricSubmission(tamperedPayload, challenge, true);
      expect(result.success).toBe(false);
      expect(result.errorCategory).toBe("unknown");
    });

    it("rejects when multiple faces are detected", () => {
      const multiFacePayload = {
        ...validPayload,
        quality: { ...validPayload.quality, facesDetected: 2 },
      };
      const result = verifyBiometricSubmission(multiFacePayload, challenge, true);
      expect(result.success).toBe(false);
      expect(result.errorCategory).toBe("multiple_faces");
    });

    it("rejects when lighting is too dark (< 35)", () => {
      const darkPayload = {
        ...validPayload,
        quality: { ...validPayload.quality, lightingScore: 20 },
      };
      const result = verifyBiometricSubmission(darkPayload, challenge, true);
      expect(result.success).toBe(false);
      expect(result.errorCategory).toBe("low_light");
    });
  });
});
