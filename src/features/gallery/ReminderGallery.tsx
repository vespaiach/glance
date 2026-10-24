import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { copy } from "@/copy";
import { ReminderStrip } from "@/ui/ReminderStrip";
import { GalleryGroup } from "./GalleryGroup";
import { gallery } from "./samples";

type StripDemo = Omit<ComponentProps<typeof ReminderStrip>, "label" | "onOpen">;

const words = copy.reminder.strip;

const ignore = () => {};

const SINGLE: StripDemo = {
  atStart: false,
  color: "lime",
  eyebrow: words.eyebrow([words.in(15), "11:00 AM", "Nghe", "Food bank"]),
  title: "Volunteer shift",
  actionLabel: words.details,
  left: 0.62,
};

const DEMOS: readonly StripDemo[] = [
  SINGLE,
  {
    atStart: true,
    color: "lime",
    eyebrow: words.eyebrow([words.now, words.span("11:00 AM", "12:00 PM"), "Food bank"]),
    title: "Volunteer shift",
    actionLabel: words.details,
    left: 0.3,
  },
  {
    atStart: false,
    color: "soft",
    eyebrow: words.eyebrow([words.in(15), "3:30 PM", words.count(3)]),
    title: words.titles(["Soccer practice", "Piano lesson", "Dentist"], 0),
    actionLabel: words.seeAll,
    left: 0.8,
  },
  {
    atStart: false,
    color: "soft",
    eyebrow: words.eyebrow([words.in(6), "3:30 PM", words.count(5)]),
    title: words.titles(["Soccer practice", "Piano lesson"], 3),
    actionLabel: words.seeAll,
  },
  {
    atStart: false,
    color: "coral",
    eyebrow: words.eyebrow([words.in(15), "4:15 PM", "Everyone", "Lincoln Elementary, Room 12"]),
    title: "Parent-teacher conference with Ms. Alvarez about the science fair",
    actionLabel: words.details,
  },
];

const styles = stylex.create({
  large: {
    display: "flex",
    width: 960,
    maxWidth: "100%",
  },
  small: {
    display: "flex",
    width: 358,
  },
});

export function ReminderGallery() {
  return (
    <GalleryGroup title={gallery.groups.reminderStrip} column>
      {DEMOS.map((demo) => (
        <div key={`${demo.eyebrow}${demo.title}`} {...stylex.props(styles.large)}>
          <ReminderStrip {...demo} label={words.label} onOpen={ignore} />
        </div>
      ))}
      <div {...stylex.props(styles.small)}>
        <ReminderStrip {...SINGLE} label={words.label} onOpen={ignore} />
      </div>
    </GalleryGroup>
  );
}
