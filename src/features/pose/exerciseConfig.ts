import { z } from "zod";

export const jointTrackingSchema = z.object({
  primaryJoint: z.string().min(1),
  connectingJoints: z.array(z.string()).length(2),
  targetAngleMin: z.number().min(0).max(180),
  targetAngleMax: z.number().min(0).max(180),
  toleranceAngle: z.number().min(0).max(45).default(10),
  planeOfMotion: z.enum(["sagittal", "frontal", "transverse"]),
  side: z.enum(["left", "right", "bilateral", "auto"]),
  minHoldSeconds: z.number().nonnegative().default(1),
});

export const exerciseAnalysisConfigSchema = z.object({
  version: z.literal("1.0"),
  exerciseKey: z.string().min(1),
  exerciseNameThai: z.string().min(1),
  cameraDistanceMeters: z.number().min(1).max(4).default(2.0),
  joints: z.array(jointTrackingSchema).min(1),
  cadenceMinSecondsPerRep: z.number().positive().default(2.0),
  cadenceMaxSecondsPerRep: z.number().positive().default(8.0),
});

export type ExerciseAnalysisConfig = z.infer<typeof exerciseAnalysisConfigSchema>;

/**
 * นิยาม Configuration มาตรฐานสำหรับ 8 ท่ากายภาพบำบัด
 */
export const STANDARD_EXERCISE_CONFIGS: Record<string, ExerciseAnalysisConfig> = {
  shoulder_abduction: {
    version: "1.0",
    exerciseKey: "shoulder_abduction",
    exerciseNameThai: "กางแขนขึ้นลง (Shoulder Abduction)",
    cameraDistanceMeters: 2.0,
    joints: [
      {
        primaryJoint: "shoulder",
        connectingJoints: ["elbow", "hip"],
        targetAngleMin: 80,
        targetAngleMax: 95,
        toleranceAngle: 10,
        planeOfMotion: "frontal",
        side: "auto",
        minHoldSeconds: 2,
      },
    ],
    cadenceMinSecondsPerRep: 2.5,
    cadenceMaxSecondsPerRep: 6.0,
  },
  seated_knee_extension: {
    version: "1.0",
    exerciseKey: "seated_knee_extension",
    exerciseNameThai: "เตะเหยียดเข่าบนเก้าอี้ (Seated Knee Extension)",
    cameraDistanceMeters: 2.0,
    joints: [
      {
        primaryJoint: "knee",
        connectingJoints: ["hip", "ankle"],
        targetAngleMin: 165,
        targetAngleMax: 180,
        toleranceAngle: 15,
        planeOfMotion: "sagittal",
        side: "auto",
        minHoldSeconds: 3,
      },
    ],
    cadenceMinSecondsPerRep: 3.0,
    cadenceMaxSecondsPerRep: 7.0,
  },
  elbow_flexion: {
    version: "1.0",
    exerciseKey: "elbow_flexion",
    exerciseNameThai: "งอและเหยียดข้อศอก (Elbow Flexion & Extension)",
    cameraDistanceMeters: 1.8,
    joints: [
      {
        primaryJoint: "elbow",
        connectingJoints: ["shoulder", "wrist"],
        targetAngleMin: 130,
        targetAngleMax: 150,
        toleranceAngle: 12,
        planeOfMotion: "sagittal",
        side: "auto",
        minHoldSeconds: 1,
      },
    ],
    cadenceMinSecondsPerRep: 2.0,
    cadenceMaxSecondsPerRep: 5.0,
  },
  sit_to_stand: {
    version: "1.0",
    exerciseKey: "sit_to_stand",
    exerciseNameThai: "ลุกนั่งจากเก้าอี้ (Sit to Stand)",
    cameraDistanceMeters: 2.5,
    joints: [
      {
        primaryJoint: "hip",
        connectingJoints: ["shoulder", "knee"],
        targetAngleMin: 170,
        targetAngleMax: 180,
        toleranceAngle: 10,
        planeOfMotion: "sagittal",
        side: "bilateral",
        minHoldSeconds: 2,
      },
    ],
    cadenceMinSecondsPerRep: 3.0,
    cadenceMaxSecondsPerRep: 8.0,
  },
  ankle_dorsiflexion: {
    version: "1.0",
    exerciseKey: "ankle_dorsiflexion",
    exerciseNameThai: "กระดกข้อเท้าขึ้นลง (Ankle Dorsiflexion)",
    cameraDistanceMeters: 1.8,
    joints: [
      {
        primaryJoint: "ankle",
        connectingJoints: ["knee", "foot_index"],
        targetAngleMin: 80,
        targetAngleMax: 90,
        toleranceAngle: 10,
        planeOfMotion: "sagittal",
        side: "auto",
        minHoldSeconds: 3,
      },
    ],
    cadenceMinSecondsPerRep: 2.5,
    cadenceMaxSecondsPerRep: 6.0,
  },
  wall_pushup: {
    version: "1.0",
    exerciseKey: "wall_pushup",
    exerciseNameThai: "วิดกำแพงปรับสมดุล (Wall Push-Up)",
    cameraDistanceMeters: 2.2,
    joints: [
      {
        primaryJoint: "elbow",
        connectingJoints: ["shoulder", "wrist"],
        targetAngleMin: 90,
        targetAngleMax: 105,
        toleranceAngle: 15,
        planeOfMotion: "sagittal",
        side: "bilateral",
        minHoldSeconds: 1,
      },
    ],
    cadenceMinSecondsPerRep: 2.5,
    cadenceMaxSecondsPerRep: 6.0,
  },
  neck_lateral_flexion: {
    version: "1.0",
    exerciseKey: "neck_lateral_flexion",
    exerciseNameThai: "เอียงคอบริหารกล้ามเนื้อคอ (Neck Lateral Flexion)",
    cameraDistanceMeters: 1.5,
    joints: [
      {
        primaryJoint: "nose",
        connectingJoints: ["left_ear", "right_ear"],
        targetAngleMin: 25,
        targetAngleMax: 35,
        toleranceAngle: 8,
        planeOfMotion: "frontal",
        side: "auto",
        minHoldSeconds: 3,
      },
    ],
    cadenceMinSecondsPerRep: 3.0,
    cadenceMaxSecondsPerRep: 7.0,
  },
  heel_raises: {
    version: "1.0",
    exerciseKey: "heel_raises",
    exerciseNameThai: "เขย่งส้นเท้า (Standing Heel Raise)",
    cameraDistanceMeters: 2.2,
    joints: [
      {
        primaryJoint: "ankle",
        connectingJoints: ["knee", "heel"],
        targetAngleMin: 120,
        targetAngleMax: 140,
        toleranceAngle: 10,
        planeOfMotion: "sagittal",
        side: "bilateral",
        minHoldSeconds: 2,
      },
    ],
    cadenceMinSecondsPerRep: 2.5,
    cadenceMaxSecondsPerRep: 6.0,
  },
};
