/** Web preview: download the backup and read a picked file with the browser's own dialogs. */
export async function shareBackupFile(
  name: string,
  text: string,
  { mimeType = 'application/json' }: { mimeType?: string; title?: string; uti?: string } = {},
): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function pickBackupFile(): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? { name: file.name, text: await file.text() } : null);
    };
    input.click();
  });
}
