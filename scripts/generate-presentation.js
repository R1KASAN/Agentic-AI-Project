const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const ROOT = "/Users/ark1/Public/Climate Agent";
const OUT = "/Users/ark1/Downloads/Class_Climate_Agent_Presentation.pptx";

const ASSETS = {
  projectLogo: "/Users/ark1/Desktop/Screenshot 2569-03-31 at 17.12.50.png",
  swuLogo: "/Users/ark1/Downloads/Logo_of_Srinakharinwirot_University.svg.png",
};

function exists(file) {
  return fs.existsSync(file);
}

function addSafeImage(slide, imagePath, x, y, w, h, opts = {}) {
  if (!exists(imagePath)) return;
  slide.addImage({ path: imagePath, x, y, w, h, ...opts });
}

function addSlideBackground(slide, light = true) {
  slide.background = { color: light ? "F6FAFC" : "0B1B33" };
  if (light) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.333, h: 0.25,
      line: { color: "2AA6B5", transparency: 100 },
      fill: { color: "2AA6B5" },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.25, w: 13.333, h: 0.25,
      line: { color: "1C3F73", transparency: 100 },
      fill: { color: "1C3F73" },
    });
  } else {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.333, h: 7.5,
      line: { color: "0B1B33", transparency: 100 },
      fill: { color: "0B1B33" },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 9.6, y: -0.7, w: 3.2, h: 3.2,
      line: { color: "1DA8B8", transparency: 100 },
      fill: { color: "1DA8B8", transparency: 80 },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: -0.7, y: 5.2, w: 2.4, h: 2.4,
      line: { color: "2EA04E", transparency: 100 },
      fill: { color: "2EA04E", transparency: 85 },
    });
  }
}

function addHeader(slide, title, subtitle, label) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.55, y: 0.45, w: 3.1, h: 0.38,
    rectRadius: 0.08,
    line: { color: "D8E7F3", transparency: 100 },
    fill: { color: "DAEAF7" },
  });
  if (label) {
    slide.addText(label, {
      x: 0.7, y: 0.51, w: 2.8, h: 0.18,
      fontFace: "Aptos", fontSize: 10.5, bold: true,
      color: "4F7CA8", margin: 0, align: "left", valign: "mid",
    });
  }
  slide.addText(title, {
    x: 0.55, y: 0.9, w: 8.9, h: 0.58,
    fontFace: "Aptos", fontSize: 26, bold: true,
    color: "10253E", margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.58, y: 1.42, w: 11.8, h: 0.38,
      fontFace: "Aptos", fontSize: 13.5,
      color: "60738A", margin: 0,
    });
  }
}

function addSectionTitle(slide, title, x, y, w = 4.5) {
  slide.addText(title, {
    x, y, w, h: 0.28,
    fontFace: "Aptos", fontSize: 14.5, bold: true,
    color: "214F7D", margin: 0,
  });
}

function addCard(slide, x, y, w, h, fill = "FFFFFF", line = "D8E3EE") {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    line: { color: line, pt: 1.1 },
    fill: { color: fill },
    shadow: { type: "outer", color: "A0B8CC", angle: 45, blur: 2, distance: 1, opacity: 0.18 },
  });
}

function addBulletList(slide, bullets, x, y, w, opts = {}) {
  const fontSize = opts.fontSize || 15;
  const color = opts.color || "24384F";
  const lineGap = opts.lineGap || 0.34;
  const bulletColor = opts.bulletColor || "2D7FF9";
  bullets.forEach((bullet, i) => {
    const yy = y + i * lineGap;
    slide.addText("•", {
      x, y: yy, w: 0.18, h: 0.18,
      fontFace: "Aptos", fontSize: fontSize + 3, bold: true,
      color: bulletColor, margin: 0,
    });
    slide.addText(bullet, {
      x: x + 0.2, y: yy - 0.01, w: w - 0.2, h: 0.23,
      fontFace: "Aptos", fontSize, color, margin: 0,
    });
  });
}

function addPill(slide, text, x, y, w, fill, textColor) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.34,
    rectRadius: 0.08,
    line: { color: fill, transparency: 100 },
    fill: { color: fill },
  });
  slide.addText(text, {
    x, y: y + 0.04, w, h: 0.16,
    fontFace: "Aptos", fontSize: 10.2, bold: true,
    color: textColor, align: "center", valign: "mid", margin: 0,
  });
}

