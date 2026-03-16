let currentPdfBlob = null;
let currentFileName = "";

// --- 1. IMPORT ÜBER DRAG & DROP ---
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
        updateUI();
    } else {
        alert("Bitte ziehen Sie eine gültige PDF-Datei hinein.");
    }
};

// --- 2. TEXTMARKER LOGIK ---
document.getElementById('add-text-btn').onclick = async () => {
    if (!currentPdfBlob) return;
    
    try {
        const arrayBuffer = await currentPdfBlob.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        const text = document.getElementById('marker-text').value;
        const colorHex = document.getElementById('marker-color').value;
        const x = parseInt(document.getElementById('pos-x').value);
        const y = parseInt(document.getElementById('pos-y').value);

        // HEX Farbe zu RGB (0-1) umrechnen
        const r = parseInt(colorHex.slice(1, 3), 16) / 255;
        const g = parseInt(colorHex.slice(3, 5), 16) / 255;
        const b = parseInt(colorHex.slice(5, 7), 16) / 255;

        firstPage.drawText(text, {
            x: x,
            y: y,
            size: 18,
            color: PDFLib.rgb(r, g, b),
        });

        const pdfBytes = await pdfDoc.save();
        currentPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        updateUI();
    } catch (err) {
        alert("Fehler beim Bearbeiten der PDF: " + err.message);
    }
};

// --- 3. UMBENENNEN ---
document.getElementById('rename-input').oninput = (e) => {
    let name = e.target.value;
    if (name.length > 0) {
        currentFileName = name.endsWith(".pdf") ? name : name + ".pdf";
        document.getElementById('file-status').innerText = "Vorschau: " + currentFileName;
    }
};

// --- 4. SHARING ---
document.getElementById('share-btn').onclick = async () => {
    if (!currentPdfBlob) return;
    const file = new File([currentPdfBlob], currentFileName, { type: 'application/pdf' });
    
    if (navigator.share) {
        try {
            await navigator.share({
                files: [file],
                title: currentFileName,
            });
        } catch (err) { console.log("Sharing abgebrochen"); }
    } else {
        alert("Browser unterstützt Teilen nicht. Nutzen Sie 'Rausziehen'.");
    }
};

// --- UI AKTUALISIEREN ---
function updateUI() {
    const url = URL.createObjectURL(currentPdfBlob);
    document.getElementById('pdf-viewer').src = url;
    document.getElementById('file-status').innerText = "Geladen: " + currentFileName;
    document.getElementById('add-text-btn').disabled = false;
    document.getElementById('share-btn').disabled = false;
    document.getElementById('drag-zone').style.display = 'block';
}

// --- 5. EXPORT ÜBER DRAG & DROP ---
document.getElementById('drag-zone').ondragstart = (e) => {
    const fileURL = URL.createObjectURL(currentPdfBlob);
    // Trick für Chrome/Edge: Ermöglicht das Ziehen direkt in den Finder/Desktop
    e.dataTransfer.setData("DownloadURL", `application/pdf:${currentFileName}:${fileURL}`);
};

// --- RESIZER ---
const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
resizer.onmousedown = (e) => {
    document.onmousemove = (e) => {
        let newWidth = e.clientX;
        if (newWidth > 220 && newWidth < 600) sidebar.style.width = newWidth + 'px';
    };
    document.onmouseup = () => { document.onmousemove = null; };
};
