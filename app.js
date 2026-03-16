let originalPdfBytes = null;
let addedTexts = [];
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
        const arrayBuffer = await file.arrayBuffer();
        originalPdfBytes = new Uint8Array(arrayBuffer);
        addedTexts = []; // Liste leeren bei neuem Import
        currentFileName = file.name;
        document.getElementById('rename-input').value = currentFileName;
        await renderPdf();
    }
};

// --- 2. RENDERN (Original + Texte) ---
async function renderPdf() {
    if (!originalPdfBytes) return;

    try {
        const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

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
    } catch (err) {
        console.error("Render Fehler:", err);
    }
}

// --- 3. TEXT HINZUFÜGEN ---
document.getElementById('add-text-btn').onclick = async () => {
    const textVal = document.getElementById('marker-text').value;
    const colorVal = document.getElementById('marker-color').value;
    const xVal = parseInt(document.getElementById('pos-x').value);
    const yVal = parseInt(document.getElementById('pos-y').value);

    addedTexts.push({
        id: Date.now(),
        text: textVal,
        color: colorVal,
        x: xVal,
        y: yVal
    });

    await renderPdf();
};

// --- 4. SEITEN EXTRAHIEREN ---
document.getElementById('extract-pages-btn').onclick = async () => {
    const input = document.getElementById('page-selection').value;
    if (!input) return alert("Bitte Seiten angeben!");

    const srcDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
    const newDoc = await PDFLib.PDFDocument.create();
    const total = srcDoc.getPageCount();
    
    // Parser für 1, 3, 5-8
    const indices = [];
    input.split(',').forEach(p => {
        if (p.includes('-')) {
            const [s, e] = p.split('-').map(Number);
            for (let i = s; i <= e; i++) if (i > 0 && i <= total) indices.push(i - 1);
        } else {
            const n = Number(p);
            if (n > 0 && n <= total) indices.push(n - 1);
        }
    });

    if (indices.length === 0) return alert("Keine gültigen Seiten gewählt.");

    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach(p => newDoc.addPage(p));

    originalPdfBytes = await newDoc.save();
    addedTexts = []; // Reset Texte bei neuem Seiten-Layout
    await renderPdf();
};

// --- 5. LÖSCH-FUNKTION ---
function updateElementsList() {
    const container = document.getElementById('elements-container');
    container.innerHTML = "";
    addedTexts.forEach(item => {
        const div = document.createElement('div');
        div.className = "element-item";
        div.style = "display:flex; justify-content:space-between; background:#fff; margin:2px; padding:4px; font-size:10px; border:1px solid #ddd; align-items:center;";
        div.innerHTML = `
            <span>${item.text.substring(0,8)}..</span>
            <button onclick="removeText(${item.id})" style="width:auto; padding:2px 5px; background:red; margin:0; font-size:9px;">X</button>
        `;
        container.appendChild(div);
    });
}

window.removeText = async (id) => {
    addedTexts = addedTexts.filter(t => t.id !== id);
    await renderPdf();
};

// --- UI AKTUALISIERUNG ---
function updateUI(pageCount) {
    const url = URL.createObjectURL(currentPdfBlob);
    document.getElementById('pdf-viewer').src = url;
    document.getElementById('page-count-info').innerText = `Seiten im PDF: ${pageCount}`;
    
    // BUTTONS AKTIVIEREN
    document.getElementById('add-text-btn').disabled = false;
    document.getElementById('extract-pages-btn').disabled = false;
    document.getElementById('share-btn').disabled = false;
    document.getElementById('drag-zone').style.display = 'block';
}

// UMBENENNEN & EXPORT
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

// RESIZER
const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
resizer.onmousedown = (e) => {
    document.onmousemove = (e) => {
        let w = e.clientX;
        if (w > 200 && w < 600) sidebar.style.width = w + 'px';
    };
    document.onmouseup = () => document.onmousemove = null;
};
