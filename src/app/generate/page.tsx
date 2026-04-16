'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { CvTemplate, CandidateData, ExperienceEntry } from '@/components/cv-template'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
import { Label } from '@/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import { Plus, Trash2, FileDown, ArrowLeft } from 'lucide-react'

const DEFAULT_DATA: CandidateData = {
  consultant: 'Rob Scott',
  consultantEmail: 'robert.scott@aaronwallis.co.uk',
  consultantTel: '01908 061400',
  dateSubmitted: '02/04/2026',
  roleAppliedFor: 'Enterprise Account Executive',
  candidateName: 'Lavinia - Cristina Goran',
  salaryExpectations: '£85,000+ Base',
  noticePeriod: 'Immediately available',
  location: 'London',
  linkedIn: 'https://www.linkedin.com/in/lavinia-cristina-goran-54134541',
  executiveSummary:
    'Lavinia-Cristina Goran is an accomplished sales leader with over a decade of experience in financial data and technology sales, excelling in building robust pipelines and consistently closing deals valued up to £1M annually. Specialising in engaging high-level stakeholders across investment banks, asset managers, hedge funds, and corporates, this candidate has a proven track record of navigating complex sales cycles and driving technology adoption, notably pioneering AI and workflow automation solutions in credit risk and investment operations. Goran\'s strength lies in constructing territories from ground up and growing established client portfolios, demonstrating a keen understanding of institutional decision-making processes.\n\nNoteworthy achievements include consistently meeting revenue targets at PitchBook by mastering opportunities management and boosting client retention through collaboration with customer success teams. At S&P Global\'s Visible Alpha, Goran secured new enterprise clients and deepened existing relationships, showcasing adeptness in both investment and technology discourse. This analytical and consultative approach is complemented by expertise in full-cycle enterprise B2B SaaS, private equity, VC, and private credit markets, making Goran a strategic asset for organisations aiming for industry-leading results. Fluent in English, Romanian, and professionally proficient in Spanish, Goran is well-equipped to foster international business relationships and drive success in global markets.',
  profile:
    'I have spent over a decade in financial data and technology sales, with a consistent record of building and closing pipelines up to £1M a year. My client base has spanned investment banks, asset managers, hedge funds, private equity and venture capital firms, private credit managers and fund administrators and corporates. I engage seamlessly across all levels of an organisation and have a thorough understanding of the decision-making process within institutional firms. I am accomplished at structuring a territory from scratch, as well as managing relationships and growing an established client portfolio. My approach to forecasting and pipeline management is methodical and diligent.',
  skills: [
    'Full-cycle enterprise B2B SaaS',
    'Institutional & private markets coverage',
    'Private equity, VC & private credit markets',
    'Territory planning & go-to-market strategy',
    'CRM governance & forecast discipline',
    'Consultative/Keen-minded selling frameworks',
    'Pipeline build, management & close',
    'Buy-side & sell-side client engagement',
    'Multi-stakeholder enterprise sales cycles',
    'Executive & boardroom-level presentations',
    'Workflow & operational efficiency positioning',
    'Industry events & senior relationship development',
  ],
  experience: [
    {
      id: '1',
      company: "Moody's",
      role: 'Associate Director, Credit Risk & GenAI Workflow Solutions',
      dateFrom: 'Dec 2023',
      dateTo: 'Jan 2026',
      description:
        "Moody's is a global credit ratings, research and data analytics firm. Its Analytics division sells risk, ESG, regulatory and workflow tools to banks, asset managers, insurers and corporate treasuries.",
      bullets: [
        'I worked across a broad institutional client base: banks, asset managers, hedge funds, private credit managers and insurers, engaging credit, risk and investment operations teams at senior levels.',
        'Pioneered AI and workflow automation solutions that replaced manual processes in credit research and risk analysis, making the case for technology change, enhancing incumbent processes for clients.',
        'Navigated complex stakeholder sales cycles involving procurement, legal, technology and business leadership, often across several divisions of the same institution simultaneously.',
        'I presented at multi-level and conducted working sessions for C-level and heads of research, adapting the conversation to the audience and the challenges at hand.',
        'I represented the firm at conferences and client events, keeping relationships ongoing outside of live opportunities.',
      ],
    },
    {
      id: '2',
      company: 'S&P Global - Visible Alpha',
      role: 'Business Development Executive',
      dateFrom: 'Oct 2022',
      dateTo: 'Nov 2023',
      description:
        'Visible Alpha, acquired by S&P in 2023, is a buy-side analytics platform that aggregates sell-side research models to give institutional investors cleaner consensus and forecast data.',
      bullets: [
        'I acquired new enterprise clients and deepened existing relationships across long-only asset managers, hedge funds, sovereign wealth funds and corporates, working directly with portfolio managers, research analysts and heads of investment.',
        'The platform sat across equity research, fundamental analysis and data infrastructure, which required me to hold a credible conversation on both the investment and the technology side.',
        'I led demonstrations, took proposals through to sign-off and handled commercial negotiations to close.',
        'I carried my own territory, pipeline and forecasting.',
      ],
    },
    {
      id: '3',
      company: 'PitchBook (Morningstar)',
      role: 'Sales and Account Manager',
      dateFrom: 'Jan 2017',
      dateTo: 'Sep 2022',
      description:
        'PitchBook is the primary data platform for private capital markets, covering private equity, venture capital, M&A, fund performance and LP/LP activity. It was acquired by Morningstar in 2016 and serves GPs, LPs, investment banks and advisors globally.',
      bullets: [
        'I managed a book of enterprise accounts across private equity, venture capital, growth equity, investment banking and LP institutions, covering most corners of the private markets.',
        'I built close working relationships with partners, MDs and investment teams, becoming a trusted point of contact for how they sourced deals, ran due diligence and monitored portfolios.',
        'During my tenure I met revenue targets consistently through active opportunities management, regular business reviews and well-structured commercial conversations.',
        'I worked closely with customer success and product teams to ensure clients were getting genuine value from the platform, which came through in strong retention and upsell numbers.',
      ],
    },
    {
      id: '4',
      company: 'AME Group',
      role: 'Business Development Associate',
      dateFrom: 'Jun 2015',
      dateTo: 'Jan 2017',
      description: '',
      bullets: [
        'I developed new business across a varied institutional client base: investment banking, asset managers, family offices, sovereign wealth funds, equipment producers (and more), focused on access to senior audiences and extensive travel within the assigned territory.',
        'I owned the process from the first conversation through to the signed agreement.',
        'I prepared client proposals, presentations and events engagements, tailoring each one to the entity and the persona I was addressing.',
      ],
    },
    {
      id: '5',
      company: 'London Financial Studies',
      role: 'Sales Executive',
      dateFrom: 'Dec 2014',
      dateTo: 'Jun 2015',
      description:
        'London Financial Studies runs technical training programmes for finance professionals at banks and asset managers, covering derivatives, fixed income, credit, structured products and risk management.',
      bullets: [
        'I placed training programmes with professionals across investment banking, asset management and risk, taking time to understand what each person needed before making a recommendation.',
        'I conducted client meetings and calls, building trust quickly enough to have forthright conversations regarding professional development and career development direction.',
      ],
    },
  ],
  qualifications: [
    'BA (Hons) Media Studies & Digital Art  Canterbury Christ Church University  2008 - 2011',
  ],
  languages: [
    'English - Fluent',
    'Romanian - Native',
    'Spanish - Professional Working Proficiency',
  ],
}

