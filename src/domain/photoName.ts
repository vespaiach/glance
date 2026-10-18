import { photoTitle } from "./photoUpload";
import type { Photo } from "./schemas";

export type PhotoFacts = {
  fileName: string;
  fileDate: string;
  metadata: { title?: string; takenOn?: string };
  place?: { city: string; label: string };
};

export type PhotoDetails = Pick<Photo, "title" | "takenOn" | "place" | "sources" | "checked">;

const CAMERA_PREFIX =
  /^(img|dsc[nf]?|dcim|pxl|mvimg|gopr|dji|photo|image|screenshot|whatsapp image|signal|p)(?=[\s_-]*\d)/i;

const SEPARATORS = /[\s_.()[\]-]+/;

const FILLER_WORDS = new Set(["at", "am", "pm", "copy", "edited", "final"]);

const REAL_WORD = /\p{L}{3,}/u;

const FILE_DATE = /(?<!\d)((?:19|20)\d{2})([-_.]?)(\d{2})\2(\d{2})(?!\d)/;

const PLACEHOLDER_TITLE = /camera|^default$|^image$/i;

export function nameFromFile(fileName: string): string | undefined {
  const words = photoTitle(fileName).replace(CAMERA_PREFIX, "").split(SEPARATORS);

  const name = words.filter(isNameWord).join(" ");

  return REAL_WORD.test(name) ? capitalized(name) : undefined;
}

export function dateFromFile(fileName: string): string | undefined {
  const [, year = "", , month = "", day = ""] = FILE_DATE.exec(fileName) ?? [];

  if (!isCalendarDate(Number(year), Number(month), Number(day))) return undefined;

  return `${year}-${month}-${day}`;
}

export function photoDetails(facts: PhotoFacts): PhotoDetails {
  const title = titleOf(facts);

  const takenOn = takenOnOf(facts);

  return {
    title: title.title,
    takenOn: takenOn.takenOn,
    ...(facts.place && { place: facts.place.label }),
    sources: {
      title: title.source,
      takenOn: takenOn.source,
      place: facts.place ? "photo-location" : "none",
    },
    checked: false,
  };
}

function isNameWord(word: string): boolean {
  return word !== "" && !/\d/.test(word) && !FILLER_WORDS.has(word.toLowerCase());
}

function capitalized(name: string): string {
  return name === name.toLowerCase() ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

function isCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function metadataTitle(title: string | undefined): string | undefined {
  const trimmed = title?.trim();

  return trimmed && !PLACEHOLDER_TITLE.test(trimmed) ? trimmed : undefined;
}

function titleOf({ fileName, metadata, place }: PhotoFacts): Pick<PhotoDetails, "title"> & {
  source: PhotoDetails["sources"]["title"];
} {
  const fromPhoto = metadataTitle(metadata.title);

  if (fromPhoto) return { title: fromPhoto, source: "photo" };

  const fromName = nameFromFile(fileName);

  if (fromName) return { title: fromName, source: "file-name" };

  if (place) return { title: place.city, source: "place" };

  return { title: photoTitle(fileName), source: "file" };
}

function takenOnOf({ fileName, fileDate, metadata }: PhotoFacts): {
  takenOn: string;
  source: PhotoDetails["sources"]["takenOn"];
} {
  if (metadata.takenOn) return { takenOn: metadata.takenOn, source: "photo" };

  const fromName = dateFromFile(fileName);

  if (fromName) return { takenOn: fromName, source: "file-name" };

  return { takenOn: fileDate, source: "file-date" };
}
