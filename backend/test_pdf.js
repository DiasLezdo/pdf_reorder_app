const Document = require('./models/Document');
const pdfService = require('./services/pdfService');
require('dotenv').config();
require('mongoose').connect(process.env.MONGODB_URI).then(async () => {
    try {
        const doc = await Document.findOne().sort({createdAt: -1});
        if(!doc || doc.files.length === 0) { console.log("no files"); process.exit(0); }
        
        console.log("Fetching URL:", doc.files[0].cloudinaryUrl);
        const count = await pdfService.getPageCount(doc.files[0].cloudinaryUrl);
        console.log("Page count is:", count);
    } catch(e) { console.error("TEST SCRIPT ERROR:", e); }
    process.exit(0);
});
