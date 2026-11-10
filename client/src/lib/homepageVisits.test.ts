import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "vitest";
import {
  buildVisitWindow,
  countLabelsFit,
  parseGa4Rows,
  seoulDateString,
  visitTotal,
  VISIT_COUNT_FONT_PX,
  VISIT_WINDOW_DAYS,
} from "../../../shared/homepageVisits";

describe("homepage GA4 visit window", () => {
  it("uses the Asia/Seoul calendar date across midnight UTC", () => {
    assert.equal(
      seoulDateString(new Date("2026-11-09T14:30:00Z")),
      "2026-11-09"
    );
    assert.equal(
      seoulDateString(new Date("2026-11-09T15:30:00Z")),
      "2026-11-10"
    );
  });

  it("ends yesterday in Seoul and covers 30 days, dropping today's count", () => {
    const now = new Date("2026-11-09T15:30:00Z");
    const bars = buildVisitWindow(
      [
        { date: "2026-11-10", views: 999 },
        { date: "2026-11-09", views: 12 },
        { date: "2026-10-11", views: 3 },
        { date: "2026-10-10", views: 50 },
      ],
      now
    );

    assert.equal(bars.length, VISIT_WINDOW_DAYS);
    assert.equal(bars[0].date, "2026-10-11");
    assert.equal(bars[bars.length - 1].date, "2026-11-09");
    assert.equal(
      bars.find(bar => bar.date === "2026-11-10"),
      undefined
    );
    assert.equal(visitTotal(bars), 15);
    assert.equal(
      bars.every(bar => typeof bar.views === "number"),
      true
    );
  });

  it("marks Saturday and Sunday as 주말 and weekdays as 평일", () => {
    const bars = buildVisitWindow([], new Date("2026-11-09T15:30:00Z"));
    const byDate = Object.fromEntries(bars.map(bar => [bar.date, bar.kind]));
    assert.equal(byDate["2026-11-07"], "주말");
    assert.equal(byDate["2026-11-08"], "주말");
    assert.equal(byDate["2026-11-09"], "평일");
    assert.equal(byDate["2026-10-11"], "주말");
  });

  it("parses GA4 date rows and ignores junk", () => {
    const points = parseGa4Rows([
      {
        dimensionValues: [{ value: "20261109" }],
        metricValues: [{ value: "8" }],
      },
      { dimensionValues: [{ value: "bad" }], metricValues: [{ value: "1" }] },
      {
        dimensionValues: [{ value: "20261108" }],
        metricValues: [{ value: "-4" }],
      },
    ]);
    assert.deepEqual(points, [
      { date: "2026-11-09", views: 8 },
      { date: "2026-11-08", views: 0 },
    ]);
  });

  it("keeps rotated count labels inside a phone-width plot", () => {
    assert.equal(VISIT_COUNT_FONT_PX, 8);
    assert.equal(countLabelsFit(280), true);
    assert.equal(countLabelsFit(8 * 30 - 1), false);
  });

  it("does not mention the Netlify pageview series in the card", () => {
    const card = readFileSync(
      new URL("../components/HomepageVisitsCard.tsx", import.meta.url),
      "utf8"
    );
    const chart = readFileSync(
      new URL("../components/HomepageVisitsChart.tsx", import.meta.url),
      "utf8"
    );
    const home = readFileSync(
      new URL("../pages/Home.tsx", import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(card + chart + home, /Netlify|넷틀리파이|페이지뷰/);
    assert.match(card, /평일/);
    assert.match(card, /주말/);
    assert.match(card, /홈페이지 일별 방문\(30일\)/);
  });
});
