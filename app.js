let currentPdfBlob = null;
let currentFileName = "dokument.pdf";

// 1. MSAL KONFIGURATION (OneDrive)
const msalConfig = {
    auth: {
        clientId: "102d947d-3b17-4163-9208-4f153d099873", // HIER DEINE ID EINTRAGEN
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin + window.location.pathname
    }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

// LOGIN LOGIK
document.getElementById('login-btn').onclick = async () => {
    try {
        const loginResponse = await msalInstance.loginPopup({
            scopes: ["Files.ReadWrite.All", "User.Read"]
        });
        document.getElementById('user-info').style.display = 'block';
        document.getElementById('user-name').innerText = loginResponse.account.name;
        document.getElementById('import-btn').disabled = false;
        document.getElementById('login-btn').style.display = 'none';
    } catch (err) {
        console.error("Login Fehler:", err);
    }
};

// DATEI IMPORT (Vom lokalen OneDrive Sync-Ordner oder Explorer)
document.getElementById('import-btn').onclick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        currentPdfBlob = file;
        currentFileName = file.name;
        updateUI();
    };
    input.click();
};

// TEXT HINZUFÜGEN (PDF-LIB)
document.getElementById('add-text-btn').onclick = async () => {
    const arrayBuffer = await currentPdfBlob.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    firstPage.drawText('Hinzugefügter Text von PWA', {
        x: 50, y: firstPage.getHeight() - 50,
        size: 20, color: PDFLib.rgb(0, 0.47, 0.83)
    });

    const pdfBytes = await pdfDoc.save();
    currentPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    updateUI();
    alert("Text wurde zur ersten Seite hinzugefügt!");
};

// UMBENENNEN
document.getElementById('apply-rename-btn').onclick = () => {
    const newName = document.getElementById('rename-input').value;
    if (newName) {
        currentFileName = newName.endsWith(".pdf") ? newName : newName + ".pdf";
        updateUI();
    }
};

// UI AKTUALISIEREN
function updateUI() {
    const url = URL.createObjectURL(currentPdfBlob);
    document.getElementById('pdf-viewer').src = url;
    document.getElementById('file-status').innerText = "Datei: " + currentFileName;
    document.getElementById('add-text-btn').disabled = false;
    document.getElementById('apply-rename-btn').disabled = false;
    document.getElementById('drag-zone').style.display = 'block';
}

// DRAG & DROP EXPORT (Wichtig für Chrome auf Mac/Windows)
document.getElementById('drag-zone').ondragstart = (e) => {
    const file = new File([currentPdfBlob], currentFileName, { type: 'application/pdf' });
    const url = URL.createObjectURL(file);
    // Erlaubt das Rausziehen direkt in einen OneDrive-Ordner im Finder/Explorer
    e.dataTransfer.setData("DownloadURL", `application/pdf:${currentFileName}:${url}`);
};

// VARIABLE SIDEBAR LOGIK
const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');

resizer.onmousedown = (e) => {
    document.onmousemove = (e) => {
        let newWidth = e.clientX;
        if (newWidth > 150 && newWidth < 500) {
            sidebar.style.width = newWidth + 'px';
        }
    };
    document.onmouseup = () => { document.onmousemove = null; };
};
