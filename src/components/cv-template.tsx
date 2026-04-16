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

export function CvTemplate({ data, printRef }: CvTemplateProps) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          .cv-page { page-break-after: always; box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; width: 100% !important; }
          .cv-page:last-child { page-break-after: avoid; }
        }
      `}</style>

      <div ref={printRef} className="font-sans text-[11px] text-gray-900">

        {/* ── COVER PAGE ── */}
        <div className="cv-page bg-white shadow-md rounded mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '14mm 14mm 10mm' }}>

          {/* Cover page header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-3">
              <Image
                src="https://www.aaronwallis.co.uk/media/chgpaiwp/aaron-wallis-logo.png"
                alt="Aaron Wallis"
                width={160}
                height={50}
                className="h-14 w-auto object-contain"
                unoptimized
              />
            </div>
            <div className="text-right text-[10px] text-gray-700 leading-relaxed">
              <p>Candidate introduced by Aaron Wallis Sales Recruitment</p>
              <p>To interview call {data.consultantTel}</p>
              <p>or email: {data.consultantEmail}</p>
            </div>
          </div>

          {/* Cover Sheet heading */}
          <h1 className="text-center text-base font-bold text-gray-900 mb-4">CV Cover Sheet</h1>

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
                  <td className="font-semibold bg-gray-50 px-3 py-1.5 border-r border-gray-300 w-48 whitespace-nowrap">{label}</td>
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
            <p className="text-[10.5px] leading-relaxed text-gray-800 text-justify">
              {data.executiveSummary}
            </p>
          )}
        </div>

        {/* ── CV PAGES ── */}
        <div className="cv-page bg-white shadow-md rounded mx-auto mt-4 print:mt-0" style={{ width: '210mm', minHeight: '297mm', padding: '10mm 14mm 10mm' }}>

          {/* CV header */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-[#1a3668]">
            <Image
              src="https://www.aaronwallis.co.uk/media/chgpaiwp/aaron-wallis-logo.png"
              alt="Aaron Wallis"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
              unoptimized
            />
          </div>

          {/* Candidate name */}
          <h2 className="text-center text-[16px] font-bold text-gray-900 mb-5">{data.candidateName}</h2>

          {/* Profile */}
          {data.profile && (
            <section className="mb-5">
              <h3 className="text-[13px] font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">Profile</h3>
              <p className="text-[10.5px] leading-relaxed text-justify">{data.profile}</p>
            </section>
          )}

          {/* Skills */}
          {data.skills.filter(Boolean).length > 0 && (
            <section className="mb-5">
              <h3 className="text-[13px] font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">Skills</h3>
              <p className="text-[10.5px] leading-relaxed">
                {data.skills.filter(Boolean).join(', ')}
              </p>
            </section>
          )}

          {/* Experience */}
          {data.experience.filter(e => e.company || e.role).length > 0 && (
            <section className="mb-5">
              <h3 className="text-[13px] font-bold text-gray-900 border-b border-gray-300 pb-1 mb-3">Experience</h3>
              <div className="space-y-4">
                {data.experience.filter(e => e.company || e.role).map((exp) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="text-[10.5px] font-semibold text-gray-600">
                        {[exp.dateFrom, exp.dateTo].filter(Boolean).join(' - ')}
                        {exp.company && <span className="font-bold text-gray-900"> {exp.company}</span>}
                      </span>
                    </div>
                    {exp.role && (
                      <p className="text-[10.5px] font-bold text-gray-900 mb-1">{exp.role}</p>
                    )}
                    {exp.description && (
                      <p className="text-[10.5px] text-gray-700 mb-1 leading-relaxed">{exp.description}</p>
                    )}
                    {exp.bullets.filter(Boolean).length > 0 && (
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        {exp.bullets.filter(Boolean).map((bullet, i) => (
                          <li key={i} className="text-[10.5px] leading-relaxed">{bullet}</li>
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
            <section className="mb-5">
              <h3 className="text-[13px] font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">Qualifications</h3>
              <ul className="space-y-0.5">
                {data.qualifications.filter(Boolean).map((q, i) => (
                  <li key={i} className="text-[10.5px]">{q}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Languages */}
          {data.languages.filter(Boolean).length > 0 && (
            <section className="mb-5">
              <h3 className="text-[13px] font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">Languages</h3>
              <p className="text-[10.5px]">{data.languages.filter(Boolean).join(' · ')}</p>
            </section>
          )}

          {/* Footer disclaimer */}
          <div className="mt-auto pt-4 border-t border-gray-200">
            <p className="text-[8px] text-gray-400 leading-tight">
              Aaron Wallis and Aaron Wallis Sales Recruitment are trading styles of Aaron Wallis Recruitment and Training Limited.
              Registered Address: 25-33 The Stable Yard, Vicarage Road, Milton Keynes, Buckinghamshire, MK11BN.
              Aaron Wallis is an Employment Business and registered in the UK No. 6356563. All information relating to an Applicant is confidential and subject to the Data Protection Laws.
            </p>
          </div>
        </div>

      </div>
    </>
  )
}
