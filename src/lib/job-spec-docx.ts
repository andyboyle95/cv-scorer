// Builds a Word-openable document (HTML wrapped with an Office MIME header).
// Saved as .doc — Word opens it directly and the user can re-save as .docx.
// Zero-dependency and keeps the same content/branding as the PDF.

export interface DocSection {
  heading: string;
  type: "prose" | "list";
  prose?: string;
  items?: string[];
}

export interface DocModel {
  jobTitle: string;
  companyName: string;
  preparedBy: string;
  preparedDate: string;
  openingStatement: string;
  sections: DocSection[];
  branded: boolean;
  phone?: string;
}

function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderSection(s: DocSection): string {
  const heading = `<h2 style="color:#1a3668;font-size:13pt;border-bottom:1px solid #1a3668;padding-bottom:2px;margin:14px 0 6px;">${esc(
    s.heading
  )}</h2>`;
  if (s.type === "prose") {
    const text = (s.prose ?? "").trim();
    if (!text) return "";
    return `${heading}<p style="font-size:11pt;line-height:1.5;margin:0 0 8px;">${esc(
      text
    )}</p>`;
  }
  const items = (s.items ?? []).filter((i) => i.trim());
  if (items.length === 0) return "";
  const lis = items
    .map(
      (i) =>
        `<li style="font-size:11pt;line-height:1.45;margin-bottom:3px;">${esc(
          i
        )}</li>`
    )
    .join("");
  return `${heading}<ul style="margin:0 0 8px;padding-left:18px;">${lis}</ul>`;
}

export function buildDocHtml(model: DocModel): string {
  const header = model.branded
    ? `<div style="border-bottom:2px solid #1a3668;padding-bottom:6px;margin-bottom:10px;">
         <span style="color:#df2681;font-size:9pt;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Aaron Wallis Sales Recruitment — Job Specification</span>
       </div>`
    : "";

  const opening = model.openingStatement.trim()
    ? `<p style="font-size:11pt;line-height:1.5;margin:0 0 10px;">${esc(
        model.openingStatement
      )}</p>`
    : "";

  const footer = model.branded
    ? `<div style="margin-top:18px;padding-top:8px;border-top:1px solid #ccc;font-size:8pt;color:#777;line-height:1.4;">
         ${
           model.phone
             ? `<p style="margin:0 0 4px;font-size:9pt;color:#1a3668;"><strong>Need help hiring? Speak to an Aaron Wallis consultant on ${esc(
                 model.phone
               )}.</strong></p>`
             : ""
         }
         Aaron Wallis and Aaron Wallis Sales Recruitment are trading names of Aaron Wallis Recruitment and Training Limited (Registered in the UK, No. 6356563). This specification is generated as a starting point — please review for accuracy before publishing.
       </div>`
    : "";

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(model.jobTitle)}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#2D2D2D;">
${header}
<h1 style="color:#1a3668;font-size:20pt;margin:0 0 2px;">${esc(
    model.jobTitle || "Job Title"
  )}</h1>
<p style="font-size:10pt;color:#555;margin:0 0 12px;">${esc(model.companyName)}${
    model.preparedBy ? ` &middot; Prepared by ${esc(model.preparedBy)}` : ""
  }${model.preparedDate ? ` &middot; ${esc(model.preparedDate)}` : ""}</p>
${opening}
${model.sections.map(renderSection).join("")}
${footer}
</body>
</html>`;
}

export function downloadDoc(model: DocModel): void {
  const html = buildDocHtml(model);
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug =
    (model.jobTitle || "job-spec")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "job-spec";
  a.href = url;
  a.download = `${slug}-job-spec.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
