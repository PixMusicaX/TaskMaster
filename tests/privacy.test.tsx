import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import PrivacyPage from "@/app/privacy/page";
import { proxy } from "@/proxy";

const visit = (path: string) => proxy(new NextRequest(`http://localhost:3000${path}`));

describe("the privacy page", () => {
  it("is open to visitors who aren't signed in", () => {
    expect(visit("/privacy").headers.get("location")).toBeNull();
    expect(visit("/calendar").headers.get("location")).toContain("/login");
  });

  it("carries the Limited Use statement Google asks for, with its link", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(html).toContain("including the Limited Use requirements");
    expect(html).toContain("https://developers.google.com/terms/api-services-user-data-policy");
  });
});
