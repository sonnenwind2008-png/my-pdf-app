let currentPdfBlob = null;
let currentFileName = "";

// --- 1. IMPORT ---
const importZone = document.getElementById('import-zone');
importZone.ondragover = (e) => { e.preventDefault(); importZone.style.borderColor = "#28a745"; };
importZone.ondragleave = () => { importZone.style.borderColor = "#0078d4"; };
importZone.ondrop = async (e) => {
    e.preventDefault();
    importZone.style.borderColor = "#0078d4";
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
        currentPdfBlob = file;
        currentFileName = file.name;
        document.getElementById('rename-input').value = currentFileName;
        await updateUI();
    }
};

// --- 2. SEITEN EXTRAHIEREN / NEU ZUSAMMENSTELLEN ---
document.getElementById('extract-pages-btn').onclick = async () => {
    if (!currentPdfBlob) return;
    const input = document.getElementById('page-selection').value;
    if (!input) return alert("Bitte Seitenzahlen eingeben (z.B. 1, 3-5)");

    try {
        const arrayBuffer = await currentPdfBlob.arrayBuffer();
        const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const newDoc = await PDFLib.PDFDocument.create();
        
        const totalPages = srcDoc.getPageCount();
        const indices = parsePageSelection(input, totalPages);

        if (indices.length === 0) throw new Error("Keine gültigen Seitenzahlen erkannt.");

        // Seiten kopieren
        const copiedPages = await newDoc.copyPages(srcDoc, indices);
        copiedPages.forEach(page => newDoc.addPage(page));

        const pdfBytes = await newDoc.save();
        currentPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        await updateUI();
        alert("PDF wurde neu zusammengestellt!");
    } catch (err) {
        alert("Fehler: " + err.message);
    }
};

// Hilfsfunktion zum Parsen von "1, 3, 5-8"
function parsePageSelection(input, maxPages) {
    const pages = new Set();
    const parts = input.split(',');
    
    parts.forEach(part => {
        part = part.trim();
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            for (let i = start; i <= end; i++) {
                if (i > 0 && i <= maxPages) pages.add(i - 1);
            }
        } else {
            const num = Number(part);
            if (num > 0 && num <= maxPages) pages.add(num - 1);
        }
    });
    return Array.from(pages).sort((a, b) => a - b);
}

// --- 3. TEXT HINZUFÜGEN ---
document.getElementById('add-text-btn').onclick = async () => {
    if (!currentPdfBlob) return;
    const arrayBuffer = await currentPdfBlob.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const firstPage = pdfDoc.getPages()[0];

    const text = document.getElementById('marker-text').value;
    const colorHex = document.getElementById('marker-color').value;
    const x = parseInt(document.getElementById('pos-x').value);
    const y = parseInt(document.getElementById('pos-y').value);

    const r = parseInt(colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(colorHex.slice(5, 7), 16) / 255;

    firstPage.drawText(text, { x, y, size: 18, color: PDFLib.rgb(r, g, b) });

    const pdfBytes = await pdfDoc.save();
    currentPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    updateUI();
};

// --- 4. UMBENENNEN ---
document.getElementById('rename-input').oninput = (e) => {
    let name = e.target.value;
    if (name.length > 0) {
        currentFileName = name.endsWith(".pdf") ? name : name + ".pdf";
        document.getElementById('file-status').innerText = "Export-Name: " + currentFileName;
    }
};

// --- 5. UI & SHARING ---
async function updateUI() {
    const url = URL.createObjectURL(currentPdfBlob);
    document.getElementById('pdf-viewer').src = url;
    
    // Seitenzahl ermitteln
    const arrayBuffer = await currentPdfBlob.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const count = pdfDoc.getPageCount();
    
    document.getElementById('page-count-info').innerText = `Dieses PDF hat ${count} Seiten.`;
    document.getElementById('file-status').innerText = "Geladen: " + currentFileName;
    
    document.getElementById('extract-pages-btn').disabled = false;
    document.getElementById('add-text-btn').disabled = false;
    document.getElementById('share-btn').disabled = false;
    document.getElementById('drag-zone').style.display = 'block';
}

document.getElementById('share-btn').onclick = async () => {
    if (!currentPdfBlob) return;
    const file = new File([currentPdfBlob], currentFileName, { type: 'application/pdf' });
    if (navigator.share) await navigator.share({ files: [file], title: currentFileName });
};

document.getElementById('drag-zone').ondragstart = (e) => {
    const fileURL = URL.createObjectURL(currentPdfBlob);
    e.dataTransfer.setData("DownloadURL", `application/pdf:${currentFileName}:${fileURL}`);
};

const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
resizer.onmousedown = (e) => {
    document.onmousemove = (e) => {
        let newWidth = e.clientX;
        if (newWidth > 240 && newWidth < 600) sidebar.style.width = newWidth + 'px';
    };
    document.onmouseup = () => { document.onmousemove = null; };
};
