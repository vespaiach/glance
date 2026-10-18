"use client";

import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import { scheduleRows } from "./layout";

const STACKED_ROWS = 6;

const FALLBACK_ROW_HEIGHT = 76;

const ROWS_BOX = "[data-schedule-rows]";

export function useScheduleRows(cardRef: RefObject<HTMLElement | null>, stacked: boolean): number {
  const [rows, setRows] = useState(STACKED_ROWS);

  const rowHeight = useRef(0);

  useLayoutEffect(() => {
    const card = cardRef.current;

    if (stacked || card === null) return;

    setMeasured(setRows, measuredRows(card, rowHeight));
  });

  useLayoutEffect(() => {
    const card = cardRef.current;

    if (stacked || card === null) return;

    const observer = new ResizeObserver(() => {
      rowHeight.current = 0;

      setMeasured(setRows, measuredRows(card, rowHeight));
    });

    observer.observe(card);

    return () => observer.disconnect();
  }, [cardRef, stacked]);

  return stacked ? STACKED_ROWS : rows;
}

function setMeasured(setRows: (rows: number) => void, rows: number | undefined) {
  if (rows !== undefined) setRows(rows);
}

function measuredRows(card: HTMLElement, rowHeight: RefObject<number>): number | undefined {
  rowHeight.current = Math.max(rowHeight.current, averageRowHeight(card));

  const available = availableHeight(card);

  if (available === undefined) return undefined;

  return scheduleRows({ available, rowHeight: rowHeight.current || FALLBACK_ROW_HEIGHT });
}

function availableHeight(card: HTMLElement): number | undefined {
  const box = card.querySelector(ROWS_BOX);

  if (box === null || card.clientHeight === 0) return undefined;

  const style = getComputedStyle(card);

  const others = shownChildren(card).filter((child) => child !== box);

  const content = card.clientHeight - px(style.paddingTop) - px(style.paddingBottom);

  return content - px(style.rowGap) * others.length - others.reduce(addFixedHeight, 0);
}

function averageRowHeight(card: HTMLElement): number {
  const list = card.querySelector<HTMLElement>(`${ROWS_BOX} > :first-child`);

  if (!list?.childElementCount) return 0;

  return list.offsetHeight / list.childElementCount;
}

function shownChildren(card: HTMLElement): HTMLElement[] {
  return Array.from(card.children as HTMLCollectionOf<HTMLElement>).filter(
    (child) => child.offsetHeight > 0,
  );
}

function addFixedHeight(sum: number, child: HTMLElement): number {
  const style = getComputedStyle(child);

  return sum + (px(style.flexGrow) > 0 ? px(style.minHeight) : child.offsetHeight);
}

function px(value: string): number {
  return Number.parseFloat(value) || 0;
}
