let currentPdfBlob = null;
let currentFileName = "dokument.pdf";
let msalInstance = null;
let accessToken = null;

const msalConfig = {
    auth: {
        clientId: "102d947d-3b17-4163-9208-4f153d099873" 
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
}

initMSAL();

document.getElementById('login-btn').onclick = async () => {
    await msalInstance.loginRedirect({ scopes: ["Files.ReadWrite.All", "User.Read"] });
};

// PDF SUCHE AUF ONEDRIVE
document.getElementById('import-btn').onclick = async () => {
    const account = msalInstance.getActiveAccount();
    if (!account) return;

    try {
        const tokenResponse = await msalInstance.acquireTokenSilent({
            scopes: ["Files.ReadWrite.All"],
            account: account
        });
        accessToken = tokenResponse.accessToken;

        const response = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/search(q='.pdf')", {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const data = await response.json();
        const files = data.value;

        if (files && files.length > 0) {
            const listElement = document.getElementById('file-list');
            listElement.innerHTML = "";
            document.getElementById('file-list-container').style.display = 'block';

            files.forEach(file => {
                const btn = document.createElement('button');
                btn.style.fontSize = "10px";
                btn.style.textAlign = "left";
                btn.style.background = "#fff";
                btn.style.color = "#333";
                btn.innerText = "📄 " + file.name;
                btn.onclick = () => downloadFile(file);
                listElement.appendChild(btn);
            });
        } else {
            alert("Keine PDFs gefunden.");
        }
    } catch (err) { console.error(err); }
};

// DATEI HERUNTERLADEN (KORRIGIERTER PFAD)
async function downloadFile(file) {
    try {
        // Wir nutzen die Drive-ID und Item-ID für maximale Kompatibilität
        const driveId = file.parentReference.driveId;
        const fileId = file.id;

        const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/content`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) throw new Error("Download fehlgeschlagen");

        currentPdfBlob = await response.blob();
        currentFileName = file.name;
        
        document.getElementById('file-list-container').style.display = 'none';
        updateUI();
    } catch (err) {
        alert("Fehler beim Laden: " + err.message);
    }
}

// PDF BEARBEITUNG & UI
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
    document.getElementById('file-status').innerText = "Datei geladen: " + currentFileName;
    document.getElementById('add-text-btn').disabled = false;
    document.getElementById('apply-rename-btn').disabled = false;
    document.getElementById('drag-zone').style.display = 'block';
}

// DRAG EXPORT
document.getElementById('drag-zone').ondragstart = (e) => {
    const url = URL.createObjectURL(currentPdfBlob);
    e.dataTransfer.setData("DownloadURL", `application/pdf:${currentFileName}:${url}`);
};

// RESIZER
const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
resizer.onmousedown = (e) => {
    document.onmousemove = (e) => {
        let newWidth = e.clientX;
        if (newWidth > 150 && newWidth < 500) sidebar.style.width = newWidth + 'px';
    };
    document.onmouseup = () => { document.onmousemove = null; };
};
