import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as completeHandler } from "@/app/api/schedule/complete/route";

function makeJsonRequest(url: string, body: unknown) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/schedule/complete", () => {
  it("saves exercise completion record and writes audit log", async () => {
    const req = makeJsonRequest("/api/schedule/complete", {
      entryId: "plan-1",
      repsAchieved: 5,
      durationSeconds: 20,
      accuracyScore: 95,
    });

    const res = await completeHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.entry.entryId).toBe("plan-1");
    expect(data.entry.status).toBe("done");
  });

  it("rejects invalid input schema with 400", async () => {
    const req = makeJsonRequest("/api/schedule/complete", {
      entryId: "",
      repsAchieved: -1,
    });

    const res = await completeHandler(req);
    expect(res.status).toBe(400);
  });
});