function addFooter(slide, footerText) {
  slide.addText(footerText, {
    x: 0.55, y: 7.0, w: 12.1, h: 0.2,
    fontFace: "Aptos", fontSize: 8.5,
    color: "7B8C9E", margin: 0, align: "right",
  });
}

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Codex";
pptx.company = "Climate Agent";
pptx.subject = "Class Climate Agent Presentation";
pptx.title = "Class Climate Agent";
pptx.lang = "th-TH";
pptx.theme = {
  headFontFace: "Aptos",
  bodyFontFace: "Aptos",
  lang: "th-TH",
};

// Slide 1
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, false);
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.55, y: 0.55, w: 7.3, h: 6.15,
    rectRadius: 0.12,
    line: { color: "2B4263", pt: 1.2 },
    fill: { color: "10253E", transparency: 6 },
  });
  slide.addText("Class Climate Agent", {
    x: 0.95, y: 1.0, w: 6.4, h: 0.72,
    fontFace: "Aptos", fontSize: 28, bold: true,
    color: "FFFFFF", margin: 0,
  });
  slide.addText("AI-powered Classroom Climate Early Warning System", {
    x: 0.95, y: 1.58, w: 6.2, h: 0.28,
    fontFace: "Aptos", fontSize: 13.5,
    color: "C8D8E8", margin: 0,
  });
  addBulletList(slide, [
    "ระบบ Agentic AI สำหรับช่วยติดตามบรรยากาศในห้องเรียน",
    "ช่วยให้ครูเห็นสัญญาณปัญหาได้เร็วขึ้น",
    "คำนึงถึงความเป็นส่วนตัวของนักเรียนเป็นหลัก",
  ], 0.98, 2.1, 6.1, { fontSize: 15.5, color: "EAF2F8", bulletColor: "5BC0DE", lineGap: 0.48 });
  addPill(slide, "Project Logo", 4.95, 4.55, 1.25, "204A7E", "DDEBFF");
  addSafeImage(slide, ASSETS.projectLogo, 4.0, 0.95, 3.4, 4.15);
  addSafeImage(slide, ASSETS.swuLogo, 11.0, 5.98, 1.2, 1.2);
  slide.addText("ภาควิชาวิศวกรรมคอมพิวเตอร์\nคณะวิศวกรรมศาสตร์\nมหาวิทยาลัยศรีนครินทรวิโรฒ", {
    x: 8.15, y: 5.95, w: 2.55, h: 0.85,
    fontFace: "Aptos", fontSize: 10.5, color: "D8E8F9",
    align: "right", margin: 0,
  });
  slide.addText("ผศ.วัชรชัย วิริยะสุทธิวงศ์", {
    x: 8.05, y: 6.8, w: 3.1, h: 0.18,
    fontFace: "Aptos", fontSize: 10.5, color: "8BB7E6",
    align: "right", margin: 0,
  });
}

// Slide 2
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, true);
  addHeader(slide, "Pain Point", "ปัญหาหลักของการดูแลบรรยากาศในห้องเรียน คือครูอาจไม่เห็นสัญญาณเตือนตั้งแต่เนิ่น ๆ", "สรุปปัญหาสำหรับครู");
  addCard(slide, 0.6, 2.05, 3.95, 3.95);
  addCard(slide, 4.7, 2.05, 3.95, 3.95);
  addCard(slide, 8.8, 2.05, 3.95, 3.95);
  addSectionTitle(slide, "ครูเห็นปัญหาช้า", 0.9, 2.35);
  addSectionTitle(slide, "นักเรียนไม่กล้าพูดตรง ๆ", 5.0, 2.35);
  addSectionTitle(slide, "ข้อมูลดิบเสี่ยงต่อความเป็นส่วนตัว", 8.99, 2.35, 3.2);
  addBulletList(slide, [
    "ครูอาจไม่เห็นความเปลี่ยนแปลงของบรรยากาศในห้องเรียนได้ทันเวลา",
    "นักเรียนหลายคนอาจไม่กล้าพูดตรง ๆ ต่อหน้าครู",
  ], 0.9, 2.9, 3.3, { fontSize: 13.2, color: "30465E", bulletColor: "1F7AE0", lineGap: 0.58 });
  addBulletList(slide, [
    "ถ้าเปิด feedback แบบดิบทั้งหมดก็อาจกระทบความเป็นส่วนตัวของนักเรียนได้",
    "ระบบจึงต้องสรุปข้อมูลแบบปลอดภัยและอ่านง่าย",
  ], 5.0, 2.9, 3.3, { fontSize: 13.2, color: "30465E", bulletColor: "2EA04E", lineGap: 0.58 });
  addBulletList(slide, [
    "ต้องมองเห็นสัญญาณสำคัญได้เร็วขึ้น",
    "และให้ครูเป็นผู้ตัดสินใจขั้นสุดท้าย",
  ], 9.08, 2.9, 3.2, { fontSize: 13.2, color: "30465E", bulletColor: "C88A12", lineGap: 0.58 });
  addFooter(slide, "Class Climate Agent");
}

