import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

async function generateDocumentationPdf() {
  const pdfDoc = await PDFDocument.create();

  // Color palette
  const darkNavy = rgb(0.04, 0.08, 0.15); // #0a1426
  const cyanAccent = rgb(0.08, 0.72, 0.85); // #15b8d9
  const textDark = rgb(0.12, 0.15, 0.2); // body text
  const textLightMuted = rgb(0.4, 0.45, 0.52);
  const borderGray = rgb(0.85, 0.88, 0.92);
  const calloutBg = rgb(0.95, 0.97, 1.0);
  const white = rgb(1, 1, 1);

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const pageWidth = 595.28; // Standard A4
  const pageHeight = 841.89;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const addNewPageIfNeeded = (requiredHeight: number) => {
    if (y - requiredHeight < margin + 20) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeaderFooter();
    }
  };

  const drawHeaderFooter = () => {
    // Header line
    currentPage.drawText("ORCA: Ocean Risk & Conservation Analytics | Technical Whitepaper", {
      x: margin,
      y: pageHeight - 30,
      size: 8,
      font: fontRegular,
      color: textLightMuted,
    });
    currentPage.drawLine({
      start: { x: margin, y: pageHeight - 34 },
      end: { x: pageWidth - margin, y: pageHeight - 34 },
      thickness: 0.5,
      color: borderGray,
    });

    // Footer line
    currentPage.drawLine({
      start: { x: margin, y: 36 },
      end: { x: pageWidth - margin, y: 36 },
      thickness: 0.5,
      color: borderGray,
    });
    currentPage.drawText("Confidential & Proprietary - Marine Ecological Telemetry & AI Synthesis System", {
      x: margin,
      y: 24,
      size: 8,
      font: fontRegular,
      color: textLightMuted,
    });
  };

  // Helper for text blocks
  const printHeading1 = (title: string) => {
    addNewPageIfNeeded(40);
    y -= 14;
    currentPage.drawText(title, {
      x: margin,
      y,
      size: 16,
      font: fontBold,
      color: darkNavy,
    });
    y -= 4;
    currentPage.drawLine({
      start: { x: margin, y },
      end: { x: margin + contentWidth, y },
      thickness: 1.5,
      color: cyanAccent,
    });
    y -= 14;
  };

  const printHeading2 = (title: string) => {
    addNewPageIfNeeded(26);
    y -= 8;
    currentPage.drawText(title, {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: cyanAccent,
    });
    y -= 14;
  };

  const printParagraph = (text: string, font = fontRegular, size = 9.5, color = textDark, lineSpacing = 13) => {
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      const testLine = line + (line === "" ? "" : " ") + word;
      const width = font.widthOfTextAtSize(testLine, size);
      if (width > contentWidth) {
        addNewPageIfNeeded(lineSpacing);
        currentPage.drawText(line, { x: margin, y, size, font, color });
        y -= lineSpacing;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line !== "") {
      addNewPageIfNeeded(lineSpacing);
      currentPage.drawText(line, { x: margin, y, size, font, color });
      y -= lineSpacing;
    }
    y -= 4;
  };

  const printBullet = (label: string, body: string) => {
    addNewPageIfNeeded(20);
    currentPage.drawCircle({
      x: margin + 4,
      y: y - 3,
      size: 2,
      color: cyanAccent,
    });

    const fullText = `${label}: ${body}`;
    const words = fullText.split(" ");
    let line = "";
    let isFirst = true;

    for (const word of words) {
      const testLine = line + (line === "" ? "" : " ") + word;
      const width = fontRegular.widthOfTextAtSize(testLine, 9);
      if (width > contentWidth - 16) {
        addNewPageIfNeeded(12);
        currentPage.drawText(line, {
          x: margin + 14,
          y,
          size: 9,
          font: isFirst ? fontBold : fontRegular,
          color: textDark,
        });
        y -= 12;
        line = word;
        isFirst = false;
      } else {
        line = testLine;
      }
    }
    if (line !== "") {
      addNewPageIfNeeded(12);
      currentPage.drawText(line, {
        x: margin + 14,
        y,
        size: 9,
        font: isFirst ? fontBold : fontRegular,
        color: textDark,
      });
      y -= 12;
    }
    y -= 3;
  };

  const printBox = (textArr: string[]) => {
    const boxHeight = textArr.length * 13 + 16;
    addNewPageIfNeeded(boxHeight + 10);
    currentPage.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: contentWidth,
      height: boxHeight,
      color: calloutBg,
      borderColor: cyanAccent,
      borderWidth: 1,
    });

    let currentY = y - 14;
    for (const line of textArr) {
      currentPage.drawText(line, {
        x: margin + 12,
        y: currentY,
        size: 8.5,
        font: fontMono,
        color: darkNavy,
      });
      currentY -= 13;
    }
    y -= boxHeight + 12;
  };

  // ==================== COVER / HEADER SECTION ====================
  // Top Banner
  currentPage.drawRectangle({
    x: 0,
    y: pageHeight - 110,
    width: pageWidth,
    height: 110,
    color: darkNavy,
  });

  currentPage.drawText("ORCA MARINE INTELLIGENCE SYSTEM", {
    x: margin,
    y: pageHeight - 48,
    size: 20,
    font: fontBold,
    color: white,
  });

  currentPage.drawText("Autonomous Marine Ecological Risk & Conservation Analytics Platform", {
    x: margin,
    y: pageHeight - 70,
    size: 11,
    font: fontRegular,
    color: cyanAccent,
  });

  currentPage.drawText("Comprehensive Technical Architecture, Integrations, and System Documentation", {
    x: margin,
    y: pageHeight - 88,
    size: 9,
    font: fontRegular,
    color: rgb(0.8, 0.85, 0.95),
  });

  y = pageHeight - 130;

  // Metadata Box
  printBox([
    "DOCUMENT CLASSIFICATION : Production Technical Architecture Specification",
    "TARGET SYSTEMS          : Google Earth Engine (GEE), Gemini 3.6 Multi-Agent AI, GIS Telemetry",
    "PROJECT ID              : ai-studio-489914 | GCP Cloud Run Container Runtime",
    "COMPLIANCE & STANDARDS  : NOAA Coral Reef Watch (CRW v3.1), IPCC AR6 WGII Chapter 3",
  ]);

  // ==================== 1. EXECUTIVE SUMMARY ====================
  printHeading1("1. Executive Summary & Problem Statement");
  printParagraph(
    "Tropical coral reefs and marine ecosystems support over 25% of all marine biodiversity while occupying less than 0.1% of the ocean floor. Accelerating climate change, anthropogenic atmospheric carbon emissions, and unprecedented marine heatwaves have pushed delicate benthic reef communities past critical thermal tipping points. Global bleaching events require proactive, real-time telemetry and automated ecological decision synthesis rather than retrospective post-mortem reports."
  );
  printParagraph(
    "ORCA (Ocean Risk & Conservation Analytics) is a high-resolution, full-stack marine intelligence platform engineered to bridge orbital Earth observation satellites with generative artificial intelligence. By continuously synthesizing satellite sea surface temperatures, degree heating weeks (DHW), biogeochemical ocean metrics, and scientific literature, ORCA delivers immediate consensus-driven conservation directives for vulnerable reefs across the planet."
  );

  // ==================== 2. COMPLETE TECH STACK ====================
  printHeading1("2. Technology Stack & Component Architecture");

  printHeading2("Frontend Architecture");
  printBullet("Framework & Runtime", "React 18 with Vite, TypeScript 5.7, and ES module bundling.");
  printBullet("Styling System", "Tailwind CSS with responsive dark cybernetic oceanographic theme and WCAG AA contrast.");
  printBullet("Motion & Transitions", "Framer Motion layout animations for real-time telemetry card state changes.");
  printBullet("Spatial GIS Mapping", "Leaflet 1.9 with dual cartography engines: Esri World Imagery (sub-meter true-color satellite) and CartoDB Dark Matter (tactical radar mode).");
  printBullet("Data Visualization", "Recharts 2.15 rendering 30-day chronological thermal progression and Degree Heating Week accumulation curves.");

  printHeading2("Backend Engine & Microservices");
  printBullet("Server Core", "Node.js with Express 4, custom TypeScript bundling via esbuild, self-contained dist/server.cjs.");
  printBullet("Production Deployment", "Google Cloud Run container environment listening on ingress port 3000.");
  printBullet("REST Endpoints", "/api/evaluate (spatial ingestion & AI synthesis), /api/earthengine/status (GCP credential verification), /api/health.");

  printHeading2("Cloud & AI Infrastructure");
  printBullet("Google Earth Engine (GEE)", "Authenticated via google-auth-library with GCP Service Account credentials (satelite@ai-studio-489914.iam.gserviceaccount.com).");
  printBullet("Generative AI Framework", "Google GenAI SDK (@google/genai) executing Gemini 3.6 Flash multi-agent reasoning.");

  // ==================== 3. GOOGLE EARTH ENGINE INTEGRATION ====================
  printHeading1("3. Google Earth Engine (GEE) Telemetry Pipeline");
  printParagraph(
    "The application integrates directly with Google Earth Engine using official Google Cloud service account keys. Telemetry processing pulls from high-precision orbital constellations and gridded hydrodynamic datasets:"
  );

  printBullet("NOAA Coral Reef Watch (CRW)", "Daily global 5km satellite Sea Surface Temperature (SST) and SST Anomaly monitoring against 1985-2012 climatological baselines.");
  printBullet("Degree Heating Weeks (DHW)", "Calculates thermal stress accumulation over rolling 12-week windows. Expressed in °C-weeks: DHW = Sum(SST Anomaly >= 1.0°C) * (days / 7).");
  printBullet("Copernicus Sentinel-3 & MODIS", "Multi-spectral radiometry measuring Chlorophyll-a concentrations (mg/m³) to track nutrient enrichment, agricultural runoff, and phytoplankton blooms.");
  printBullet("Biogeochemical Sensors", "Tracks ocean acidification (pH levels from 7.80 to 8.25) and Dissolved Oxygen (mg/L) saturation to flag hypoxic lagoon pockets.");

  // ==================== 4. GEMINI MULTI-AGENT ARCHITECTURE ====================
  printHeading1("4. Gemini Multi-Agent Ecological Consensus System");
  printParagraph(
    "When a user selects coordinates on the interactive map or chooses a global marine hotspot, the backend feeds live spatial metrics into a specialized multi-agent neural synthesis loop powered by Gemini 3.6 Flash. Three distinct autonomous personas deliberate concurrently:"
  );

  printBullet("Agent 1: Anomaly Analyst", "Performs mathematical regression and bio-telemetry threshold checks. Detects acute temperature spikes, pH depressions, and DHW accumulation crossing mortality thresholds.");
  printBullet("Agent 2: RAG Policy Specialist", "Retrieval-Augmented policy analyst grounded in NOAA CRW Bleaching Alert Frameworks, IPCC AR6 Working Group II Chapter 3, and peer-reviewed marine heatwave literature (Hughes et al. 2018).");
  printBullet("Agent 3: Decision Synthesizer", "Synthesizes consensus directives into an actionable tripartite Action Matrix: Intervention (immediate emergency restrictions), Protection (48-hour mitigation), and Restoration (7-14 day ecological seeding).");

  printParagraph(
    "All outputs are enforced via structured JSON schema parsing with typed safety fallbacks, guaranteeing zero runtime downtime even during transient connectivity spikes."
  );

  // ==================== 5. FORMULAS & THRESHOLDS ====================
  printHeading1("5. Ecological Indices & Threshold Mathematics");

  printParagraph("The Composite Coral Health Index (CHI) is computed on a scale from 0 to 100:");
  printBox([
    "CHI = 100 - [ (TempAnomaly * 15) + (DHW * 5) + (max(0, 8.15 - pH) * 80) + (max(0, 6.0 - DO) * 8) ]",
    "",
    "STATUS THRESHOLDS:",
    "  * CHI >= 75 : Healthy Status (Low vulnerability, baseline monitoring)",
    "  * 50 <= CHI < 75 : Moderate Risk (Early warning, bleaching advisory)",
    "  * CHI < 50 : Critical Risk (NOAA Alert Level 2, severe bleaching expected)",
  ]);

  // ==================== 6. GLOBAL MARINE PRESETS ====================
  printHeading1("6. Included Global Marine Hotspots & Presets");
  printBullet("Great Barrier Reef (North), Australia", "Coordinates: -14.5000°, 145.5000° | High-density Acropora coral diversity facing recurrent marine heatwaves.");
  printBullet("Florida Keys Marine Sanctuary, USA", "Coordinates: 24.6500°, -81.4000° | Severe thermal anomalies with targeted nursery restoration programs.");
  printBullet("Raja Ampat (Coral Triangle), Indonesia", "Coordinates: -0.5000°, 130.5000° | Global epicenter of marine biodiversity with complex upwelling dynamics.");
  printBullet("Red Sea Coral Coast, Egypt", "Coordinates: 27.2579°, 33.8116° | High-salinity thermal refuge zone harboring heat-resistant zooxanthellae lineages.");
  printBullet("Chagos Archipelago, Indian Ocean", "Coordinates: -6.0000°, 71.5000° | Remote oceanic atolls providing reference baselines isolated from direct coastal development.");

  // ==================== 7. SUMMARY & EXPORT ====================
  printHeading1("7. System Readiness & Verification");
  printParagraph(
    "ORCA is fully compiled, verified, and operational. Both external integrations (Google Earth Engine GCP Service Account and Google Gemini 3.6 Flash) have been validated via end-to-end integration tests. The application operates in high-performance dual map mode with zero external billing dependencies, rendering real-time marine intelligence on any desktop or mobile device."
  );

  // Draw Header/Footer on all pages
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    // Page numbering
    page.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: pageWidth - margin - 50,
      y: 24,
      size: 8,
      font: fontRegular,
      color: textLightMuted,
    });
    // Header for subsequent pages
    if (i > 0) {
      page.drawText("ORCA: Ocean Risk & Conservation Analytics | Technical Whitepaper", {
        x: margin,
        y: pageHeight - 30,
        size: 8,
        font: fontRegular,
        color: textLightMuted,
      });
      page.drawLine({
        start: { x: margin, y: pageHeight - 34 },
        end: { x: pageWidth - margin, y: pageHeight - 34 },
        thickness: 0.5,
        color: borderGray,
      });
      page.drawLine({
        start: { x: margin, y: 36 },
        end: { x: pageWidth - margin, y: 36 },
        thickness: 0.5,
        color: borderGray,
      });
      page.drawText("Confidential & Proprietary - Marine Ecological Telemetry & AI Synthesis System", {
        x: margin,
        y: 24,
        size: 8,
        font: fontRegular,
        color: textLightMuted,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();

  // Write to both public and dist directories
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicPath = path.join(publicDir, "ORCA_Technical_Documentation.pdf");
  fs.writeFileSync(publicPath, pdfBytes);

  const distDir = path.join(process.cwd(), "dist");
  if (fs.existsSync(distDir)) {
    const distPath = path.join(distDir, "ORCA_Technical_Documentation.pdf");
    fs.writeFileSync(distPath, pdfBytes);
  }

  console.log(`PDF successfully created at ${publicPath} (${pdfBytes.length} bytes)`);
}

generateDocumentationPdf().catch(console.error);
