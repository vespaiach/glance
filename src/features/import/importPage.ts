import { copy } from "@/copy";
import type { Tag } from "@/domain/schemas";

export type ImportWho = "everyone" | (string & {});

export type ImportRange = { from: string; to: string };

export type ImportRow = {
  id: string;
  date: string;
  title: string;
  time?: string;
  weekly?: boolean;
  duplicate: boolean;
};

export type ImportReview = {
  fileName: string;
  size: number;
  range: ImportRange;
  rows: readonly ImportRow[];
  newCount: number;
  duplicates: number;
  matched: number;
};

export type ImportDone = {
  count: number;
  who: ImportWho;
  range: ImportRange;
  duplicates: number;
  matched: number;
};

export type FileError = "type" | "empty";

export type ImportError = FileError | "offline";

type Reviewing = { review: ImportReview; who: ImportWho };

export type ImportPageState =
  | { step: "source" }
  | { step: "phone" }
  | ({ step: "review" } & Reviewing)
  | ({ step: "importing" } & Reviewing)
  | { step: "done"; done: ImportDone }
  | { step: "error"; error: FileError }
  | ({ step: "error"; error: "offline" } & Reviewing)
  | { step: "closed" };

export type OpenImportPage = Exclude<ImportPageState, { step: "closed" }>;

export type ImportPageAction =
  | { type: "phone" }
  | { type: "source" }
  | { type: "reviewed"; review: ImportReview }
  | { type: "failed"; error: FileError }
  | { type: "who"; who: ImportWho }
  | { type: "importing" }
  | { type: "imported"; count: number; range: ImportRange; matched: number }
  | { type: "offline" }
  | { type: "retry" }
  | { type: "back" };

const SOURCE: ImportPageState = { step: "source" };

export function initialImportPage(): ImportPageState {
  return SOURCE;
}

export function whoName(who: ImportWho, tags: readonly Pick<Tag, "id" | "name">[]): string {
  return tags.find((tag) => tag.id === who)?.name ?? copy.import.everyone;
}

export function importPageReducer(
  state: ImportPageState,
  action: ImportPageAction,
): ImportPageState {
  if (state.step === "closed") return state;

  if (state.step === "importing") return importingReducer(state, action);

  switch (action.type) {
    case "phone":
      return { step: "phone" };
    case "source":
      return SOURCE;
    case "reviewed":
      return { step: "review", review: action.review, who: "everyone" };
    case "failed":
      return { step: "error", error: action.error };
    case "who":
      return state.step === "review" ? { ...state, who: action.who } : state;
    case "importing":
      return state.step === "review" ? { ...state, step: "importing" } : state;
    case "retry":
      return retry(state);
    case "back":
      return back(state);
    default:
      return state;
  }
}

function importingReducer(
  state: Extract<ImportPageState, { step: "importing" }>,
  action: ImportPageAction,
): ImportPageState {
  const { review, who } = state;

  if (action.type === "offline") return { step: "error", error: "offline", review, who };

  if (action.type !== "imported") return state;

  return {
    step: "done",
    done: {
      count: action.count,
      who,
      range: action.range,
      duplicates: review.duplicates,
      matched: action.matched,
    },
  };
}

function retry(state: OpenImportPage): ImportPageState {
  if (state.step !== "error" || state.error !== "offline") return state;

  return { step: "review", review: state.review, who: state.who };
}

function back(state: OpenImportPage): ImportPageState {
  return state.step === "source" || state.step === "done" ? { step: "closed" } : SOURCE;
}