// Slide 3
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, true);
  addHeader(slide, "แสดงภาพปัญหา", "ภาพรวมของห้องเรียนอาจดูปกติจากระยะไกล แต่สัญญาณบางอย่างซ่อนอยู่และต้องอาศัยการสรุปที่ปลอดภัย", "ภาพปัญหา");
  addCard(slide, 0.75, 2.0, 8.0, 4.7);
  addCard(slide, 9.05, 2.0, 3.55, 4.7);
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 1.15, y: 2.45, w: 7.15, h: 3.7,
    rectRadius: 0.08,
    line: { color: "BBD4E8", pt: 1 },
    fill: { color: "EAF4FB" },
  });
  slide.addText("ห้องเรียน", { x: 1.45, y: 2.72, w: 1.2, h: 0.18, fontFace: "Aptos", fontSize: 13, bold: true, color: "214F7D", margin: 0 });
  slide.addText("นักเรียน", { x: 1.45, y: 3.32, w: 1.0, h: 0.18, fontFace: "Aptos", fontSize: 13, bold: true, color: "2EA04E", margin: 0 });
  slide.addText("ครู", { x: 6.7, y: 2.72, w: 0.6, h: 0.18, fontFace: "Aptos", fontSize: 13, bold: true, color: "214F7D", margin: 0, align: "right" });
  addPill(slide, "ครูเห็นปัญหาช้า", 2.4, 4.05, 1.65, "DDEBFF", "1D4E89");
  addPill(slide, "นักเรียนไม่กล้าพูดตรง ๆ", 4.2, 4.05, 2.0, "E4F7EC", "2A7A45");
  addPill(slide, "ข้อมูลดิบเสี่ยง", 6.35, 4.05, 1.55, "FDEFD2", "9A6B00");
  slide.addShape(pptx.ShapeType.line, { x: 2.0, y: 3.7, w: 4.7, h: 0, line: { color: "7FA7C9", pt: 2, beginArrowType: "none", endArrowType: "triangle" } });
  slide.addText("สัญญาณซ่อนอยู่", { x: 3.1, y: 3.38, w: 2.0, h: 0.18, fontFace: "Aptos", fontSize: 11.5, bold: true, color: "7A8EA4", margin: 0, align: "center" });
  addSectionTitle(slide, "สรุปภาพปัญหา", 9.35, 2.35);
  addBulletList(slide, [
    "บรรยากาศในห้องเรียนเปลี่ยนได้เร็ว",
    "สัญญาณจากนักเรียนอาจไม่ถูกพูดออกมาตรง ๆ",
    "ถ้าดูข้อมูลดิบทั้งหมดจะกระทบ privacy",
  ], 9.3, 2.9, 2.65, { fontSize: 12.9, color: "30465E", bulletColor: "1F7AE0", lineGap: 0.62 });
  addFooter(slide, "Class Climate Agent");
}

