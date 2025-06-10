// src/services/googleDriveService.ts

const loadGapiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof gapi !== "undefined") return resolve();

    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gapi.load("client:auth2", () => {
        resolve();
      });
    };
    script.onerror = reject;

    document.body.appendChild(script);
  });
};

export const initGapi = async (clientId: string) => {
  await loadGapiScript();

  if (!gapi.auth2 || !gapi.auth2.getAuthInstance()) {
    await gapi.client.init({
      clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
    });
  }
};

export const signInToGoogle = async () => {
  const auth = gapi.auth2.getAuthInstance();
  if (!auth.isSignedIn.get()) {
    await auth.signIn();
  }
};

export const uploadFileToDrive = async (file: File): Promise<string> => {
  const accessToken = gapi.auth.getToken().access_token;

  const metadata = {
    name: file.name,
    mimeType: file.type,
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);

  const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
    body: form,
  });

  const uploadData = await uploadRes.json();

  // Make the file public
  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
    method: "POST",
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });

  return `https://drive.google.com/file/d/${uploadData.id}/view`;
};
