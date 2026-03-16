let originalPdfBytes = null; // Das saubere Original
let addedTexts = [];         // Liste der Texte: { text, x, y, color }
let currentPdfBlob = null;
let currentFileName = "";

// --- 1. IMPORT ---
const importZone = document.getElementById('import-zone');
importZone.ondrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        originalPdfBytes = new Uint8Array(arrayBuffer); // Original sichern
        addedTexts = []; // Liste leeren bei neuem Dokument
        currentFileName = file.name;
        document.getElementById('rename-input').value = currentFileName;
        await renderPdf();
    }
};
importZone.ondragover = (e) => e.preventDefault();

// --- 2. TEXT HINZUFÜGEN ---
document.getElementById('add-text-btn').onclick = async () => {
    if (!originalPdfBytes) return;

    const newText = {
        id: Date.now(),
        text: document.getElementById('marker-text').value,
        color: document.getElementById('marker-color').value,
        x: parseInt(document.getElementById('pos-x').value),
        y: parseInt(document.getElementById('pos-y').value)
    };

    addedTexts.push(newText);
    await renderPdf();
};

// --- 3. PDF RENDERN (ORIGINAL + ALLE TEXTE) ---
async function renderPdf() {
    if (!originalPdfBytes) return;

    const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Alle Texte aus der Liste einzeichnen
    for (const item of addedTexts) {
        const r = parseInt(item.color.slice(1, 3), 16) / 255;
        const g = parseInt(item.color.slice(3, 5), 16) / 255;
        const b = parseInt(item.color.slice(5, 7), 16) / 255;

        firstPage.drawText(item.text, {
            x: item.x,
            y: item.y,
            size: 18,
            color: PDFLib.rgb(r, g, b)
        });
    }

    const pdfBytes = await pdfDoc.save();
    currentPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    updateUI(pdfDoc.getPageCount());
    updateElementsList();
}

// --- 4. LISTE DER ELEMENTE AKTUALISIEREN ---
function updateElementsList() {
    const container = document.getElementById('elements-container');
    container.innerHTML = "";

    addedTexts.forEach((item) => {
        const div = document.createElement('div');
        div.className = "element-item";
        div.innerHTML = `
            <span style="color:${item.color}">●</span> 
            <span>${item.text.substring(0, 10)}... (X:${item.x})</span>
            <button class="btn-delete" onclick="deleteElement(${item.id})">Löschen</button>
        `;
        container.appendChild(div);
    });
}

// Global machen für den Button-Klick
window.deleteElement = async (id) => {
    addedTexts = addedTexts.filter(t => t.id !== id);
    await renderPdf();
};

// --- 5. SEITEN EXTRAHIEREN ---
document.getElementById('extract-pages-btn').onclick = async () => {
    const input = document.getElementById('page-selection').value;
    const srcDoc = await PDFLib.PDFDocument.load(await currentPdfBlob.arrayBuffer());
    const newDoc = await PDFLib.PDFDocument.create();
    const indices = parsePageSelection(input, srcDoc.getPageCount());

    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach(p => newDoc.addPage(p));

    const bytes = await newDoc.save();
    originalPdfBytes = bytes; // Das neue, gekürzte PDF wird zum neuen Original
    addedTexts = []; // Texte müssen bei Strukturänderung gelöscht/neu gesetzt werden
    await renderPdf();
};

function parsePageSelection(input, max) {
    const pages = new Set();
    input.split(',').forEach(p => {
        if (p.includes('-')) {
            const [s, e] = p.split('-').map(Number);
            for (let i = s; i <= e; i++) if (i > 0 && i <= max) pages.add(i - 1);
        } else {
            const n = Number(p);
            if (n > 0 && n <= max) pages.add(n - 1);
        }
    });
    return Array.from(pages).sort((a, b) => a - b);
}

// --- RESTLICHE UI-LOGIK ---
function updateUI(count) {
    const url = URL.createObjectURL(currentPdfBlob);
    document.getElementById('pdf-viewer').src = url;
    document.getElementById('page-count-info').innerText = `Seiten: ${count}`;
    document.getElementById('file-status').innerText = "Geladen: " + currentFileName;
    document.getElementById('add-text-btn').disabled = false;
    document.getElementById('extract-pages-btn').disabled = false;
    document.getElementById('share-btn').disabled = false;
    document.getElementById('drag-zone').style.display = 'block';
}

document.getElementById('rename-input').oninput = (e) => {
    currentFileName = e.target.value.endsWith(".pdf") ? e.target.value : e.target.value + ".pdf";
};

document.getElementById('share-btn').onclick = async () => {
    const file = new File([currentPdfBlob], currentFileName, { type: 'application/pdf' });
    if (navigator.share) navigator.share({ files: [file], title: currentFileName });
};

document.getElementById('drag-zone').ondragstart = (e) => {
    const url = URL.createObjectURL(currentPdfBlob);
    e.dataTransfer.setData("DownloadURL", `application/pdf:${currentFileName}:${url}`);
};

const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
resizer.onmousedown = (e) => {
    document.onmousemove = (e) => {
        let w = e.clientX;
        if (w > 220 && w < 600) sidebar.style.width = w + 'px';
    };
    document.onmouseup = () => document.onmousemove = null;
};