// Slide 4
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, true);
  addHeader(slide, "อธิบายสรุปสั้น ๆ", "ระบบนี้จึงต้องใช้ AI เข้ามาช่วยสรุปข้อมูลแบบปลอดภัย มองเห็นแนวโน้มได้เร็วขึ้น และยังให้ครูเป็นผู้ตัดสินใจขั้นสุดท้าย", "ทำไมต้องใช้ AI");
  addCard(slide, 0.75, 2.0, 12.0, 4.65);
  addBulletList(slide, [
    "ครูอาจไม่เห็นสัญญาณเตือนตั้งแต่เนิ่น ๆ เช่น นักเรียนเริ่มเครียด เหนื่อย หรือรู้สึกว่าไม่เป็นธรรม",
    "นักเรียนหลายคนอาจไม่กล้าพูดตรง ๆ ต่อหน้าครู",
    "ถ้าเปิด feedback แบบดิบทั้งหมด อาจกระทบความเป็นส่วนตัวของนักเรียน",
    "AI จึงช่วยสรุปข้อมูลแบบ aggregate และทำให้ครูเห็นภาพรวมได้เร็วขึ้น",
    "สุดท้ายครูยังเป็นผู้ approve การดำเนินการทุกครั้ง",
  ], 1.1, 2.45, 10.8, { fontSize: 15.2, color: "24384F", bulletColor: "1F7AE0", lineGap: 0.56 });
  addPill(slide, "Privacy-by-Design", 1.12, 5.85, 1.6, "E4F7EC", "2A7A45");
  addPill(slide, "Aggregate-only", 2.88, 5.85, 1.5, "DDEBFF", "214F7D");
  addPill(slide, "Human-in-the-loop", 4.55, 5.85, 1.85, "FDEFD2", "9A6B00");
  addFooter(slide, "Class Climate Agent");
}

// Slide 5
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, true);
  addHeader(slide, "Demo Overview", "สำหรับเดโมวันนี้ เราจะไล่จากฝั่งนักเรียนไปฝั่งครู แล้วกลับมาฝั่งนักเรียนอีกครั้ง เพื่อให้เห็น flow ของระบบครบตั้งแต่ต้นน้ำจนถึงการตอบสนองกลับ", "ลำดับการเดโม");
  const items = [
    ["1", "Login"],
    ["2", "Student check-in"],
    ["3", "Student feedback"],
    ["4", "Teacher dashboard"],
    ["5", "Teacher class detail / recommendation"],
    ["6", "Approve action"],
    ["7", "Loop closure"],
  ];
  items.forEach((it, idx) => {
    const x = 0.8 + (idx % 4) * 3.15;
    const y = 2.1 + Math.floor(idx / 4) * 1.65;
    addCard(slide, x, y, 2.9, 1.25);
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.16, y: y + 0.18, w: 0.42, h: 0.42,
      line: { color: idx < 3 ? "1F7AE0" : idx < 5 ? "2EA04E" : "C88A12", pt: 1 },
      fill: { color: idx < 3 ? "DDEBFF" : idx < 5 ? "E4F7EC" : "FDEFD2" },
    });
    slide.addText(it[0], {
      x: x + 0.29, y: y + 0.255, w: 0.16, h: 0.12,
      fontFace: "Aptos", fontSize: 11, bold: true,
      color: idx < 3 ? "1F7AE0" : idx < 5 ? "2A7A45" : "9A6B00", margin: 0, align: "center",
    });
    slide.addText(it[1], {
      x: x + 0.7, y: y + 0.2, w: 1.95, h: 0.24,
      fontFace: "Aptos", fontSize: 13.5, bold: true,
      color: "24384F", margin: 0,
    });
  });
  addFooter(slide, "Class Climate Agent");
}

