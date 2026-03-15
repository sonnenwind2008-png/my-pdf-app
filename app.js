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

        // Prüfen, ob wir gerade vom Microsoft-Login zurückkommen
        const response = await msalInstance.handleRedirectPromise();
        
        if (response) {
            // Erfolg nach dem Zurückleiten!
            handleSuccess(response);
        } else {
            // Prüfen, ob wir bereits eingeloggt sind
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                msalInstance.setActiveAccount(accounts[0]);
                // Wir simulieren eine Response für die UI
                document.getElementById('user-info').style.display = 'block';
                document.getElementById('user-name').innerText = accounts[0].name;
                document.getElementById('import-btn').disabled = false;
                document.getElementById('login-btn').style.display = 'none';
            }
        }
    } catch (err) {
        console.error("Init Fehler:", err);
    }
}

function handleSuccess(response) {
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('user-name').innerText = response.account.name;
    document.getElementById('import-btn').disabled = false;
    document.getElementById('login-btn').style.display = 'none';
    alert("Erfolgreich angemeldet!");
}

initMSAL();

document.getElementById('login-btn').onclick = async () => {
    // Statt Popup nutzen wir jetzt Redirect -> Sicherer gegen Blockierung!
    await msalInstance.loginRedirect({
        scopes: ["Files.ReadWrite.All", "User.Read"]
    });
};

// --- AB HIER BLEIBT ALLES GLEICH (IMPORT, TEXT, ETC.) ---
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
    if(!currentPdfBlob) return;
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
