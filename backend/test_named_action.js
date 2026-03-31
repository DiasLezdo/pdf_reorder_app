const { PDFDocument, PDFName, PDFString } = require('pdf-lib');
const fs = require('fs');

async function testNamedAction() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([600, 400]).drawText('Page 1');
  pdfDoc.addPage([600, 400]).drawText('Page 2');
  pdfDoc.addPage([600, 400]).drawText('Page 3');

  const context = pdfDoc.context;
  const outlineRootRef = context.nextRef();
  const prevPageItemRef = context.nextRef();

  const prevPageItem = context.obj({
    Title: PDFString.of('Previous Page'),
    Parent: outlineRootRef,
    // Named Action for PrevPage
    A: {
      S: PDFName.of('Named'),
      N: PDFName.of('PrevPage'),
    },
  });
  context.assign(prevPageItemRef, prevPageItem);

  const outlineRoot = context.obj({
    Type: PDFName.of('Outlines'),
    First: prevPageItemRef,
    Last: prevPageItemRef,
    Count: 1,
  });
  context.assign(outlineRootRef, outlineRoot);
  pdfDoc.catalog.set(PDFName.of('Outlines'), outlineRootRef);

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('test_named_action.pdf', pdfBytes);
  console.log('Test PDF created with named action bookmark.');
}

testNamedAction();
