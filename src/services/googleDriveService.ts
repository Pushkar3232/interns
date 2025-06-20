// src/services/googleDriveService.ts

let accessToken: string | null = null;

export const waitForGoogle = async (): Promise<void> => {
  return new Promise((resolve) => {
    const check = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};

export const requestDriveAccessToken = async (clientId: string): Promise<string> => {
  await waitForGoogle();

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file", // ✅ Use full Drive access
      callback: (response) => {
        if (response.error) {
          console.error("❌ Failed to get access token", response);
          reject(response);
        } else {
          accessToken = response.access_token;
          console.log("🔐 Got access token:", accessToken);
          resolve(accessToken);
        }
      },
    });

    tokenClient.requestAccessToken();
  });
};

export const uploadFileToDrive = async (file: File, accessToken: string): Promise<string> => {
  console.log("📤 Uploading file to Drive...");

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
      headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
      body: form,
    }
  );

  const uploadData = await uploadRes.json();
  console.log("📎 Drive upload response:", uploadData);

  if (!uploadData.id) {
    throw new Error("❌ Upload failed: No file ID");
  }

  // Make file public
  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  const fileLink = `https://drive.google.com/file/d/${uploadData.id}/view`;
  console.log("🔗 File link:", fileLink);
  return fileLink;
};
