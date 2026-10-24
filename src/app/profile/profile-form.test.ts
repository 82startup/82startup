import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ updateProfile: vi.fn() }));

const { ProfileForm } = await import("./profile-form");

const profile = { name: "", job_title: "", company_name: "", company_website: null, bio: "", linkedin_url: null, member_type: null };
const html = renderToStaticMarkup(createElement(ProfileForm, { profile }));

describe("ProfileForm field order", () => {
  it("asks I am, Name, then Company or where you are now, then the job title", () => {
    const order = ["I am", "Name", "Company or where you are now", "What is your job title"].map((label) => html.indexOf(label));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("asks the company before the job title in the form fields too", () => {
    expect(html.indexOf('name="company_name"')).toBeLessThan(html.indexOf('name="job_title"'));
  });
});

describe("ProfileForm and the directory switch", () => {
  it("no longer has the directory switch (it moved to Settings), but points to Settings", () => {
    expect(html).not.toContain("show_in_directory");
    expect(html).not.toContain("Show me in the member directory");
    expect(html).toContain('href="/settings"');
  });
});
