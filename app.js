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
        addedTexts = [];
        currentFileName = file.name;
        document.getElementById('rename-input').value = currentFileName;
        await renderPdf();
    }
};

// --- 2. RENDERN (Original + alle Texte aus der Liste) ---
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
                x: parseInt(item.x),
                y: parseInt(item.y),
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

// --- 3. TEXT HINZUFÜGEN (Initialer Klick) ---
document.getElementById('add-text-btn').onclick = async () => {
    addedTexts.push({
        id: Date.now(),
        text: document.getElementById('marker-text').value,
        color: document.getElementById('marker-color').value,
        x: document.getElementById('pos-x').value,
        y: document.getElementById('pos-y').value
    });
    await renderPdf();
};

// --- 4. LISTE MIT LIVE-KORREKTUR ---
function updateElementsList() {
    const container = document.getElementById('elements-container');
    container.innerHTML = "";

    addedTexts.forEach((item, index) => {
        const div = document.createElement('div');
        div.style = "background:#eee; margin-bottom:8px; padding:8px; border-radius:5px; border:1px solid #ccc;";
        div.innerHTML = `
            <input type="text" value="${item.text}" onchange="updateItem(${item.id}, 'text', this.value)" style="width:100%; margin-bottom:5px; font-size:10px;">
            <div style="display:flex; gap:5px; align-items:center; font-size:10px;">
                X: <input type="number" value="${item.x}" oninput="updateItem(${item.id}, 'x', this.value)" style="width:45px;">
                Y: <input type="number" value="${item.y}" oninput="updateItem(${item.id}, 'y', this.value)" style="width:45px;">
                <button onclick="removeText(${item.id})" style="background:red; padding:2px 5px; margin:0; width:auto; font-size:9px;">Löschen</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Funktion zum Korrigieren der Werte
window.updateItem = async (id, field, value) => {
    const item = addedTexts.find(t => t.id === id);
    if (item) {
        item[field] = value;
        await renderPdf(); // Sofort neu rendern bei Änderung
    }
};

window.removeText = async (id) => {
    addedTexts = addedTexts.filter(t => t.id !== id);
    await renderPdf();
};

// --- 5. SEITEN EXTRAHIEREN ---
document.getElementById('extract-pages-btn').onclick = async () => {
    const input = document.getElementById('page-selection').value;
    const srcDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
    const newDoc = await PDFLib.PDFDocument.create();
    const indices = [];
    input.split(',').forEach(p => {
        if (p.includes('-')) {
            const [s, e] = p.split('-').map(Number);
            for (let i = s; i <= e; i++) if (i > 0 && i <= srcDoc.getPageCount()) indices.push(i - 1);
        } else {
            const n = Number(p);
            if (n > 0 && n <= srcDoc.getPageCount()) indices.push(n - 1);
        }
    });
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach(p => newDoc.addPage(p));
    originalPdfBytes = await newDoc.save();
    addedTexts = [];
    await renderPdf();
};

// --- UI LOGIK ---
function updateUI(pageCount) {
    const url = URL.createObjectURL(currentPdfBlob);
    document.getElementById('pdf-viewer').src = url;
    document.getElementById('page-count-info').innerText = `Seiten: ${pageCount}`;
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
        if (w > 200 && w < 600) sidebar.style.width = w + 'px';
    };
    document.onmouseup = () => document.onmousemove = null;
};
