// src/services/googleDriveService.ts

let accessToken: string | null = null;

/**
 * Waits until the Google Identity Services script is available.
 */
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

/**
 * Requests an access token from Google Identity Services for Drive API.
 * Must be called before uploading.
 */
export const requestDriveAccessToken = async (clientId: string): Promise<string> => {
  await waitForGoogle();

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response) => {
        if (response.error) {
          console.error("❌ Error getting access token:", response);
          reject(response);
        } else {
          accessToken = response.access_token;
          console.log("🔐 Access token received:", accessToken);
          resolve(accessToken);
        }
      },
    });

    tokenClient.requestAccessToken();
  });
};

/**
 * Uploads a file to the user's Google Drive and returns a public link.
 */
export const uploadFileToDrive = async (file: File, accessToken: string): Promise<string> => {
  console.log("📤 Starting upload to Google Drive...");

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
  console.log("📎 Uploaded file ID:", uploadData.id);

  if (!uploadData.id) {
    throw new Error("❌ Upload failed: no file ID returned.");
  }

  // Set file to be publicly viewable
  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  const viewUrl = `https://drive.google.com/file/d/${uploadData.id}/view`;
  console.log("🔗 Public file link:", viewUrl);

  return viewUrl;
};
