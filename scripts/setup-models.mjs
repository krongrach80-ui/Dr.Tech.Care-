import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const publicModelsDir = path.join(projectRoot, "public", "models");
const mediapipeWasmDest = path.join(publicModelsDir, "mediapipe", "wasm");
const faceApiDest = path.join(publicModelsDir, "face-api");

// แหล่งที่มาใน node_modules
const mediapipeWasmSrc = path.join(projectRoot, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const faceApiSrc = path.join(projectRoot, "node_modules", "@vladmandic", "face-api", "model");

// รายการ Task models ที่จำเป็นสำหรับ MediaPipe
const REQUIRED_TASK_MODELS = [
  {
    fileName: "face_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    desc: "โมเดลตรวจจับจุดพิกัดใบหน้า 478 จุด (FaceLandmarker)",
  },
  {
    fileName: "pose_landmarker_lite.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
    desc: "โมเดลตรวจจับโครงสร้างร่างกายแบบประหยัดทรัพยากร (PoseLandmarker Lite)",
  },
  {
    fileName: "pose_landmarker_full.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
    desc: "โมเดลตรวจจับโครงสร้างร่างกายแบบความแม่นยำสูง (PoseLandmarker Full)",
  },
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyDirectoryFiles(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`[คำเตือน] ไม่พบโฟลเดอร์ต้นทาง: ${srcDir}`);
    return 0;
  }
  ensureDir(destDir);
  const files = fs.readdirSync(srcDir);
  let count = 0;
  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
      count++;
    }
  }
  return count;
}

async function verifyOrDownloadTaskModels() {
  ensureDir(publicModelsDir);
  const missingModels = [];

  for (const model of REQUIRED_TASK_MODELS) {
    const targetPath = path.join(publicModelsDir, model.fileName);
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      if (stats.size > 100000) {
        console.log(`[ตรวจสอบ] มีไฟล์โมเดล ${model.fileName} แล้ว (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        continue;
      }
    }

    console.log(`[กำลังเตรียม] ไม่พบไฟล์ ${model.fileName} กำลังลองดาวน์โหลดจาก Google Storage...`);
    try {
      const response = await fetch(model.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(targetPath, buffer);
      console.log(`[สำเร็จ] ดาวน์โหลด ${model.fileName} เรียบร้อย (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
    } catch (err) {
      console.warn(`[ข้อผิดพลาด] ไม่สามารถดาวน์โหลด ${model.fileName} อัตโนมัติ: ${err.message}`);
      missingModels.push(model);
    }
  }

  if (missingModels.length > 0) {
    console.error("\n=======================================================");
    console.error(" [คำแนะนำภาษาไทย: การจัดหาไฟล์โมเดล MediaPipe Task ด้วยตนเอง]");
    console.error("=======================================================");
    console.error("สภาพแวดล้อมไม่สามารถดาวน์โหลดโมเดลได้ กรุณาดาวน์โหลดไฟล์ดังต่อไปนี้ด้วยตนเอง:");
    for (const m of missingModels) {
      console.error(`- ${m.fileName}: ${m.desc}`);
      console.error(`  URL: ${m.url}`);
      console.error(`  ตำแหน่งที่ต้องวาง: public/models/${m.fileName}\n`);
    }
    console.error("เมื่อดาวน์โหลดเสร็จแล้ว ให้รันคำสั่ง `pnpm setup:models` ใหม่อีกครั้ง");
    console.error("=======================================================\n");
  }
}

function calculateFileSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

function scanAndBuildManifest(dirPath, baseDir) {
  const result = {};
  if (!fs.existsSync(dirPath)) return result;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      Object.assign(result, scanAndBuildManifest(fullPath, baseDir));
    } else if (entry.isFile() && entry.name !== "manifest.json") {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      const stats = fs.statSync(fullPath);
      const sha256 = calculateFileSha256(fullPath);
      result[relativePath] = {
        size: stats.size,
        sha256,
      };
    }
  }
  return result;
}

async function main() {
  console.log("=== เริ่มต้นการตั้งค่าโมเดลแบบ Local-first สำหรับ Dr.Tech.Care ===");

  // 1. คัดลอก MediaPipe WASM
  console.log("[1/4] กำลังคัดลอก MediaPipe tasks-vision WASM...");
  const wasmCount = copyDirectoryFiles(mediapipeWasmSrc, mediapipeWasmDest);
  console.log(`[สำเร็จ] คัดลอกไฟล์ WASM จำนวน ${wasmCount} ไฟล์ ไปยัง public/models/mediapipe/wasm/`);

  // 2. คัดลอก Face-api weights
  console.log("[2/4] กำลังคัดลอกน้ำหนักโมเดล @vladmandic/face-api...");
  const faceApiCount = copyDirectoryFiles(faceApiSrc, faceApiDest);
  console.log(`[สำเร็จ] คัดลอกไฟล์ weights จำนวน ${faceApiCount} ไฟล์ ไปยัง public/models/face-api/`);

  // 3. ตรวจสอบไฟล์ Task models
  console.log("[3/4] กำลังตรวจสอบไฟล์โมเดล MediaPipe Task...");
  await verifyOrDownloadTaskModels();

  // 4. คำนวณ SHA-256 และสร้าง manifest.json
  console.log("[4/4] กำลังคำนวณ SHA-256 ของไฟล์โมเดลทั้งหมด...");
  const filesManifest = scanAndBuildManifest(publicModelsDir, publicModelsDir);

  const manifest = {
    generatedAt: new Date().toISOString(),
    version: "1.0.0",
    totalFiles: Object.keys(filesManifest).length,
    files: filesManifest,
  };

  const manifestPath = path.join(publicModelsDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`[สำเร็จ] บันทึก public/models/manifest.json เรียบร้อย (รวม ${manifest.totalFiles} ไฟล์)`);

  console.log("=== การตั้งค่าโมเดลเสร็จสมบูรณ์ พร้อมทำงานแบบ Offline 100% ===\n");
}

main().catch((err) => {
  console.error("เกิดข้อผิดพลาดในการตั้งค่าโมเดล:", err);
  process.exit(1);
});
