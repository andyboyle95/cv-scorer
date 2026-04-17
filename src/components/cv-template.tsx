'use client'

import Image from 'next/image'

export interface ExperienceEntry {
  id: string
  company: string
  role: string
  dateFrom: string
  dateTo: string
  description: string
  bullets: string[]
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
  printRef?: React.RefObject<HTMLDivElement | null>
}

const AW_TEL = '01908 061400'
const AW_EMAIL = 'robert.scott@aaronwallis.co.uk'

const BrandStrip = () => (
  <div style={{ margin: '0 -14mm 0 -14mm' }}>
    <div style={{ background: '#1a3668', height: '7mm' }} />
    <div style={{ background: '#df2681', height: '2.5px' }} />
  </div>
)

export function CvTemplate({ data, printRef }: CvTemplateProps) {
  const tel = data.consultantTel || AW_TEL
  const email = data.consultantEmail || AW_EMAIL

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

      <div ref={printRef} className="font-sans text-[11px] text-gray-900">

        {/* ── COVER PAGE ── */}
        <div className="cv-page bg-white shadow-md rounded mx-auto"
          style={{ width: '210mm', minHeight: '297mm', padding: '0 14mm 10mm' }}>

          {/* Brand header strip */}
          <BrandStrip />

          {/* Logo + contact block */}
          <div className="flex items-start justify-between mt-5 mb-8">
            <Image
              src="https://www.aaronwallis.co.uk/media/chgpaiwp/aaron-wallis-logo.png"
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

          {/* Cover Sheet heading */}
          <h1 className="text-center text-base font-bold mb-4" style={{ color: '#1a3668' }}>
            CV Cover Sheet
          </h1>

          {/* Metadata table */}
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

          {/* Executive summary */}
          {data.executiveSummary && (
            <div className="text-[10.5px] leading-relaxed text-gray-800 text-justify space-y-3">
              {data.executiveSummary.split('\n').filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}
        </div>

        {/* ── CV PAGE ── */}
        <div className="cv-page bg-white shadow-md rounded mx-auto mt-4 print:mt-0"
          style={{ width: '210mm', minHeight: '297mm', padding: '0 14mm 10mm' }}>

          {/* Brand header strip */}
          <BrandStrip />

          {/* Logo row */}
          <div className="flex items-end justify-between mt-4 mb-5 pb-2"
            style={{ borderBottom: '2px solid #1a3668' }}>
            <Image
              src="https://www.aaronwallis.co.uk/media/chgpaiwp/aaron-wallis-logo.png"
              alt="Aaron Wallis"
              width={130}
              height={42}
              className="h-10 w-auto object-contain"
              unoptimized
            />
            <span className="text-[9px] font-semibold tracking-widest uppercase"
              style={{ color: '#df2681', letterSpacing: '0.15em' }}>
              Sales Recruitment
            </span>
          </div>

          {/* Candidate name */}
          <h2 className="text-center font-bold mb-5" style={{ fontSize: '15px', color: '#1a3668' }}>
            {data.candidateName}
          </h2>

          {/* Section helper */}
          {/* Profile */}
          {data.profile && (
            <section className="mb-4">
              <h3 className="font-bold pb-1 mb-2"
                style={{ fontSize: '12px', color: '#1a3668', borderBottom: '1.5px solid #1a3668' }}>
                Profile
              </h3>
              <p className="text-[10.5px] leading-relaxed text-justify">{data.profile}</p>
            </section>
          )}

          {/* Skills */}
          {data.skills.filter(Boolean).length > 0 && (
            <section className="mb-4">
              <h3 className="font-bold pb-1 mb-2"
                style={{ fontSize: '12px', color: '#1a3668', borderBottom: '1.5px solid #1a3668' }}>
                Skills
              </h3>
              <p className="text-[10.5px] leading-relaxed">
                {data.skills.filter(Boolean).join(', ')}
              </p>
            </section>
          )}

          {/* Experience */}
          {data.experience.filter(e => e.company || e.role).length > 0 && (
            <section className="mb-4">
              <h3 className="font-bold pb-1 mb-3"
                style={{ fontSize: '12px', color: '#1a3668', borderBottom: '1.5px solid #1a3668' }}>
                Experience
              </h3>
              <div className="space-y-4">
                {data.experience.filter(e => e.company || e.role).map((exp) => (
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
            </section>
          )}

          {/* Qualifications */}
          {data.qualifications.filter(Boolean).length > 0 && (
            <section className="mb-4">
              <h3 className="font-bold pb-1 mb-2"
                style={{ fontSize: '12px', color: '#1a3668', borderBottom: '1.5px solid #1a3668' }}>
                Qualifications
              </h3>
              <ul className="space-y-0.5">
                {data.qualifications.filter(Boolean).map((q, i) => (
                  <li key={i} className="text-[10.5px]">{q}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Languages */}
          {data.languages.filter(Boolean).length > 0 && (
            <section className="mb-4">
              <h3 className="font-bold pb-1 mb-2"
                style={{ fontSize: '12px', color: '#1a3668', borderBottom: '1.5px solid #1a3668' }}>
                Languages
              </h3>
              <p className="text-[10.5px]">{data.languages.filter(Boolean).join(' · ')}</p>
            </section>
          )}

          {/* Footer disclaimer */}
          <div className="mt-6 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
            <p className="text-[8px] leading-tight" style={{ color: '#9ca3af' }}>
              Aaron Wallis and Aaron Wallis Sales Recruitment are trading styles of Aaron Wallis Recruitment and Training Limited.
              Registered Address: 25-33 The Stable Yard, Vicarage Road, Milton Keynes, Buckinghamshire, MK11BN.
              Aaron Wallis is an Employment Business registered in the UK No. 6356563. All information relating to an Applicant is confidential and subject to the Data Protection Laws.
            </p>
          </div>
        </div>

      </div>
    </>
  )
}
