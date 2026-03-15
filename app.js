// --- DIAGNOSE-VERSION ---
let currentPdfBlob = null;
let currentFileName = "dokument.pdf";
let msalInstance = null;

const msalConfig = {
    auth: {
        clientId: "DEINE_AZURE_CLIENT_ID", 
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin + window.location.pathname
    }
};

// INITIALISIERUNG MIT FEEDBACK
async function initMSAL() {
    try {
        console.log("Starte MSAL Init...");
        msalInstance = new msal.PublicClientApplication(msalConfig);
        await msalInstance.initialize();
        console.log("MSAL Initialisiert!");
        // Kleiner visueller Check:
        document.getElementById('login-btn').innerText = "1. OneDrive Login (Bereit)";
    } catch (err) {
        alert("Fehler bei der Initialisierung: " + err.message);
    }
}

initMSAL();

document.getElementById('login-btn').onclick = async () => {
    alert("Login-Button wurde geklickt! Starte Popup..."); // TEST-NACHRICHT 1

    if (!msalInstance) {
        alert("MSAL wurde noch nicht geladen. Bitte kurz warten.");
        return;
    }

    try {
        const loginResponse = await msalInstance.loginPopup({
            scopes: ["Files.ReadWrite.All", "User.Read"],
            prompt: "select_account"
        });
        
        alert("Login erfolgreich! Hallo " + loginResponse.account.name); // TEST-NACHRICHT 2
        
        document.getElementById('user-info').style.display = 'block';
        document.getElementById('user-name').innerText = loginResponse.account.name;
        document.getElementById('import-btn').disabled = false;
        document.getElementById('login-btn').style.display = 'none';
        
    } catch (err) {
        console.error(err);
        alert("Microsoft Fehler-Meldung: " + err.name + "\nDetails: " + err.message);
    }
};

// --- REST DER FUNKTIONEN (IMPORT, TEXT, ETC.) ---
document.getElementById('import-btn').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/pdf';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        currentPdfBlob = file; currentFileName = file.name;
        updateUI();
    };
    input.click();
};

document.getElementById('add-text-btn').onclick = async () => {
    const arrayBuffer = await currentPdfBlob.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const page = pdfDoc.getPages()[0];
    page.drawText('Hinzugefügter Text von PWA', { x: 50, y: 700, size: 20 });
    const pdfBytes = await pdfDoc.save();
    currentPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    updateUI();
    alert("Text hinzugefügt!");
};

document.getElementById('apply-rename-btn').onclick = () => {
    const newName = document.getElementById('rename-input').value;
    if (newName) {
        currentFileName = newName.endsWith(".pdf") ? newName : newName + ".pdf";
        updateUI();
    }
};

function updateUI() {
    const url = URL.createObjectURL(currentPdfBlob);
    document.getElementById('pdf-viewer').src = url;
    document.getElementById('file-status').innerText = "Datei: " + currentFileName;
    document.getElementById('add-text-btn').disabled = false;
    document.getElementById('apply-rename-btn').disabled = false;
    document.getElementById('drag-zone').style.display = 'block';
}

document.getElementById('drag-zone').ondragstart = (e) => {
    const url = URL.createObjectURL(currentPdfBlob);
    e.dataTransfer.setData("DownloadURL", `application/pdf:${currentFileName}:${url}`);
};

const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
resizer.onmousedown = (e) => {
    document.onmousemove = (e) => {
        let newWidth = e.clientX;
        if (newWidth > 150 && newWidth < 500) sidebar.style.width = newWidth + 'px';
    };
    document.onmouseup = () => { document.onmousemove = null; };
};
