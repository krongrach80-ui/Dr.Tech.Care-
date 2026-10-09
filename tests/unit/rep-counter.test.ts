import { describe, it, expect, beforeEach } from "vitest";
import { PoseRepStateMachine } from "@/features/pose/repCounter";

describe("Pose Rep State Machine (10-Rep Clinical Engine)", () => {
  let counter: PoseRepStateMachine;

  beforeEach(() => {
    counter = new PoseRepStateMachine(
      {
        targetMinAngle: 15,
        targetMaxAngle: 90,
        minRepDurationMs: 1500,
        maxRepDurationMs: 6000,
        visibilityThreshold: 0.5,
      },
      10
    );
  });

  // Helper เพื่อจำลองการเคลื่อนไหวของข้อต่ออย่างต่อเนื่องตามเวลา
  function simulateTrajectory(
    machine: PoseRepStateMachine,
    startAngle: number,
    peakAngle: number,
    endAngle: number,
    durationMs: number,
    baseTimestamp: number
  ) {
    const steps = 10;
    const halfSteps = steps / 2;
    const dt = durationMs / steps;
    let t = baseTimestamp;

    // Upward
    for (let i = 0; i <= halfSteps; i++) {
      const angle = startAngle + (peakAngle - startAngle) * (i / halfSteps);
      machine.update({ angle, visibility: 0.95, timestamp: t });
      t += dt;
    }

    // Downward
    let lastResult = machine.getResult();
    for (let i = 1; i <= halfSteps; i++) {
      const angle = peakAngle - (peakAngle - endAngle) * (i / halfSteps);
      lastResult = machine.update({ angle, visibility: 0.95, timestamp: t });
      t += dt;
    }

    return { lastResult, nextTimestamp: t };
  }

  it("accurately counts 10 perfect reps to 10 and flags completion", () => {
    let t = 1000;

    for (let r = 1; r <= 10; r++) {
      // ทำท่าขึ้นลง 15° -> 90° -> 15° ใช้เวลา 2000ms
      const sim = simulateTrajectory(counter, 15, 92, 15, 2000, t);
      t = sim.nextTimestamp + 500; // พัก 500ms ระหว่าง Rep

      expect(sim.lastResult.currentReps).toBe(r);
      expect(sim.lastResult.feedback).toBe("good");
    }

    const finalRes = counter.getResult();
    expect(finalRes.currentReps).toBe(10);
    expect(finalRes.isTargetCompleted).toBe(true);
  });

  it("rejects incomplete ROM when user fails to reach target max angle", () => {
    // ยกขึ้นแค่ 50° (เป้าหมายคือ 90°)
    const sim = simulateTrajectory(counter, 15, 50, 15, 2000, 1000);

    expect(sim.lastResult.currentReps).toBe(0);
    expect(sim.lastResult.feedback).toBe("incomplete_rom");
  });

  it("rejects repetitions done too fast (< 1500ms)", () => {
    // ทำท่าเร็วผิดปกติเพียง 500ms
    const sim = simulateTrajectory(counter, 15, 90, 15, 600, 1000);

    expect(sim.lastResult.currentReps).toBe(0);
    expect(sim.lastResult.feedback).toBe("too_fast");
  });

  it("rejects repetitions done too slow (> 6000ms)", () => {
    // ทำท่าช้าเกินเกณฑ์ เช่น 8000ms
    const sim = simulateTrajectory(counter, 15, 90, 15, 8000, 1000);

    expect(sim.lastResult.currentReps).toBe(0);
    expect(sim.lastResult.feedback).toBe("too_slow");
  });

  it("handles joint occlusion (visibility < 0.5) gracefully", () => {
    const res = counter.update({
      angle: 90,
      visibility: 0.2, // Occluded
      timestamp: 1000,
    });

    expect(res.feedback).toBe("occluded");
    expect(res.currentReps).toBe(0);
  });

  it("automatically switches tracking side between left and right", () => {
    const leftRes = counter.update({
      angle: 30,
      visibility: 0.9,
      timestamp: 1000,
      side: "left",
    });
    expect(leftRes.activeSide).toBe("left");

    const rightRes = counter.update({
      angle: 30,
      visibility: 0.9,
      timestamp: 2000,
      side: "right",
    });
    expect(rightRes.activeSide).toBe("right");
  });
});
