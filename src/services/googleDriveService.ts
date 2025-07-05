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
      scope: "https://www.googleapis.com/auth/drive.file",
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

    // Timeout fallback if callback doesn't fire
    setTimeout(() => {
      if (!accessToken) {
        reject(new Error("Timeout: Failed to get Google access token."));
      }
    }, 10000);
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

  try {
    const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!uploadRes.ok) {
      throw new Error("Drive upload failed with status: " + uploadRes.status);
    }

    const data = await uploadRes.json();
    console.log("✅ Uploaded:", data);

    return `https://drive.google.com/file/d/${data.id}/view`;
  } catch (error) {
    console.error("❌ Upload error:", error);
    throw error;
  }
};