// Slide 6
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, true);
  addHeader(slide, "Demo - ฝั่งนักเรียน", "นักเรียนเข้าสู่ระบบ ส่ง check-in และเปิดหน้า Student Feedback เพื่อดูภาพรวมแบบสรุป ไม่ใช่ข้อมูลดิบรายบุคคล", "student flow");
  addCard(slide, 0.7, 2.0, 3.8, 4.55);
  addCard(slide, 4.78, 2.0, 3.8, 4.55);
  addCard(slide, 8.86, 2.0, 3.8, 4.55);
  addSectionTitle(slide, "1) Login + เช็คอิน", 1.0, 2.35);
  addSectionTitle(slide, "2) ส่งข้อมูลตัวอย่าง", 5.08, 2.35);
  addSectionTitle(slide, "3) ดู Student Feedback", 9.16, 2.35);
  addBulletList(slide, [
    "เข้าใช้ด้วยบัญชีนักเรียนเดโม",
    "เลือกห้องเรียนที่ลงทะเบียนไว้",
    "กดเช็คอินเพื่อสะท้อนความรู้สึกของตัวเอง",
  ], 1.0, 2.88, 2.95, { fontSize: 12.8, color: "30465E", bulletColor: "1F7AE0", lineGap: 0.54 });
  addBulletList(slide, [
    "ระบบบันทึกข้อมูลแบบที่นำไปสรุปต่อได้",
    "ไม่เปิดเผยข้อมูลดิบรายบุคคลให้ครูเห็นตรง ๆ",
    "ใช้เป็น input สำหรับการวิเคราะห์ภาพรวม",
  ], 5.08, 2.88, 2.95, { fontSize: 12.8, color: "30465E", bulletColor: "2EA04E", lineGap: 0.54 });
  addBulletList(slide, [
    "เห็น summary-first",
    "เห็นการตอบสนองล่าสุดจากครู",
    "เข้าใจภาพรวมของห้องได้ง่ายขึ้น",
  ], 9.16, 2.88, 2.95, { fontSize: 12.8, color: "30465E", bulletColor: "C88A12", lineGap: 0.54 });
  addFooter(slide, "Class Climate Agent");
}

// Slide 7
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, true);
  addHeader(slide, "Demo - ฝั่งครู", "ครูเห็นภาพรวมแบบ aggregate เท่านั้น พร้อม risk badge, สรุปแนวโน้ม และจำนวน recommendation ที่รอดำเนินการ", "teacher flow");
  addCard(slide, 0.7, 2.0, 3.8, 4.55);
  addCard(slide, 4.78, 2.0, 3.8, 4.55);
  addCard(slide, 8.86, 2.0, 3.8, 4.55);
  addSectionTitle(slide, "1) Teacher Dashboard", 0.98, 2.35);
  addSectionTitle(slide, "2) Class Climate / Detail", 5.06, 2.35);
  addSectionTitle(slide, "3) Recommendation List", 9.14, 2.35);
  addBulletList(slide, [
    "เห็นการ์ดแต่ละห้อง",
    "เห็น risk level และจำนวนสมาชิก",
    "เห็นสถานะ actions ที่ต้องติดตาม",
  ], 0.98, 2.88, 3.0, { fontSize: 12.8, color: "30465E", bulletColor: "1F7AE0", lineGap: 0.54 });
  addBulletList(slide, [
    "เปิดดูรายละเอียดของห้องเรียนแต่ละห้อง",
    "เห็น summary และ trend แบบปลอดภัย",
    "เห็นห้องที่ควรจับตาเป็นพิเศษ",
  ], 5.06, 2.88, 3.0, { fontSize: 12.8, color: "30465E", bulletColor: "2EA04E", lineGap: 0.54 });
  addBulletList(slide, [
    "AI สร้าง draft recommendation",
    "ครูตรวจทานก่อน approve หรือ dismiss",
    "ยังไม่ส่งผลไปหานักเรียนโดยตรง",
  ], 9.14, 2.88, 3.0, { fontSize: 12.8, color: "30465E", bulletColor: "C88A12", lineGap: 0.54 });
  addFooter(slide, "Class Climate Agent");
}

