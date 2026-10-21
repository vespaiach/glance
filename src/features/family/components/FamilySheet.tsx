"use client";

import * as stylex from "@stylexjs/stylex";
import { Plus } from "lucide-react";
import { type FormEvent, useReducer } from "react";
import { copy } from "@/copy";
import { freeColors, memberNameError } from "@/domain/members";
import type { MemberColor } from "@/domain/schemas";
import { colors, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { ColorSwatchPicker } from "@/ui/ColorSwatchPicker";
import { DiscardButtons, DiscardMessage } from "@/ui/DiscardPrompt";
import { type CloseFrom, closeStep } from "@/ui/discard";
import { Sheet } from "@/ui/Sheet";
import { TextInput } from "@/ui/TextInput";
import {
  type FamilyRow,
  type FamilySheetState,
  familySheetReducer,
  isDirty,
  shownColor,
} from "../familySheet";
import { MemberRow } from "./MemberRow";

type FamilySheetProps = {
  rows: readonly FamilyRow[];
  initial: FamilySheetState;
  keyboardInset?: number;
  onAdd: (name: string, color: MemberColor) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

const words = copy.family;

const styles = stylex.create({
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
  },
  add: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  addTitle: {
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    letterSpacing: type.bodyLgLs,
  },
  addRow: {
    margin: 0,
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
  },
  field: {
    flex: 1,
    minWidth: 0,
  },
  addButton: {
    minHeight: 48,
  },
  colors: {
    rowGap: 12,
  },
});

export function FamilySheet({
  rows,
  initial,
  keyboardInset,
  onAdd,
  onRemove,
  onClose,
}: FamilySheetProps) {
  const [state, dispatch] = useReducer(familySheetReducer, initial);

  const members = rows.map((row) => row.member);

  const color = shownColor(state.color, members);

  const add = (event: FormEvent) => {
    event.preventDefault();

    const error = memberNameError(state.name, members);

    if (error) return dispatch({ type: "invalid", error });

    onAdd(state.name.trim(), color);
    dispatch({ type: "added" });
  };

  const remove = (id: string) => {
    onRemove(id);
    dispatch({ type: "removed" });
  };

  const requestClose = (from: CloseFrom) => () => {
    const step = closeStep(state.confirm === "discard", isDirty(state), from);

    if (step === "close") return onClose();

    if (step === "ask") dispatch({ type: "askDiscard" });
  };

  const asking = state.confirm === "discard";

  return (
    <Sheet
      title={words.title}
      eyebrow={words.eyebrow(rows.length)}
      closeLabel={words.close}
      onClose={requestClose("button")}
      onScrimTap={requestClose("scrim")}
      startActions={
        asking && (
          <DiscardMessage
            title={copy.discard.title}
            body={copy.discard.member(state.name.trim())}
          />
        )
      }
      endActions={
        asking ? (
          <DiscardButtons
            keepLabel={copy.discard.keepEditing}
            discardLabel={copy.discard.discard}
            onKeep={() => dispatch({ type: "keepEditing" })}
            onDiscard={onClose}
          />
        ) : (
          <Button onClick={requestClose("button")}>{words.done}</Button>
        )
      }
      keyboardInset={keyboardInset}
    >
      <ul aria-label={words.list} {...stylex.props(styles.list)}>
        {rows.map((row, index) => (
          <MemberRow
            key={row.member.id}
            row={row}
            first={index === 0}
            canRemove={rows.length > 1}
            confirming={state.removing === row.member.id}
            onAsk={() => dispatch({ type: "askRemove", id: row.member.id })}
            onKeep={() => dispatch({ type: "keepMember" })}
            onRemove={() => remove(row.member.id)}
          />
        ))}
      </ul>
      <div {...stylex.props(styles.add)}>
        <span {...stylex.props(styles.addTitle)}>{words.addTitle}</span>
        <form onSubmit={add} {...stylex.props(styles.addRow)}>
          <TextInput
            ariaLabel={words.name}
            placeholder={words.name}
            value={state.name}
            onChange={(value) => dispatch({ type: "name", value })}
            error={state.error ? errorText(state.error) : undefined}
            xstyle={styles.field}
          />
          <Button type="submit" icon={Plus} xstyle={styles.addButton}>
            {words.add}
          </Button>
        </form>
        <ColorSwatchPicker
          label={words.color}
          options={freeColors(members).map((value) => ({ value, label: words.colors[value] }))}
          value={color}
          onChange={(value) => dispatch({ type: "color", value })}
          xstyle={styles.colors}
        />
      </div>
    </Sheet>
  );
}

function errorText(error: NonNullable<FamilySheetState["error"]>): string {
  return error === "empty" ? words.addName : words.taken;
}
