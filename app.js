let currentPdfBlob = null;
let currentFileName = "dokument.pdf";
let msalInstance = null;

const msalConfig = {
    auth: {
        clientId: "102d947d-3b17-4163-9208-4f153d099873", 
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin + window.location.pathname
    },
    cache: { cacheLocation: "sessionStorage" }
};

async function initMSAL() {
    try {
        msalInstance = new msal.PublicClientApplication(msalConfig);
        await msalInstance.initialize();
        const response = await msalInstance.handleRedirectPromise();
        if (response) { handleSuccess(response); }
        else {
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                msalInstance.setActiveAccount(accounts[0]);
                updateLoggedInUI(accounts[0].name);
            }
        }
    } catch (err) { console.error(err); }
}

function updateLoggedInUI(name) {
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('user-name').innerText = name;
    document.getElementById('import-btn').disabled = false;
    document.getElementById('login-btn').style.display = 'none';
}

function handleSuccess(response) {
    updateLoggedInUI(response.account.name);
    alert("Erfolgreich mit OneDrive verbunden!");
}

initMSAL();

document.getElementById('login-btn').onclick = async () => {
    await msalInstance.loginRedirect({ scopes: ["Files.ReadWrite.All", "User.Read"] });
};

// --- NEU: DATEIEN VON ONEDRIVE LADEN ---
document.getElementById('import-btn').onclick = async () => {
    const account = msalInstance.getActiveAccount();
    if (!account) return alert("Bitte erst einloggen!");

    try {
        // Token für Microsoft Graph holen
        const tokenResponse = await msalInstance.acquireTokenSilent({
            scopes: ["Files.ReadWrite.All"],
            account: account
        });

        const accessToken = tokenResponse.accessToken;

        // Microsoft Graph API aufrufen: Suche nach PDFs im gesamten OneDrive
        const response = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/search(q='.pdf')", {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const data = await response.json();
        const files = data.value;

        if (files && files.length > 0) {
            // Wir erstellen ein einfaches Auswahl-Menü
            let fileListHTML = "<h3>Wähle eine PDF:</h3>";
            files.forEach((file, index) => {
                fileListHTML += `<button onclick="downloadOneDriveFile('${file.id}', '${file.name}')" style="font-size:11px; text-align:left;">📄 ${file.name}</button>`;
            });
            
            // Wir zeigen die Liste kurzzeitig in der Sidebar an
            const sidebar = document.getElementById('sidebar');
            const originalContent = sidebar.innerHTML;
            sidebar.innerHTML = fileListHTML + '<button onclick="location.reload()">Zurück</button>';
            
            // Diese Funktion machen wir global verfügbar
            window.downloadOneDriveFile = async (fileId, fileName) => {
                const fileRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                currentPdfBlob = await fileRes.blob();
                currentFileName = fileName;
                location.reload(); // Seite neu laden, um UI zu resetten
                // Da wir die Seite neu laden, müssen wir den Blob kurz speichern
                const reader = new FileReader();
                reader.onload = () => {
                    localStorage.setItem('tempPdf', reader.result);
                    localStorage.setItem('tempName', fileName);
                    location.reload();
                };
                reader.readAsDataURL(currentPdfBlob);
            };
        } else {
            alert("Keine PDF-Dateien auf OneDrive gefunden.");
        }
    } catch (err) {
        console.error("Fehler beim Laden der Dateien:", err);
    }
};

// Beim Start prüfen, ob wir eine Datei aus dem Speicher laden müssen
window.onload = () => {
    const savedPdf = localStorage.getItem('tempPdf');
    const savedName = localStorage.getItem('tempName');
    if (savedPdf) {
        fetch(savedPdf).then(res => res.blob()).then(blob => {
            currentPdfBlob = blob;
            currentFileName = savedName;
            updateUI();
            localStorage.removeItem('tempPdf');
            localStorage.removeItem('tempName');
        });
    }
};

// --- PDF BEARBEITUNG (GLEICH BLEIBEND) ---
document.getElementById('add-text-btn').onclick = async () => {
    if(!currentPdfBlob) return;
    const arrayBuffer = await currentPdfBlob.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const page = pdfDoc.getPages()[0];
    page.drawText('Hinzugefügter Text von PWA', { x: 50, y: 700, size: 20 });
    const pdfBytes = await pdfDoc.save();
    currentPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    updateUI();
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

// Resizer Logik
const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
resizer.onmousedown = (e) => {
    document.onmousemove = (e) => {
        let newWidth = e.clientX;
        if (newWidth > 150 && newWidth < 500) sidebar.style.width = newWidth + 'px';
    };
    document.onmouseup = () => { document.onmousemove = null; };
};