// Slide 8
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, true);
  addHeader(slide, "Demo - Approval / Loop Closure / Edge / Error Cases", "จุดสำคัญคือ AI จะยังไม่ส่งผลไปหานักเรียนโดยตรง ครูต้อง approve ก่อนเสมอ", "workflow safety");
  addCard(slide, 0.7, 2.0, 3.0, 4.55);
  addCard(slide, 3.95, 2.0, 3.0, 4.55);
  addCard(slide, 7.2, 2.0, 2.95, 4.55);
  addCard(slide, 10.37, 2.0, 2.25, 4.55);
  addSectionTitle(slide, "Approve action", 1.02, 2.35);
  addSectionTitle(slide, "Loop closure", 4.3, 2.35);
  addSectionTitle(slide, "Edge case", 7.42, 2.35);
  addSectionTitle(slide, "Error case", 10.53, 2.35);
  addBulletList(slide, [
    "ครู approve หรือ dismiss recommendation",
    "สามารถใส่ note สั้น ๆ ได้",
  ], 1.0, 2.86, 2.35, { fontSize: 12.6, color: "30465E", bulletColor: "1F7AE0", lineGap: 0.56 });
  addBulletList(slide, [
    "หลัง approve แล้ว ระบบส่งผลกลับไปยังฝั่งนักเรียน",
    "Student Feedback แสดงการตอบสนองล่าสุดจากครู",
  ], 4.27, 2.86, 2.35, { fontSize: 12.6, color: "30465E", bulletColor: "2EA04E", lineGap: 0.56 });
  addBulletList(slide, [
    "ถ้าข้อมูลยังไม่ถึงระดับที่ปลอดภัยพอ",
    "ระบบจะไม่สรุปเกินจริง",
  ], 7.43, 2.86, 2.2, { fontSize: 12.6, color: "30465E", bulletColor: "C88A12", lineGap: 0.56 });
  addBulletList(slide, [
    "login ผิด / session หมดอายุ / ไม่มีสิทธิ์",
    "ระบบแสดงข้อความแจ้งเตือนที่ชัดเจน",
  ], 10.56, 2.86, 1.75, { fontSize: 12.2, color: "30465E", bulletColor: "C94B3C", lineGap: 0.56 });
  addFooter(slide, "Class Climate Agent");
}

// Slide 9
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, true);
  addHeader(slide, "Architecture & Process Review", "สถาปัตยกรรมของระบบถูกแบ่งเป็น 2 โหมดหลัก คือ Preprocessing Mode และ Processing Mode", "system architecture");
  addCard(slide, 0.55, 2.0, 12.2, 4.8);
  addSectionTitle(slide, "Architecture of the Agentic AI System", 0.9, 2.32, 5.4);
  // Left lane
  const laneY = 2.78;
  const boxW = 1.8;
  const boxH = 0.62;
  const leftX = 0.95;
  const gap = 0.18;
  const preBoxes = [
    "Student Input",
    "Next.js Frontend",
    "API / Route Handlers",
    "Supabase Auth",
    "Supabase PostgreSQL",
    "Privacy Guard +\nAggregation Layer",
    "Prepared Climate Signals",
  ];
  preBoxes.forEach((t, i) => {
    const y = laneY + i * 0.56;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: leftX, y, w: boxW, h: boxH,
      rectRadius: 0.06,
      line: { color: "B7CBE0", pt: 1 },
      fill: { color: i === 4 ? "EAF4FB" : "F7FBFF" },
    });
    slide.addText(t, {
      x: leftX + 0.08, y: y + 0.09, w: boxW - 0.16, h: 0.42,
      fontFace: "Aptos", fontSize: 10.2, bold: i <= 1,
      color: "28435E", align: "center", valign: "mid", margin: 0,
    });
    if (i < preBoxes.length - 1) {
      slide.addShape(pptx.ShapeType.chevron, {
        x: leftX + 0.72, y: y + 0.64, w: 0.36, h: 0.16,
        line: { color: "1F7AE0", pt: 1.3 }, fill: { color: "1F7AE0" },
      });
    }
  });
  // Right lane
  addPill(slide, "Preprocessing Mode", 5.55, 2.52, 1.8, "DDEBFF", "214F7D");
  addPill(slide, "Processing Mode", 9.18, 2.52, 1.65, "E4F7EC", "2A7A45");
  const procX = 6.0;
  const procBoxes = [
    "N8N Workflow Orchestrator",
    "W01 Agentic AI Recommendation",
    "Tool Sub-workflows",
    "LLM Analysis\nLangChain Agent + Gemini",
    "Recommendation Draft",
    "Teacher Review / Approval",
    "Approved Action / Response",
  ];
  procBoxes.forEach((t, i) => {
    const y = laneY + i * 0.56;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: procX, y, w: 2.75, h: boxH,
      rectRadius: 0.06,
      line: { color: i === 0 ? "9FC6E8" : "C6D6E5", pt: 1 },
      fill: { color: i === 0 ? "EAF4FB" : "F8FBFD" },
    });
    slide.addText(t, {
      x: procX + 0.08, y: y + 0.09, w: 2.59, h: 0.42,
      fontFace: "Aptos", fontSize: 10.0, bold: i <= 1,
      color: "28435E", align: "center", valign: "mid", margin: 0,
    });
    if (i < procBoxes.length - 1) {
      slide.addShape(pptx.ShapeType.chevron, {
        x: procX + 1.18, y: y + 0.64, w: 0.36, h: 0.16,
        line: { color: "2EA04E", pt: 1.3 }, fill: { color: "2EA04E" },
      });
    }
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 4.0, y: 5.95, w: 1.8, h: 0,
    line: { color: "6EA6D8", pt: 1.2, dash: "dash" },
  });
  slide.addText("Apply migrations, provision demo auth, then load supabase/seed/presentation-dataset.sql.", {
    x: 0.95, y: 6.45, w: 11.7, h: 0.2,
    fontFace: "Courier New", fontSize: 9.6, color: "3C5166", margin: 0,
  });
  addFooter(slide, "Class Climate Agent");
}

