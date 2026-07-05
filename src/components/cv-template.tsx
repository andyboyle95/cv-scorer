'use client'

import { Fragment } from 'react'
import Image from 'next/image'

export interface ExperienceEntry {
  id: string
  company: string
  role: string
  dateFrom: string
  dateTo: string
  description: string
  bullets: string[]
  pageBreakAfter?: boolean
}

export interface CandidateData {
  consultant: string
  consultantEmail: string
  consultantTel: string
  dateSubmitted: string
  roleAppliedFor: string
  candidateName: string
  salaryExpectations: string
  noticePeriod: string
  location: string
  linkedIn: string
  executiveSummary: string
  profile: string
  skills: string[]
  experience: ExperienceEntry[]
  qualifications: string[]
  languages: string[]
}

interface CvTemplateProps {
  data: CandidateData
  printRef?: React.RefObject<HTMLDivElement>
  /**
   * When true, renders a visible "PAGE BREAK" indicator between cv-page
   * divs so the recruiter can see in the live preview which entries got
   * pushed to a new page. Not visible in the PDF export path (that
   * renders each cv-page as its own actual PDF page anyway).
   */
  showBreaks?: boolean
}

const AW_TEL = '01908 061400'
const AW_EMAIL = 'robert.scott@aaronwallis.co.uk'

const BrandStrip = () => (
  <div style={{ margin: '0 -14mm 0 -14mm' }}>
    <div style={{ background: '#1a3668', height: '7mm' }} />
    <div style={{ background: '#df2681', height: '2.5px' }} />
  </div>
)

const LogoRow = () => (
  <div className="flex items-end justify-between mt-4 mb-5 pb-2" style={{ borderBottom: '2px solid #1a3668' }}>
    <Image
      src="/aaron-wallis-logo.png"
      alt="Aaron Wallis"
      width={130}
      height={42}
      className="h-10 w-auto object-contain"
      unoptimized
    />
    <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: '#df2681', letterSpacing: '0.15em' }}>
      Aaron Wallis Sales Recruitment
    </span>
  </div>
)

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-bold pb-1 mb-2" style={{ fontSize: '12px', color: '#1a3668', borderBottom: '1.5px solid #1a3668' }}>
      {children}
    </h3>
  )
}

