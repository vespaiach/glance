export const FILE_NAME_HEADER = "x-file-name";

export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

export type UploadProblem = "too-large" | "not-a-photo";

export function uploadProblem(file: { type: string; size: number }): UploadProblem | undefined {
  if (!file.type.startsWith("image/")) return "not-a-photo";

  return file.size > MAX_PHOTO_BYTES ? "too-large" : undefined;
}

export function photoTitle(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}