// Slide 10
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, true);
  addHeader(slide, "Development Process Review", "ในการพัฒนาโปรเจกต์นี้ เราเริ่มจาก UX/UI แล้วค่อยเชื่อมฐานข้อมูล API automation และ AI workflow เข้าด้วยกัน", "development process");
  addCard(slide, 0.75, 2.0, 12.0, 4.75);
  const steps = [
    ["1", "ออกแบบ UX/UI"],
    ["2", "สร้างฐานข้อมูลและ auth"],
    ["3", "พัฒนา frontend"],
    ["4", "เชื่อม API / Supabase"],
    ["5", "สร้าง n8n workflow"],
    ["6", "ทดสอบและปรับปรุง"],
  ];
  steps.forEach((s, i) => {
    const x = 1.0 + (i % 3) * 3.9;
    const y = 2.55 + Math.floor(i / 3) * 1.55;
    addCard(slide, x, y, 3.3, 1.1, i % 2 ? "F7FBFF" : "FFFFFF");
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.18, y: y + 0.22, w: 0.42, h: 0.42,
      line: { color: "1F7AE0", pt: 1 },
      fill: { color: "DDEBFF" },
    });
    slide.addText(s[0], {
      x: x + 0.32, y: y + 0.285, w: 0.15, h: 0.12,
      fontFace: "Aptos", fontSize: 11, bold: true,
      color: "1F7AE0", margin: 0, align: "center",
    });
    slide.addText(s[1], {
      x: x + 0.72, y: y + 0.24, w: 2.25, h: 0.24,
      fontFace: "Aptos", fontSize: 13, bold: true,
      color: "24384F", margin: 0,
    });
  });
  addBulletList(slide, [
    "Next.js และ React เป็นแกนหลักของ frontend",
    "Tailwind CSS และ shadcn/ui ช่วยคุม visual language ให้สอดคล้องกัน",
    "Supabase ใช้จัดการฐานข้อมูลและ authentication",
    "n8n ทำหน้าที่เป็น workflow orchestration",
    "LangChain + Gemini ใช้สร้าง recommendation draft",
    "Vitest และ Playwright ใช้ทดสอบระบบก่อนเดโม",
  ], 1.02, 4.95, 10.5, { fontSize: 12.7, color: "30465E", bulletColor: "2EA04E", lineGap: 0.34 });
  addFooter(slide, "Class Climate Agent");
}

// Slide 11
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, true);
  addHeader(slide, "Future Work Development", "ในอนาคต ระบบนี้สามารถต่อยอดได้อีกหลายด้านเพื่อให้ใช้งานได้จริงและรองรับการใช้งานในระยะยาว", "roadmap");
  addCard(slide, 0.95, 2.2, 11.4, 4.35);
  const workItems = [
    "แจ้งเตือนแบบ production-ready",
    "analytics ระดับโรงเรียน",
    "model monitoring",
    "role สำหรับผู้บริหาร",
    "ติดตามผลหลังครูดำเนินการ",
  ];
  addBulletList(slide, workItems, 1.35, 2.75, 9.8, { fontSize: 15.1, color: "24384F", bulletColor: "1F7AE0", lineGap: 0.56 });
  addPill(slide, "อนาคตของระบบ", 9.5, 2.78, 1.4, "DDEBFF", "214F7D");
  slide.addText("เพื่อให้ระบบใช้งานได้จริงในระยะยาว", {
    x: 9.15, y: 4.72, w: 2.3, h: 0.18,
    fontFace: "Aptos", fontSize: 11.5, color: "60738A", align: "center", margin: 0,
  });
  addFooter(slide, "Class Climate Agent");
}