function newExp(): ExperienceEntry {
  return { id: String(Date.now()), company: '', role: '', dateFrom: '', dateTo: '', description: '', bullets: [''] }
}

// ── Field helpers ──────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-[#1a3668] border-b border-[#1a3668]/20 pb-1 mb-3 mt-1">
      {children}
    </h3>
  )
}

// ── Main page ──────────────────────────────────────────────────

export default function GeneratePage() {
  const [data, setData] = useState<CandidateData>(DEFAULT_DATA)
  const printRef = useRef<HTMLDivElement>(null)

  const set = useCallback(<K extends keyof CandidateData>(key: K, value: CandidateData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handlePrint = () => window.print()

  // ── Experience helpers ──
  const updateExp = (id: string, field: keyof ExperienceEntry, value: string | string[]) => {
    setData((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }))
  }
  const addExp = () => setData((prev) => ({ ...prev, experience: [...prev.experience, newExp()] }))
  const removeExp = (id: string) =>
    setData((prev) => ({ ...prev, experience: prev.experience.filter((e) => e.id !== id) }))

  // ── Bullet helpers ──
  const updateBullets = (id: string, raw: string) =>
    updateExp(id, 'bullets', raw.split('\n'))
  const getBullets = (exp: ExperienceEntry) => exp.bullets.join('\n')

  // ── Skills helpers ──
  const skillsText = data.skills.join('\n')
  const setSkillsText = (raw: string) => set('skills', raw.split('\n'))

  // ── Qualification helpers ──
  const qualsText = data.qualifications.join('\n')
  const setQualsText = (raw: string) => set('qualifications', raw.split('\n'))

  // ── Language helpers ──
  const langsText = data.languages.join('\n')
  const setLangsText = (raw: string) => set('languages', raw.split('\n'))

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      <Header />

      {/* Toolbar */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1a3668]">
          <ArrowLeft className="h-4 w-4" />
          Back to Scorer
        </Link>
        <h1 className="text-base font-semibold text-[#1a3668]">CV Generator</h1>
        <Button
          onClick={handlePrint}
          className="bg-[#df2681] hover:bg-[#c01f6e] text-white gap-2"
        >
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Two-panel layout */}
      <div className="no-print flex flex-1 overflow-hidden">

        {/* LEFT: Form */}
        <div className="w-[420px] shrink-0 bg-white border-r border-gray-200 overflow-y-auto p-5 space-y-5">

          <Tabs defaultValue="cover">
            <TabsList className="grid grid-cols-4 w-full text-xs">
              <TabsTrigger value="cover">Cover</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
            </TabsList>

            {/* ── Cover Sheet ── */}
            <TabsContent value="cover" className="space-y-3 pt-4">
              <SectionHeading>Consultant</SectionHeading>
              <Field label="Name">
                <Input value={data.consultant} onChange={(e) => set('consultant', e.target.value)} />
              </Field>
              <Field label="Email">
                <Input value={data.consultantEmail} onChange={(e) => set('consultantEmail', e.target.value)} />
              </Field>
              <Field label="Telephone">
                <Input value={data.consultantTel} onChange={(e) => set('consultantTel', e.target.value)} />
              </Field>
              <Field label="Date Submitted">
                <Input value={data.dateSubmitted} onChange={(e) => set('dateSubmitted', e.target.value)} />
              </Field>

              <SectionHeading>Candidate</SectionHeading>
              <Field label="Full Name">
                <Input value={data.candidateName} onChange={(e) => set('candidateName', e.target.value)} />
              </Field>
              <Field label="Role Applied For">
                <Input value={data.roleAppliedFor} onChange={(e) => set('roleAppliedFor', e.target.value)} />
              </Field>
              <Field label="Salary / Rate Expectations">
                <Input value={data.salaryExpectations} onChange={(e) => set('salaryExpectations', e.target.value)} />
              </Field>
              <Field label="Notice Period">
                <Input value={data.noticePeriod} onChange={(e) => set('noticePeriod', e.target.value)} />
              </Field>
              <Field label="Location">
                <Input value={data.location} onChange={(e) => set('location', e.target.value)} />
              </Field>
              <Field label="LinkedIn URL">
                <Input value={data.linkedIn} onChange={(e) => set('linkedIn', e.target.value)} />
              </Field>

              <SectionHeading>Executive Summary</SectionHeading>
              <Field label="Cover Page Summary">
                <Textarea
                  value={data.executiveSummary}
                  onChange={(e) => set('executiveSummary', e.target.value)}
                  className="min-h-[200px] text-xs"
                />
              </Field>
            </TabsContent>

            {/* ── Profile & Skills ── */}
            <TabsContent value="profile" className="space-y-3 pt-4">
              <SectionHeading>Profile</SectionHeading>
              <Field label="Profile Statement">
                <Textarea
                  value={data.profile}
                  onChange={(e) => set('profile', e.target.value)}
                  className="min-h-[160px] text-xs"
                />
              </Field>

              <SectionHeading>Skills</SectionHeading>
              <p className="text-xs text-gray-500">One skill per line</p>
              <Textarea
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                className="min-h-[200px] text-xs font-mono"
                placeholder="Full-cycle enterprise B2B SaaS&#10;Territory planning & go-to-market strategy"
              />
            </TabsContent>

            {/* ── Experience ── */}
            <TabsContent value="experience" className="space-y-4 pt-4">
              {data.experience.map((exp, idx) => (
                <div key={exp.id} className="border border-gray-200 rounded-lg p-3 space-y-2.5 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1a3668]">
                      {idx + 1}. {exp.company || 'New Role'}
                    </span>
                    <button
                      onClick={() => removeExp(exp.id)}
                      className="text-red-400 hover:text-red-600 p-0.5"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="From">
                      <Input value={exp.dateFrom} onChange={(e) => updateExp(exp.id, 'dateFrom', e.target.value)} className="text-xs h-7" placeholder="Jan 2020" />
                    </Field>
                    <Field label="To">
                      <Input value={exp.dateTo} onChange={(e) => updateExp(exp.id, 'dateTo', e.target.value)} className="text-xs h-7" placeholder="Dec 2022" />
                    </Field>
                  </div>
                  <Field label="Company">
                    <Input value={exp.company} onChange={(e) => updateExp(exp.id, 'company', e.target.value)} className="text-xs h-7" />
                  </Field>
                  <Field label="Job Title">
                    <Input value={exp.role} onChange={(e) => updateExp(exp.id, 'role', e.target.value)} className="text-xs h-7" />
                  </Field>
                  <Field label="Company Description (optional)">
                    <Textarea value={exp.description} onChange={(e) => updateExp(exp.id, 'description', e.target.value)} className="text-xs min-h-[50px]" />
                  </Field>
                  <Field label="Bullet Points (one per line)">
                    <Textarea
                      value={getBullets(exp)}
                      onChange={(e) => updateBullets(exp.id, e.target.value)}
                      className="text-xs min-h-[100px] font-mono"
                      placeholder="Achieved X by doing Y&#10;Led team of Z..."
                    />
                  </Field>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addExp} className="w-full gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Role
              </Button>
            </TabsContent>

            {/* ── Education & Languages ── */}
            <TabsContent value="education" className="space-y-3 pt-4">
              <SectionHeading>Qualifications</SectionHeading>
              <p className="text-xs text-gray-500">One qualification per line</p>
              <Textarea
                value={qualsText}
                onChange={(e) => setQualsText(e.target.value)}
                className="min-h-[100px] text-xs font-mono"
                placeholder="BA (Hons) Computer Science  University of Bristol  2010-2013"
              />

              <SectionHeading>Languages</SectionHeading>
              <p className="text-xs text-gray-500">One language per line</p>
              <Textarea
                value={langsText}
                onChange={(e) => setLangsText(e.target.value)}
                className="min-h-[100px] text-xs font-mono"
                placeholder="English - Fluent&#10;French - Conversational"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT: Preview */}
        <div className="flex-1 overflow-auto bg-gray-300 p-8">
          <div className="mb-4 text-center">
            <span className="inline-block bg-white/80 text-xs text-gray-500 px-3 py-1 rounded-full shadow-sm">
              Live preview — click &ldquo;Download PDF&rdquo; to export
            </span>
          </div>
          <div className="origin-top" style={{ transform: 'scale(0.75)', transformOrigin: 'top center' }}>
            <CvTemplate data={data} printRef={printRef} />
          </div>
        </div>
      </div>

      {/* Print-only: render template outside no-print wrapper */}
      <div className="hidden print:block">
        <CvTemplate data={data} />
      </div>
    </div>
  )
}
