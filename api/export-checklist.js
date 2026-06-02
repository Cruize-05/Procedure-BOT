// Vercel Serverless Function — PDF checklist generation (no filesystem writes)
import PDFDocument from 'pdfkit';

const LABELS = {
  en: {
    officialCost: 'OFFICIAL COST',
    estimatedTimeline: 'ESTIMATED TIMELINE',
    requiredDocuments: 'Required Documents',
    steps: 'Steps to Follow',
    footer: (d) => `ProcedureBot CM — Generated on ${d}`,
  },
  fr: {
    officialCost: 'COÛT OFFICIEL',
    estimatedTimeline: 'DÉLAI ESTIMÉ',
    requiredDocuments: 'Documents Requis',
    steps: 'Étapes à Suivre',
    footer: (d) => `ProcedureBot CM — Généré le ${d}`,
  },
};

function validateBody(body) {
  const lang = body.language === 'fr' ? 'fr' : 'en';

  if (!body.procedure_code) return { error: '`procedure_code` is required.' };

  const bilingual = ['name', 'target_office', 'estimated_timeline', 'required_documents', 'steps'];
  for (const field of bilingual) {
    if (!body[field] || body[field][lang] == null)
      return { error: `\`${field}.${lang}\` is required.` };
  }

  if (!Array.isArray(body.required_documents[lang]))
    return { error: `\`required_documents.${lang}\` must be an array.` };

  if (!Array.isArray(body.steps[lang]))
    return { error: `\`steps.${lang}\` must be an array.` };

  if (body.official_cost_cfa == null)
    return { error: '`official_cost_cfa` is required.' };

  return { lang };
}

function renderPDF(doc, { lang, labels, name, targetOffice, costCfa, timeline, documents, steps }) {
  const margin = 50;
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - margin * 2;

  // Header bar
  doc.rect(margin, margin, contentWidth, 64).fill('#1a5276');
  doc
    .fillColor('white')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(name, margin, margin + 10, { width: contentWidth, align: 'center' });
  doc
    .fillColor('#bde0f7')
    .fontSize(10)
    .font('Helvetica')
    .text(targetOffice, margin, margin + 38, { width: contentWidth, align: 'center' });
  doc.fillColor('black');
  doc.y = margin + 84;

  // Metric boxes: Official Cost | Estimated Timeline
  const boxW = (contentWidth - 10) / 2;
  const boxH = 64;
  const boxY = doc.y;

  doc.rect(margin, boxY, boxW, boxH).fill('#eaf4fb').stroke('#2196f3');
  doc
    .fillColor('#1a5276')
    .fontSize(8)
    .font('Helvetica-Bold')
    .text(labels.officialCost, margin + 4, boxY + 10, { width: boxW - 8, align: 'center' });
  doc
    .fillColor('#000000')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(`${Number(costCfa).toLocaleString()} CFA`, margin + 4, boxY + 30, {
      width: boxW - 8,
      align: 'center',
    });

  const tlX = margin + boxW + 10;
  doc.rect(tlX, boxY, boxW, boxH).fill('#eafaf1').stroke('#4caf50');
  doc
    .fillColor('#1b5e20')
    .fontSize(8)
    .font('Helvetica-Bold')
    .text(labels.estimatedTimeline, tlX + 4, boxY + 10, { width: boxW - 8, align: 'center' });
  doc
    .fillColor('#000000')
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(timeline, tlX + 4, boxY + 30, { width: boxW - 8, align: 'center' });

  doc.fillColor('black');
  doc.y = boxY + boxH + 20;

  // Checkbox checklist
  doc.fontSize(13).font('Helvetica-Bold').text(labels.requiredDocuments);
  doc.moveDown(0.2);
  doc
    .moveTo(margin, doc.y)
    .lineTo(pageWidth - margin, doc.y)
    .strokeColor('#cccccc')
    .stroke();
  doc.moveDown(0.4);

  for (const item of documents) {
    doc.fontSize(11).font('Helvetica').text(`☐  ${item}`, { indent: 8 });
    doc.moveDown(0.15);
  }

  doc.moveDown(0.6);

  // Steps
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text(labels.steps);
  doc.moveDown(0.2);
  doc
    .moveTo(margin, doc.y)
    .lineTo(pageWidth - margin, doc.y)
    .strokeColor('#cccccc')
    .stroke();
  doc.moveDown(0.4);

  for (const step of steps) {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`${step.step_number}.  `, { continued: true })
      .font('Helvetica')
      .text(step.instruction);
    doc.moveDown(0.15);
  }

  // Footer
  doc.moveDown(1.5);
  doc
    .moveTo(margin, doc.y)
    .lineTo(pageWidth - margin, doc.y)
    .strokeColor('#cccccc')
    .stroke();
  doc.moveDown(0.4);
  const date = new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');
  doc
    .fontSize(9)
    .font('Helvetica-Oblique')
    .fillColor('#888888')
    .text(labels.footer(date), { align: 'center' });
}

async function generatePDF(res, body) {
  const { lang } = validateBody(body);
  const {
    name,
    official_cost_cfa,
    estimated_timeline,
    required_documents,
    steps,
    target_office,
  } = body;

  const chunks = [];
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  doc.on('data', (chunk) => chunks.push(chunk));

  await new Promise((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);

    renderPDF(doc, {
      lang,
      labels: LABELS[lang],
      name: name[lang],
      targetOffice: target_office[lang],
      costCfa: official_cost_cfa,
      timeline: estimated_timeline[lang],
      documents: required_documents[lang],
      steps: steps[lang],
    });

    doc.end();
  });

  const pdfBuffer = Buffer.concat(chunks);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=checklist.pdf`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body ?? {};

  // Simple lookup mode: frontend sends only { procedure_code, language }.
  // Detect this by the absence of full document fields (name, target_office, etc.).
  const hasDocumentFields = body.name || body.target_office || body.required_documents;
  if (body.procedure_code && !hasDocumentFields) {
    const lang = body.language === 'fr' ? 'fr' : 'en';
    try {
      const mongoose = (await import('mongoose')).default;
      const { Procedure } = await import('../lib/schema.js');

      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
      }

      const proc = await Procedure.findOne({ procedure_code: body.procedure_code }).lean();
      if (!proc) {
        return res.status(404).json({ error: `Procedure '${body.procedure_code}' not found.` });
      }

      body = { ...body, language: lang, ...proc };
    } catch {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }
  }

  const validation = validateBody(body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  return generatePDF(res, body);
}

export { renderPDF, validateBody, LABELS };