// Slide 12
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, true);
  addHeader(slide, "References", "เอกสารอ้างอิงที่ใช้ประกอบการพัฒนาและการตรวจสอบระบบ", "แหล่งอ้างอิง");
  addCard(slide, 0.95, 2.1, 11.4, 4.7);
  addBulletList(slide, [
    "Next.js Documentation — https://nextjs.org/docs",
    "Supabase Documentation — https://supabase.com/docs",
    "n8n Documentation — https://docs.n8n.io",
    "Google AI for Developers / Gemini API — https://ai.google.dev",
    "Playwright Documentation — https://playwright.dev",
  ], 1.35, 2.6, 10.2, { fontSize: 13.1, color: "24384F", bulletColor: "2EA04E", lineGap: 0.52 });
  addFooter(slide, "Class Climate Agent");
}

// Slide 13 team/advisor
{
  const slide = pptx.addSlide();
  addSlideBackground(slide, false);
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.55, y: 0.55, w: 12.2, h: 6.3,
    rectRadius: 0.12,
    line: { color: "26405F", pt: 1.2 },
    fill: { color: "10253E", transparency: 8 },
  });
  slide.addText("สมาชิก + ภาพหมู่", {
    x: 0.95, y: 0.9, w: 4.2, h: 0.3,
    fontFace: "Aptos", fontSize: 22, bold: true,
    color: "FFFFFF", margin: 0,
  });
  slide.addText("ภาควิชาวิศวกรรมคอมพิวเตอร์  คณะวิศวกรรมศาสตร์  มหาวิทยาลัยศรีนครินทรวิโรฒ", {
    x: 0.95, y: 1.3, w: 8.7, h: 0.2,
    fontFace: "Aptos", fontSize: 11.5, color: "C7D7E6", margin: 0,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.95, y: 1.72, w: 4.65, h: 4.45,
    rectRadius: 0.08,
    line: { color: "2F4A69", pt: 1 },
    fill: { color: "16304F" },
  });
  slide.addText("ภาพหมู่สมาชิก", {
    x: 2.0, y: 3.55, w: 2.4, h: 0.22,
    fontFace: "Aptos", fontSize: 14, bold: true,
    color: "EAF2F8", align: "center", margin: 0,
  });
  slide.addText("ชื่อ-สกุลสมาชิก 1\nชื่อ-สกุลสมาชิก 2\nชื่อ-สกุลสมาชิก 3\nชื่อ-สกุลสมาชิก 4", {
    x: 6.0, y: 2.0, w: 5.2, h: 1.2,
    fontFace: "Aptos", fontSize: 16, bold: true,
    color: "FFFFFF", margin: 0,
  });
  slide.addText("ที่ปรึกษา : ผศ.วัชรชัย วิริยะสุทธิวงศ์", {
    x: 6.0, y: 3.65, w: 5.0, h: 0.2,
    fontFace: "Aptos", fontSize: 14, color: "D6E8F8", margin: 0,
  });
  slide.addText("ที่ปรึกษาร่วม (ถ้ามี)", {
    x: 6.0, y: 4.0, w: 3.0, h: 0.2,
    fontFace: "Aptos", fontSize: 14, color: "D6E8F8", margin: 0,
  });
  addSafeImage(slide, ASSETS.projectLogo, 6.0, 4.6, 2.8, 1.15);
  addSafeImage(slide, ASSETS.swuLogo, 10.1, 4.45, 1.6, 1.6);
  slide.addText("มหาวิทยาลัยศรีนครินทรวิโรฒ", {
    x: 9.2, y: 6.15, w: 2.5, h: 0.18,
    fontFace: "Aptos", fontSize: 10.5, color: "C7D7E6", align: "right", margin: 0,
  });
}

(async () => {
  await pptx.writeFile({ fileName: OUT });
  console.log(`Wrote ${OUT}`);
})();
