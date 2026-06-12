import { describe, it, expect } from "vitest";
import {
  computeReminders,
  filterRemindersByPrefs,
  buildWeeklyDigest,
  renderDigestText,
  statusChangeNotification,
  type ReminderApplication,
} from "../app/lib/reminders";

const NOW = new Date("2026-06-12T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const base: ReminderApplication = {
  id: "a1",
  company: "Monzo",
  role: "Backend Engineer",
  status: "applied",
  appliedAt: new Date(NOW.getTime() - 10 * DAY_MS).toISOString(),
};

const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

describe("computeReminders — follow-ups", () => {
  it("fires for a due (or overdue) follow-up on an open application", () => {
    const reminders = computeReminders(
      [{ ...base, followUpDate: at(-2 * DAY_MS) }],
      NOW
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      type: "follow_up",
      applicationId: "a1",
      message: "Follow up with Monzo about Backend Engineer",
    });
  });

  it("spec scenario: a follow-up 2 weeks out is silent now, due in 2 weeks", () => {
    const app = { ...base, followUpDate: at(14 * DAY_MS) };
    expect(computeReminders([app], NOW)).toHaveLength(0);
    const twoWeeksLater = new Date(NOW.getTime() + 14 * DAY_MS);
    expect(computeReminders([app], twoWeeksLater)).toHaveLength(1);
  });

  it("skips follow-ups on rejected/offer applications", () => {
    expect(
      computeReminders(
        [
          { ...base, status: "rejected", followUpDate: at(-DAY_MS) },
          { ...base, id: "a2", status: "offer", followUpDate: at(-DAY_MS) },
        ],
        NOW
      )
    ).toHaveLength(0);
  });
});

describe("computeReminders — deadlines", () => {
  it("fires for a deadline within 48h, not for one further out", () => {
    const reminders = computeReminders(
      [
        { ...base, deadline: at(DAY_MS) },
        { ...base, id: "a2", deadline: at(5 * DAY_MS) },
      ],
      NOW
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe("deadline");
  });

  it("ignores deadlines already passed", () => {
    expect(
      computeReminders([{ ...base, deadline: at(-DAY_MS) }], NOW)
    ).toHaveLength(0);
  });
});

describe("computeReminders — interviews", () => {
  it("alerts for an interview within 24h via interviewAt", () => {
    const reminders = computeReminders(
      [{ ...base, status: "interview", interviewAt: at(6 * 3600_000) }],
      NOW
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe("interview");
  });

  it("alerts for a future-dated interview activity within 24h", () => {
    const reminders = computeReminders(
      [
        {
          ...base,
          activities: [
            { type: "interview", occurredAt: at(12 * 3600_000), title: "Tech round" },
            { type: "note", occurredAt: at(2 * 3600_000) },
          ],
        },
      ],
      NOW
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe("interview");
  });

  it("stays quiet for interviews further than 24h out or in the past", () => {
    expect(
      computeReminders(
        [
          { ...base, interviewAt: at(3 * DAY_MS) },
          { ...base, id: "a2", interviewAt: at(-2 * DAY_MS) },
        ],
        NOW
      )
    ).toHaveLength(0);
  });
});

describe("computeReminders — offers", () => {
  it("celebrates an offer landed within the last 24h", () => {
    const reminders = computeReminders(
      [{ ...base, status: "offer", offerAt: at(-3600_000) }],
      NOW
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0].message).toContain("🎉");
  });

  it("does not re-celebrate old offers", () => {
    expect(
      computeReminders(
        [{ ...base, status: "offer", offerAt: at(-3 * DAY_MS) }],
        NOW
      )
    ).toHaveLength(0);
  });
});

describe("computeReminders — ordering", () => {
  it("sorts by dueAt ascending", () => {
    const reminders = computeReminders(
      [
        { ...base, deadline: at(DAY_MS) },
        { ...base, id: "a2", followUpDate: at(-DAY_MS) },
      ],
      NOW
    );
    expect(reminders.map((r) => r.type)).toEqual(["follow_up", "deadline"]);
  });
});

describe("filterRemindersByPrefs", () => {
  const reminders = computeReminders(
    [
      { ...base, followUpDate: at(-DAY_MS) },
      { ...base, id: "a2", deadline: at(DAY_MS) },
      { ...base, id: "a3", interviewAt: at(3600_000) },
      { ...base, id: "a4", status: "offer", offerAt: at(-3600_000) },
    ],
    NOW
  );

  it("passes everything with all prefs on", () => {
    expect(
      filterRemindersByPrefs(reminders, {
        followUpReminders: true,
        interviewAlerts: true,
        offerCelebration: true,
      })
    ).toHaveLength(4);
  });

  it("drops follow-ups + deadlines together, keeps the rest independent", () => {
    const filtered = filterRemindersByPrefs(reminders, {
      followUpReminders: false,
      interviewAlerts: true,
      offerCelebration: false,
    });
    expect(filtered.map((r) => r.type)).toEqual(["interview"]);
  });
});

describe("buildWeeklyDigest / renderDigestText", () => {
  it("bundles dashboard stats with due reminders and renders them", () => {
    const digest = buildWeeklyDigest(
      [
        { ...base, followUpDate: at(-DAY_MS) },
        { ...base, id: "a2", status: "offer", appliedAt: at(-20 * DAY_MS), offerAt: at(-3600_000) },
      ],
      NOW
    );
    expect(digest.stats.total).toBe(2);
    expect(digest.stats.offers).toBe(1);
    expect(digest.reminders.length).toBeGreaterThan(0);

    const text = renderDigestText(digest);
    expect(text).toContain("Tracked applications: 2");
    expect(text).toContain("Follow up with Monzo");
  });
});

describe("statusChangeNotification", () => {
  it("builds celebration copy for offers", () => {
    const n = statusChangeNotification("Monzo", "Backend Engineer", "offer");
    expect(n?.title).toContain("🎉");
  });

  it("covers interview, shortlisted, and rejected moves", () => {
    for (const status of ["interview", "shortlisted", "rejected"]) {
      expect(
        statusChangeNotification("Monzo", "Backend Engineer", status)
      ).not.toBeNull();
    }
  });

  it("returns null for unremarkable moves", () => {
    expect(statusChangeNotification("Monzo", "BE", "wishlist")).toBeNull();
    expect(statusChangeNotification("Monzo", "BE", "applied")).toBeNull();
  });
});
