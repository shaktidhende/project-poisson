import PDFDocument from 'pdfkit';

export function streamInvoicePdf(res, invoice) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.id}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text('DentalEMR Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice #: ${invoice.id}`);
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleString()}`);
  doc.moveDown();
  doc.text(`Patient: ${invoice.patient_name}`);
  doc.text(`Phone: ${invoice.phone || '-'}`);
  doc.text(`DOB: ${invoice.dob || '-'}`);
  doc.moveDown();
  doc.text(`Description: ${invoice.description || '-'}`);
  doc.text(`Amount: ₹${Number(invoice.amount).toFixed(2)}`);
  doc.text(`Status: ${invoice.status}`);
  doc.moveDown();
  doc.text('Thank you for choosing DentalEMR.', { align: 'center' });

  doc.end();
}
