// Vercel Serverless Function — PDF checklist generation (no filesystem writes)
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { procedure_code, language = 'en' } = req.body ?? {};

  if (!procedure_code) {
    return res.status(400).json({ error: '`procedure_code` is required.' });
  }

  const { default: mongoose } = await import('mongoose');
  const { Procedure } = await import('../shared/schema.js');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  const procedure = await Procedure.findOne({ procedure_code }).lean();

  if (!procedure) {
    return res
      .status(404)
      .json({ error: `Procedure '${procedure_code}' not found.` });
  }

  const content = procedure[language] ?? procedure.en;

  const chunks = [];
  const doc = new PDFDocument({ margin: 50 });

  doc.on('data', (chunk) => chunks.push(chunk));

  await new Promise((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);

    // Title
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(content.title, { align: 'center' });

    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(content.description, { align: 'left' });

    // Required documents
    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('Required Documents');
    doc.moveDown(0.3);
    content.required_documents.forEach((d) => {
      doc.fontSize(11).font('Helvetica').text(`  ☐  ${d}`);
    });

    // Steps
    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('Steps');
    doc.moveDown(0.3);
    content.steps.forEach((s) => {
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`  ${s.order}. ${s.description}`);
    });

    // Metadata
    doc.moveDown();
    doc.fontSize(11).font('Helvetica-Bold').text('Fees: ', { continued: true });
    doc.font('Helvetica').text(content.fees);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Estimated duration: ', { continued: true });
    doc.font('Helvetica').text(content.estimated_duration);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Issuing authority: ', { continued: true });
    doc.font('Helvetica').text(content.issuing_authority);

    if (content.notes) {
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Oblique').text(content.notes);
    }

    doc.end();
  });

  const pdfBuffer = Buffer.concat(chunks);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${procedure_code}-checklist.pdf"`
  );
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
}
