// src/services/googleDriveService.ts

let accessToken: string | null = null;

export const waitForGoogle = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const check = () => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};

export const requestDriveAccessToken = async (clientId: string): Promise<string> => {
  await waitForGoogle(); // ✅ Wait for GIS to load

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response) => {
        if (response.error) {
          reject(response);
        } else {
          resolve(response.access_token);
        }
      },
    });

    client.requestAccessToken();
  });
};


export const uploadFileToDrive = async (file: File): Promise<string> => {
  if (!accessToken) throw new Error("No access token. Call requestDriveAccessToken first.");

  const metadata = {
    name: file.name,
    mimeType: file.type,
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
      body: form,
    }
  );

  const uploadData = await uploadRes.json();

  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return `https://drive.google.com/file/d/${uploadData.id}/view`;
};
