export type RepState = "idle" | "moving_up" | "peak_reached" | "moving_down";

export type RepQualityFeedback =
  | "good"
  | "incomplete_rom"
  | "too_fast"
  | "too_slow"
  | "occluded"
  | "jittery";

export interface RepCounterConfig {
  targetMinAngle: number; // มุมจุดต่ำสุด เช่น 15 องศา
  targetMaxAngle: number; // มุมจุดสูงสุด (ROM Peak) เช่น 90 องศา
  minRepDurationMs: number; // เวลาขั้นต่ำต่อรอบ เช่น 1500 ms (กันเร็วเกิน)
  maxRepDurationMs: number; // เวลาสูงสุดต่อรอบ เช่น 7000 ms (กันช้าเกิน)
  visibilityThreshold: number; // เกณฑ์ความชัดเจนของข้อต่อ เช่น 0.5
  jitterTolerance: number; // เกณฑ์กระตุก (มุมเปลี่ยนฉับพลันเกิน 50 องศาในเสี้ยววินาที)
}

export interface LandmarkSample {
  angle: number;
  visibility: number;
  timestamp: number;
  side?: "left" | "right";
}

export interface RepCounterResult {
  currentReps: number;
  state: RepState;
  feedback: RepQualityFeedback;
  smoothedAngle: number;
  activeSide: "left" | "right";
  isTargetCompleted: boolean;
}

export class PoseRepStateMachine {
  private config: RepCounterConfig;
  private targetReps: number;
  private currentReps = 0;
  private state: RepState = "idle";
  private repStartTime = 0;
  private peakAngleReached = 0;
  private lastSmoothedAngle = 0;
  private lastTimestamp = 0;
  private alpha = 0.85; // Responsive EMA filter
  private feedback: RepQualityFeedback = "good";
  private activeSide: "left" | "right" = "left";

  constructor(config: Partial<RepCounterConfig> = {}, targetReps = 10) {
    this.config = {
      targetMinAngle: config.targetMinAngle ?? 15,
      targetMaxAngle: config.targetMaxAngle ?? 90,
      minRepDurationMs: config.minRepDurationMs ?? 1500,
      maxRepDurationMs: config.maxRepDurationMs ?? 7000,
      visibilityThreshold: config.visibilityThreshold ?? 0.5,
      jitterTolerance: config.jitterTolerance ?? 50,
    };
    this.targetReps = targetReps;
  }

  public update(sample: LandmarkSample): RepCounterResult {
    // 1. ตรวจสอบข้อต่อถูกบัง (Occlusion)
    if (sample.visibility < this.config.visibilityThreshold) {
      this.feedback = "occluded";
      return this.getResult();
    }

    // 2. สลับข้างอัตโนมัติ (Auto side detection)
    if (sample.side && sample.side !== this.activeSide) {
      this.activeSide = sample.side;
    }

    // 3. กรองมุมกระตุก (Jitter Filter)
    const rawDelta = Math.abs(sample.angle - this.lastSmoothedAngle);
    const dt = sample.timestamp - this.lastTimestamp;
    if (this.lastTimestamp > 0 && dt < 100 && rawDelta > this.config.jitterTolerance) {
      this.feedback = "jittery";
      sample.angle = this.lastSmoothedAngle + Math.sign(sample.angle - this.lastSmoothedAngle) * (this.config.jitterTolerance / 2);
    }

    const smoothedAngle =
      this.lastTimestamp === 0
        ? sample.angle
        : this.alpha * sample.angle + (1 - this.alpha) * this.lastSmoothedAngle;

    this.lastSmoothedAngle = smoothedAngle;
    this.lastTimestamp = sample.timestamp;

    // 4. State Machine การนับท่า
    switch (this.state) {
      case "idle":
        if (smoothedAngle >= this.config.targetMinAngle + 5) {
          this.state = "moving_up";
          this.repStartTime = sample.timestamp;
          this.peakAngleReached = smoothedAngle;
          this.feedback = "good";
        }
        break;

      case "moving_up":
        if (smoothedAngle > this.peakAngleReached) {
          this.peakAngleReached = smoothedAngle;
        }

        if (this.peakAngleReached >= this.config.targetMaxAngle - 5) {
          this.state = "peak_reached";
        } else if (smoothedAngle < this.peakAngleReached - 10) {
          // ลดระดับลงก่อนถึงจุดสูงสุด
          this.feedback = "incomplete_rom";
          this.state = "moving_down";
        }
        break;

      case "peak_reached":
        if (smoothedAngle <= this.peakAngleReached - 5) {
          this.state = "moving_down";
        }
        break;

      case "moving_down":
        if (smoothedAngle <= this.config.targetMinAngle + 5) {
          const duration = sample.timestamp - this.repStartTime;

          if (this.feedback === "incomplete_rom") {
            this.state = "idle";
          } else if (duration < this.config.minRepDurationMs) {
            this.feedback = "too_fast";
            this.state = "idle";
          } else if (duration > this.config.maxRepDurationMs) {
            this.feedback = "too_slow";
            this.state = "idle";
          } else {
            // สำเร็จ 1 Rep
            this.currentReps = Math.min(this.targetReps, this.currentReps + 1);
            this.feedback = "good";
            this.state = "idle";
          }
        }
        break;
    }

    return this.getResult();
  }

  public getResult(): RepCounterResult {
    return {
      currentReps: this.currentReps,
      state: this.state,
      feedback: this.feedback,
      smoothedAngle: this.lastSmoothedAngle,
      activeSide: this.activeSide,
      isTargetCompleted: this.currentReps >= this.targetReps,
    };
  }

  public reset(): void {
    this.currentReps = 0;
    this.state = "idle";
    this.repStartTime = 0;
    this.peakAngleReached = 0;
    this.lastSmoothedAngle = 0;
    this.lastTimestamp = 0;
    this.feedback = "good";
  }
}
