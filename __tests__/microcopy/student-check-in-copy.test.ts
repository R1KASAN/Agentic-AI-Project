import { describe, expect, it } from "vitest";
import { MICROCOPY } from "@/lib/microcopy";

describe("student check-in lockout microcopy", () => {
    it("uses today/tomorrow wording instead of weekly wording", () => {
        expect(MICROCOPY.student.alreadyCheckedInTitle.th).toContain("วันนี้");
        expect(MICROCOPY.student.alreadyCheckedInTitle.en.toLowerCase()).toContain("today");
        expect(MICROCOPY.student.alreadyCheckedInBody.th).toContain("พรุ่งนี้");
        expect(MICROCOPY.student.alreadyCheckedInBody.en.toLowerCase()).toContain("tomorrow");
        expect(MICROCOPY.student.alreadyCheckedInTitle.en.toLowerCase()).not.toContain("week");
        expect(MICROCOPY.student.alreadyCheckedInBody.en.toLowerCase()).not.toContain("week");
    });
});
