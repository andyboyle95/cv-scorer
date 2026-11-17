// Removes contact details from a Word (.docx) CV and keeps all of its
// formatting. Runs in the browser: the .docx is a zip of XML parts, so we edit
// the text nodes in place and zip it again.

import { isContactLink, redactPieces, type TextPiece } from "./contact-redaction";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const XML_NS = "http://www.w3.org/XML/1998/namespace";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const TEXT_PARTS = /^word\/(?:document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

// Collect the text of one paragraph in document order. Paragraphs nested in
// text boxes are skipped here; they are handled as paragraphs of their own.
function collectPieces(node: Element, out: TextPiece[]) {
  for (const child of Array.from(node.children)) {
    if (child.namespaceURI === W_NS) {
      const tag = child.localName;
      if (tag === "p") continue;
      if (tag === "t") {
        out.push({
          text: child.textContent ?? "",
          set: (t) => {
            child.textContent = t;
            child.setAttributeNS(XML_NS, "xml:space", "preserve");
          },
        });
        continue;
      }
      if (tag === "tab" || tag === "ptab") {
        out.push({ text: "\t" });
        continue;
      }
      if (tag === "br" || tag === "cr") {
        out.push({ text: "\n" });
        continue;
      }
      if (tag === "delText" || tag === "instrText") continue;
    }
    collectPieces(child, out);
  }
}

export interface DocxRedactionResult {
  blob: Blob;
  changes: number;
}

export async function redactDocx(file: Blob): Promise<DocxRedactionResult> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  let changes = 0;

  const partNames = Object.keys(zip.files).filter((n) => TEXT_PARTS.test(n));
  for (const name of partNames) {
    const entry = zip.file(name);
    if (!entry) continue;
    const doc = new DOMParser().parseFromString(await entry.async("string"), "application/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) continue;

    // Links to the candidate's email / phone / LinkedIn: remove the link and its text.
    const relsName = name.replace(/^word\//, "word/_rels/") + ".rels";
    const relsEntry = zip.file(relsName);
    const relsDoc = relsEntry
      ? new DOMParser().parseFromString(await relsEntry.async("string"), "application/xml")
      : null;
    const contactRelIds = new Set<string>();
    if (relsDoc) {
      for (const rel of Array.from(relsDoc.getElementsByTagNameNS(REL_NS, "Relationship"))) {
        const target = rel.getAttribute("Target") ?? "";
        if (isContactLink(target)) {
          contactRelIds.add(rel.getAttribute("Id") ?? "");
        }
      }
    }
    for (const link of Array.from(doc.getElementsByTagNameNS(W_NS, "hyperlink"))) {
      const id = link.getAttributeNS(R_NS, "id");
      if (id && contactRelIds.has(id)) {
        link.parentNode?.removeChild(link);
        changes++;
      }
    }
    if (relsDoc && relsEntry && contactRelIds.size > 0) {
      for (const rel of Array.from(relsDoc.getElementsByTagNameNS(REL_NS, "Relationship"))) {
        if (contactRelIds.has(rel.getAttribute("Id") ?? "")) rel.parentNode?.removeChild(rel);
      }
      zip.file(relsName, new XMLSerializer().serializeToString(relsDoc));
    }

    // Hidden field codes, e.g. HYPERLINK "mailto:name@example.com"
    for (const instr of Array.from(doc.getElementsByTagNameNS(W_NS, "instrText"))) {
      const text = instr.textContent ?? "";
      const cleaned = text.replace(
        /"(?:mailto:|tel:)[^"]*"|"[^"]*linkedin\.com[^"]*"|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
        '""'
      );
      if (cleaned !== text) {
        instr.textContent = cleaned;
        changes++;
      }
    }

    // Visible text, paragraph by paragraph
    for (const p of Array.from(doc.getElementsByTagNameNS(W_NS, "p"))) {
      const pieces: TextPiece[] = [];
      collectPieces(p, pieces);
      if (redactPieces(pieces)) changes++;
    }

    zip.file(name, new XMLSerializer().serializeToString(doc));
  }

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: DOCX_MIME,
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return { blob, changes };
}