function ExpEntries({ entries }: { entries: ExperienceEntry[] }) {
  return (
    <div className="space-y-4">
      {entries.map((exp) => (
        <div key={exp.id}>
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-[10px] font-semibold" style={{ color: '#666' }}>
              {[exp.dateFrom, exp.dateTo].filter(Boolean).join(' - ')}
            </span>
            {exp.company && (
              <span className="text-[10.5px] font-bold" style={{ color: '#1a3668' }}>
                {exp.company}
              </span>
            )}
          </div>
          {exp.role && (
            <p className="text-[10.5px] font-semibold text-gray-800 mb-1">{exp.role}</p>
          )}
          {exp.description && (
            <p className="text-[10px] text-gray-600 mb-1 leading-relaxed italic">{exp.description}</p>
          )}
          {exp.bullets.filter(Boolean).length > 0 && (
            <ul className="space-y-0.5 pl-3">
              {exp.bullets.filter(Boolean).map((bullet, i) => (
                <li key={i} className="text-[10.5px] leading-relaxed flex gap-1.5">
                  <span style={{ color: '#df2681', flexShrink: 0 }}>•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

// Split experience entries into page groups wherever pageBreakAfter is set
function groupByPageBreak(entries: ExperienceEntry[]): ExperienceEntry[][] {
  const groups: ExperienceEntry[][] = []
  let current: ExperienceEntry[] = []
  for (const e of entries) {
    current.push(e)
    if (e.pageBreakAfter) {
      groups.push(current)
      current = []
    }
  }
  if (current.length > 0) groups.push(current)
  return groups
}

const PAGE_STYLE = { width: '210mm', minHeight: '297mm', padding: '0 14mm 10mm' } as const

const PageBreakMarker = () => (
  <div
    className="flex items-center gap-2 my-4 print:hidden select-none"
    aria-hidden="true"
    data-page-break="true"
  >
    <div className="flex-1 border-t-2 border-dashed border-[#df2681]/50" />
    <span
      className="text-[9px] font-bold uppercase tracking-widest text-[#df2681] bg-white px-2 py-0.5 rounded-full border border-[#df2681]/30 shadow-sm"
    >
      ✂ Page break
    </span>
    <div className="flex-1 border-t-2 border-dashed border-[#df2681]/50" />
  </div>
)

export function CvTemplate({ data, printRef, showBreaks = false }: CvTemplateProps) {
  const tel = data.consultantTel || AW_TEL
  const email = data.consultantEmail || AW_EMAIL

  const validExp = data.experience.filter(e => e.company || e.role)
  const expGroups = groupByPageBreak(validExp)
  const firstGroup = expGroups[0] ?? []
  const continuationGroups = expGroups.slice(1)
  const hasPageBreaks = continuationGroups.length > 0

  const qualLangFooter = (
    <>
      {data.qualifications.filter(Boolean).length > 0 && (
        <section className="mb-4">
          <SectionHeading>Qualifications</SectionHeading>
          <ul className="space-y-0.5">
            {data.qualifications.filter(Boolean).map((q, i) => (
              <li key={i} className="text-[10.5px]">{q}</li>
            ))}
          </ul>
        </section>
      )}
      {data.languages.filter(Boolean).length > 0 && (
        <section className="mb-4">
          <SectionHeading>Languages</SectionHeading>
          <p className="text-[10.5px]">{data.languages.filter(Boolean).join(' · ')}</p>
        </section>
      )}
      <div className="mt-6 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
        <p className="text-[8px] leading-tight" style={{ color: '#9ca3af' }}>
          Aaron Wallis and Aaron Wallis Sales Recruitment are trading names of Aaron Wallis Recruitment and Training Limited (Registered in the UK, No. 6356563). Our registered office is located at 25-33 The Stable Yard, Vicarage Road, Milton Keynes, MK11 1BN. All candidate information provided is confidential and protected under current Data Protection Laws. By opening this attachment, you acknowledge a formal Applicant Introduction as defined by our Terms of Business. This data is provided exclusively for the purpose of work-finding services for your organisation. For detailed privacy information, please refer to Clause 10 ("Confidentiality and Data Protection") of our terms of business, available for download{' '}
          <a href="https://www.aaronwallis.co.uk/employer/terms-of-business.aspx" style={{ color: '#9ca3af', textDecoration: 'underline' }}>here</a>.
        </p>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .cv-page { page-break-after: always; box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; width: 100% !important; }
          .cv-page:last-child { page-break-after: avoid; }
        }
      `}</style>

      <div ref={printRef as React.RefObject<HTMLDivElement>} className="font-sans text-[11px] text-gray-900">

        {/* ── COVER PAGE ── */}
        <div className="cv-page bg-white shadow-md rounded mx-auto" style={PAGE_STYLE}>
          <BrandStrip />

          <div className="flex items-start justify-between mt-5 mb-8">
            <Image
              src="/aaron-wallis-logo.png"
              alt="Aaron Wallis"
              width={160}
              height={50}
              className="h-14 w-auto object-contain"
              unoptimized
            />
            <div className="text-right text-[10px] leading-relaxed" style={{ color: '#1a3668' }}>
              <p className="font-semibold">Candidate introduced by Aaron Wallis Sales Recruitment</p>
              <p>To interview call {tel}</p>
              <p>or email: {email}</p>
            </div>
          </div>

          <h1 className="text-center text-base font-bold mb-4" style={{ color: '#1a3668' }}>
            CV Cover Sheet
          </h1>

          <table className="w-full border-collapse mb-6 text-[10.5px]" style={{ borderSpacing: 0 }}>
            <tbody>
              {[
                ['Consultant', data.consultant],
                ['Consultant Email Address', data.consultantEmail],
                ['Consultant Tel No', data.consultantTel],
                ['Date Submitted', data.dateSubmitted],
                ['Role Applied For', data.roleAppliedFor],
                ['Candidate Name', data.candidateName],
                ['Salary or Rate Expectations', data.salaryExpectations],
                ['Notice Period', data.noticePeriod],
                ['Lives', data.location],
                ['LinkedIn', data.linkedIn],
              ].map(([label, value]) => (
                <tr key={label} className="border border-gray-300">
                  <td className="font-semibold px-3 py-1.5 border-r border-gray-300 w-48 whitespace-nowrap"
                    style={{ background: '#eef1f7', color: '#1a3668' }}>
                    {label}
                  </td>
                  <td className="px-3 py-1.5">
                    {label === 'LinkedIn' && value ? (
                      <a href={value} className="text-blue-600 underline break-all">{value}</a>
                    ) : (
                      <span>{value}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.executiveSummary && (
            <div className="text-[10.5px] leading-relaxed text-gray-800 text-justify space-y-3">
              {data.executiveSummary.split('\n').filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          <div className="flex justify-center mt-8 pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
            <Image
              src="/aaron-wallis-logo.png"
              alt="Aaron Wallis"
              width={90}
              height={30}
              className="h-6 w-auto object-contain opacity-40"
              unoptimized
            />
          </div>
        </div>

        {showBreaks && <PageBreakMarker />}

        {/* ── MAIN CV PAGE ── */}
        <div className="cv-page bg-white shadow-md rounded mx-auto mt-4 print:mt-0" style={PAGE_STYLE}>
          <BrandStrip />
          <LogoRow />

          <h2 className="text-center font-bold mb-5" style={{ fontSize: '15px', color: '#1a3668' }}>
            {data.candidateName}
          </h2>

          {data.profile && (
            <section className="mb-4">
              <SectionHeading>Profile</SectionHeading>
              <p className="text-[10.5px] leading-relaxed text-justify">{data.profile}</p>
            </section>
          )}

          {data.skills.filter(Boolean).length > 0 && (
            <section className="mb-4">
              <SectionHeading>Skills</SectionHeading>
              <p className="text-[10.5px] leading-relaxed">{data.skills.filter(Boolean).join(', ')}</p>
            </section>
          )}

          {firstGroup.length > 0 && (
            <section className="mb-4">
              <SectionHeading>Experience</SectionHeading>
              <ExpEntries entries={firstGroup} />
            </section>
          )}

          {!hasPageBreaks && qualLangFooter}
        </div>

        {/* ── CONTINUATION PAGES (one per page break group) ── */}
        {continuationGroups.map((group, idx) => {
          const isLast = idx === continuationGroups.length - 1
          return (
            <Fragment key={idx}>
              {showBreaks && <PageBreakMarker />}
              <div className="cv-page bg-white shadow-md rounded mx-auto mt-4 print:mt-0" style={PAGE_STYLE}>
                <BrandStrip />
                <LogoRow />
                <section className="mb-4">
                  <SectionHeading>Experience (continued)</SectionHeading>
                  <ExpEntries entries={group} />
                </section>
                {isLast && qualLangFooter}
              </div>
            </Fragment>
          )
        })}

      </div>
    </>
  )
}
