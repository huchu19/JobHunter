import { describe, it, expect } from "vitest";
import {
  greenhouseJobsUrl,
  leverJobsUrl,
  ashbyJobsUrl,
  workdayJobsUrl,
  normalizeGreenhouse,
  normalizeLever,
  normalizeAshby,
  normalizeWorkday,
} from "../app/lib/atsListings";

describe("ATS endpoint builders", () => {
  it("builds Greenhouse / Lever / Ashby board URLs", () => {
    expect(greenhouseJobsUrl("monzo")).toBe(
      "https://boards-api.greenhouse.io/v1/boards/monzo/jobs"
    );
    expect(leverJobsUrl("deliveroo")).toBe(
      "https://api.lever.co/v0/postings/deliveroo?mode=json"
    );
    expect(ashbyJobsUrl("ramp")).toBe(
      "https://api.ashbyhq.com/posting-api/job-board/ramp"
    );
  });

  it("builds the Workday CXS jobs endpoint from a board URL", () => {
    expect(
      workdayJobsUrl("https://acme.wd1.myworkdayjobs.com/en-US/Careers")
    ).toBe("https://acme.wd1.myworkdayjobs.com/wday/cxs/acme/Careers/jobs");
  });

  it("returns null for non-Workday URLs", () => {
    expect(workdayJobsUrl("https://monzo.com/careers")).toBeNull();
    expect(workdayJobsUrl("not a url")).toBeNull();
  });
});

describe("normalizeGreenhouse", () => {
  it("maps jobs into the shared Listing shape", () => {
    const data = {
      jobs: [
        {
          title: "Backend Engineer",
          absolute_url: "https://boards.greenhouse.io/monzo/jobs/1",
          location: { name: "London" },
          updated_at: "2026-06-01T10:00:00Z",
        },
        { title: "No URL", location: { name: "Remote" } }, // dropped (no url)
      ],
    };
    const out = normalizeGreenhouse(data);
    expect(out).toEqual([
      {
        title: "Backend Engineer",
        location: "London",
        url: "https://boards.greenhouse.io/monzo/jobs/1",
        postedAt: "2026-06-01",
      },
    ]);
  });

  it("is safe on empty / malformed input", () => {
    expect(normalizeGreenhouse({})).toEqual([]);
    expect(normalizeGreenhouse(null)).toEqual([]);
    expect(normalizeGreenhouse({ jobs: "nope" })).toEqual([]);
  });
});

describe("normalizeLever", () => {
  it("maps postings and converts the epoch createdAt to a date", () => {
    const data = [
      {
        text: "Product Designer",
        hostedUrl: "https://jobs.lever.co/acme/123",
        categories: { location: "London" },
        createdAt: Date.UTC(2026, 0, 15), // 2026-01-15
      },
    ];
    expect(normalizeLever(data)).toEqual([
      {
        title: "Product Designer",
        location: "London",
        url: "https://jobs.lever.co/acme/123",
        postedAt: "2026-01-15",
      },
    ]);
  });

  it("is safe on non-array input", () => {
    expect(normalizeLever({})).toEqual([]);
    expect(normalizeLever(null)).toEqual([]);
  });
});

describe("normalizeAshby", () => {
  it("maps jobs into the shared Listing shape", () => {
    const data = {
      jobs: [
        {
          title: "Data Engineer",
          jobUrl: "https://jobs.ashbyhq.com/acme/abc",
          location: "Remote — UK",
          publishedAt: "2026-05-20",
        },
      ],
    };
    expect(normalizeAshby(data)).toEqual([
      {
        title: "Data Engineer",
        location: "Remote — UK",
        url: "https://jobs.ashbyhq.com/acme/abc",
        postedAt: "2026-05-20",
      },
    ]);
  });
});

describe("normalizeWorkday", () => {
  it("resolves externalPath against the board origin", () => {
    const board = "https://acme.wd1.myworkdayjobs.com/en-US/Careers";
    const data = {
      jobPostings: [
        {
          title: "Platform Engineer",
          externalPath: "/job/London/Platform-Engineer_R-1",
          locationsText: "London, UK",
        },
      ],
    };
    expect(normalizeWorkday(data, board)).toEqual([
      {
        title: "Platform Engineer",
        location: "London, UK",
        url: "https://acme.wd1.myworkdayjobs.com/job/London/Platform-Engineer_R-1",
        postedAt: null,
      },
    ]);
  });

  it("is safe when jobPostings is missing", () => {
    expect(normalizeWorkday({}, "https://acme.wd1.myworkdayjobs.com")).toEqual(
      []
    );
  });
});
