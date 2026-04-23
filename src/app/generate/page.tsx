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
import { Plus, Trash2, FileDown, ArrowLeft, Upload, ClipboardPaste, Loader2, CheckCircle2, ChevronDown, ChevronUp, Wand2 } from 'lucide-react'

const BLANK_DATA: CandidateData = {
  consultant: 'Rob Scott',
  consultantEmail: 'robert.scott@aaronwallis.co.uk',
  consultantTel: '01908 061400',
  dateSubmitted: '',
  roleAppliedFor: '',
  candidateName: '',
  salaryExpectations: '',
  noticePeriod: '',
  location: '',
  linkedIn: '',
  executiveSummary: '',
  profile: '',
  skills: [],
  experience: [],
  qualifications: [],
  languages: [],
}

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
    'Lavinia-Cristina Goran is an accomplished sales leader with over a decade of experience in financial data and technology sales, excelling in building robust pipelines and consistently closing deals valued up to £1M annually. Specialising in engaging high-level stakeholders across investment banks, asset managers, hedge funds, and corporates, this candidate has a proven track record of navigating complex sales cycles and driving technology adoption, notably pioneering AI and workflow automation solutions in credit risk and investment operations.\n\nNoteworthy achievements include consistently meeting revenue targets at PitchBook by mastering opportunities management and boosting client retention through collaboration with customer success teams. At S&P Global\'s Visible Alpha, Goran secured new enterprise clients and deepened existing relationships, showcasing adeptness in both investment and technology discourse. Fluent in English, Romanian, and professionally proficient in Spanish, Goran is well-equipped to foster international business relationships and drive success in global markets.',
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
        'I acquired new enterprise clients and deepened existing relationships across long-only asset managers, hedge funds, sovereign wealth funds and corporates.',
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
        'PitchBook is the primary data platform for private capital markets, covering private equity, venture capital, M&A, fund performance and LP activity.',
      bullets: [
        'I managed a book of enterprise accounts across private equity, venture capital, growth equity, investment banking and LP institutions.',
        'During my tenure I met revenue targets consistently through active opportunities management, regular business reviews and well-structured commercial conversations.',
        'I worked closely with customer success and product teams to ensure clients were getting genuine value from the platform.',
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
        'I developed new business across a varied institutional client base: investment banking, asset managers, family offices, sovereign wealth funds and equipment producers.',
        'I owned the process from the first conversation through to the signed agreement.',
      ],
    },
    {
      id: '5',
      company: 'London Financial Studies',
      role: 'Sales Executive',
      dateFrom: 'Dec 2014',
      dateTo: 'Jun 2015',
      description:
        'London Financial Studies runs technical training programmes for finance professionals at banks and asset managers.',
      bullets: [
        'I placed training programmes with professionals across investment banking, asset management and risk.',
        'I conducted client meetings and calls, building trust quickly enough to have forthright conversations regarding professional development.',
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

type ImportStatus = 'idle' | 'parsing' | 'extracting' | 'done' | 'error'

export default function GeneratePage() {
  const [data, setData] = useState<CandidateData>({ ...BLANK_DATA, dateSubmitted: new Date().toLocaleDateString('en-GB') })
  const printRef = useRef<HTMLDivElement>(null)
  const [rewriting, setRewriting] = useState(false)
  const [rewriteError, setRewriteError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Import state
  const [importOpen, setImportOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle')
  const [importError, setImportError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const set = useCallback(<K extends keyof CandidateData>(key: K, value: CandidateData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }, [])

  // ── Rewrite summary ───────────────────────────────────────────

  const handleRewrite = async () => {
    if (!data.executiveSummary.trim()) return
    setRewriting(true)
    setRewriteError('')
    try {
      const res = await fetch('/api/rewrite-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roughNotes: data.executiveSummary,
          candidateName: data.candidateName,
          roleAppliedFor: data.roleAppliedFor,
        }),
      })
      let json: Record<string, unknown>
      try { json = await res.json() } catch { throw new Error(`Server error (${res.status})`) }
      if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Rewrite failed')
      set('executiveSummary', (json as { summary: string }).summary)
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : 'Rewrite failed')
    } finally {
      setRewriting(false)
    }
  }

  // ── PDF download ─────────────────────────────────────────────

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const wrapper = document.getElementById('pdf-capture-wrapper') as HTMLElement
      if (!wrapper) return

      const prev = wrapper.getAttribute('style') ?? ''
      wrapper.style.cssText = 'display:block;position:fixed;left:-10000px;top:0;z-index:-1;'

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      const cvPages = wrapper.querySelectorAll<HTMLElement>('.cv-page')
      const pdfWidth = 210  // A4 width mm
      const pdfHeight = 297 // A4 height mm
      let pdf: InstanceType<typeof jsPDF> | null = null
      let firstPage = true

      for (let i = 0; i < cvPages.length; i++) {
        const canvas = await html2canvas(cvPages[i], {
          scale: 2,
          allowTaint: true,
          useCORS: true,
          logging: false,
        })

        // A4 height in canvas pixels
        const a4HeightPx = Math.round(canvas.width * (pdfHeight / pdfWidth))
        let yOffset = 0

        while (yOffset < canvas.height) {
          const slicePx = Math.min(a4HeightPx, canvas.height - yOffset)

          // Draw slice onto an A4-sized canvas (pad with white if last slice is short)
          const slice = document.createElement('canvas')
          slice.width = canvas.width
          slice.height = a4HeightPx
          const ctx = slice.getContext('2d')!
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, slice.width, slice.height)
          ctx.drawImage(canvas, 0, yOffset, canvas.width, slicePx, 0, 0, canvas.width, slicePx)

          const img = slice.toDataURL('image/jpeg', 0.95)

          if (firstPage) {
            pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
            firstPage = false
          } else {
            pdf!.addPage('a4', 'p')
          }
          pdf!.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight)
          yOffset += a4HeightPx
        }
      }

      wrapper.setAttribute('style', prev)

      const slug = (data.candidateName || 'cv')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      pdf!.save(`${slug}.pdf`)
    } catch (err) {
      console.error('PDF download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  // ── Import logic ──────────────────────────────────────────────

  const applyExtracted = (extracted: Record<string, unknown>) => {
    setData((prev) => ({
      ...prev,
      candidateName: (extracted.candidateName as string) ?? prev.candidateName,
      executiveSummary: (extracted.executiveSummary as string) ?? prev.executiveSummary,
      profile: (extracted.profile as string) ?? prev.profile,
      skills: (extracted.skills as string[])?.length ? extracted.skills as string[] : prev.skills,
      experience: (extracted.experience as Omit<ExperienceEntry, 'id'>[])?.length
        ? (extracted.experience as Omit<ExperienceEntry, 'id'>[]).map((e, i) => ({ ...e, id: String(i + 1) }))
        : prev.experience,
      qualifications: (extracted.qualifications as string[])?.length ? extracted.qualifications as string[] : prev.qualifications,
      languages: (extracted.languages as string[])?.length ? extracted.languages as string[] : prev.languages,
    }))
  }

  const extractAndApply = async (cvText: string) => {
    setImportStatus('extracting')
    setImportError('')
    try {
      const res = await fetch('/api/extract-cv-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText }),
      })
      let extracted: Record<string, unknown>
      try {
        extracted = await res.json()
      } catch {
        throw new Error(`Server error (${res.status}) — check your ANTHROPIC_API_KEY is set`)
      }
      if (!res.ok) throw new Error((extracted as { error?: string }).error ?? 'Extraction failed')
      applyExtracted(extracted)
      setImportStatus('done')
      setPasteText('')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to extract CV fields')
      setImportStatus('error')
    }
  }



  const handleFile = async (file: File) => {
    setImportStatus('parsing')
    setImportError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-cv', { method: 'POST', body: formData })
      let parsed: Record<string, unknown>
      try {
        parsed = await res.json()
      } catch {
        throw new Error(`File parse failed (${res.status})`)
      }
      if (!res.ok) throw new Error((parsed as { error?: string }).error ?? 'Failed to parse file')
      const { text } = parsed as { text: string }
      await extractAndApply(text)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'File parsing failed')
      setImportStatus('error')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handlePasteExtract = () => {
    if (pasteText.trim().length < 50) return
    extractAndApply(pasteText)
  }

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
  const updateBullets = (id: string, raw: string) => updateExp(id, 'bullets', raw.split('\n'))
  const getBullets = (exp: ExperienceEntry) => exp.bullets.join('\n')

  const skillsText = data.skills.join('\n')
  const setSkillsText = (raw: string) => set('skills', raw.split('\n'))
  const qualsText = data.qualifications.join('\n')
  const setQualsText = (raw: string) => set('qualifications', raw.split('\n'))
  const langsText = data.languages.join('\n')
  const setLangsText = (raw: string) => set('languages', raw.split('\n'))

  const busy = importStatus === 'parsing' || importStatus === 'extracting'

  return (
    <>
      {/* ── Screen UI (hidden on print) ── */}
      <div className="min-h-screen bg-[#F7F7F7] flex flex-col print:hidden">
        <Header title="CV Generator" />

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1a3668]">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <h1 className="text-base font-semibold text-[#1a3668]">CV Generator</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setData({ ...BLANK_DATA, dateSubmitted: new Date().toLocaleDateString('en-GB') }); setImportStatus('idle') }}
              className="text-xs"
            >
              New CV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setData(DEFAULT_DATA); setImportStatus('idle') }}
              className="text-xs border-[#df2681]/40 text-[#df2681] hover:bg-[#df2681]/5"
            >
              Load Test Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const slug = (data.candidateName || 'cv')
                  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                const prev = document.title
                document.title = slug
                window.print()
                setTimeout(() => { document.title = prev }, 1500)
              }}
              className="text-xs gap-1.5"
            >
              <FileDown className="h-3.5 w-3.5" />
              Print to PDF
            </Button>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="bg-[#df2681] hover:bg-[#c01f6e] text-white gap-2"
            >
              {downloading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                : <><FileDown className="h-4 w-4" /> Download PDF</>}
            </Button>
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT: Form */}
          <div className="w-[440px] shrink-0 bg-white border-r border-gray-200 overflow-y-auto">

            {/* ── Import section ── */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => setImportOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-[#1a3668] hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import from CV
                  {importStatus === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </span>
                {importOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {importOpen && (
                <div className="px-5 pb-4 space-y-3">
                  <p className="text-xs text-gray-500">
                    Upload a CV file or paste text — fields will be auto-filled using AI.
                  </p>

                  {/* File drop zone */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      dragOver ? 'border-[#df2681] bg-pink-50' : 'border-gray-200 hover:border-gray-300'
                    } ${busy ? 'pointer-events-none opacity-50' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 mx-auto mb-1.5 text-gray-400" />
                    <p className="text-xs font-medium text-gray-600">Drop a file or click to browse</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">PDF · DOCX · DOC · RTF · TXT</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.doc,.rtf,.txt"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                    />
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">or paste CV text</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Paste area */}
                  <Textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste CV text here..."
                    className="min-h-[100px] text-xs font-mono resize-y"
                    disabled={busy}
                  />
                  <Button
                    onClick={handlePasteExtract}
                    disabled={pasteText.trim().length < 50 || busy}
                    size="sm"
                    className="w-full gap-1.5 bg-[#1a3668] hover:bg-[#12274d] text-white"
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    Extract Fields from Text
                  </Button>

                  {/* Status */}
                  {busy && (
                    <div className="flex items-center gap-2 text-xs text-[#1a3668]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {importStatus === 'parsing' ? 'Parsing file…' : 'Extracting fields with AI…'}
                    </div>
                  )}
                  {importStatus === 'done' && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Fields populated — review and edit below
                    </div>
                  )}
                  {importStatus === 'error' && (
                    <p className="text-xs text-red-500">{importError}</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Editable form ── */}
            <div className="p-5">
              <Tabs defaultValue="cover">
                <TabsList className="grid grid-cols-4 w-full text-xs">
                  <TabsTrigger value="cover">Cover</TabsTrigger>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="experience">Experience</TabsTrigger>
                  <TabsTrigger value="education">Education</TabsTrigger>
                </TabsList>

                {/* Cover Sheet */}
                <TabsContent value="cover" className="space-y-3 pt-4">
                  <SectionHeading>Consultant</SectionHeading>
                  <Field label="Name"><Input value={data.consultant} onChange={(e) => set('consultant', e.target.value)} /></Field>
                  <Field label="Email"><Input value={data.consultantEmail} onChange={(e) => set('consultantEmail', e.target.value)} /></Field>
                  <Field label="Telephone"><Input value={data.consultantTel} onChange={(e) => set('consultantTel', e.target.value)} /></Field>
                  <Field label="Date Submitted"><Input value={data.dateSubmitted} onChange={(e) => set('dateSubmitted', e.target.value)} /></Field>

                  <SectionHeading>Candidate</SectionHeading>
                  <Field label="Full Name"><Input value={data.candidateName} onChange={(e) => set('candidateName', e.target.value)} /></Field>
                  <Field label="Role Applied For"><Input value={data.roleAppliedFor} onChange={(e) => set('roleAppliedFor', e.target.value)} /></Field>
                  <Field label="Salary / Rate Expectations"><Input value={data.salaryExpectations} onChange={(e) => set('salaryExpectations', e.target.value)} /></Field>
                  <Field label="Notice Period"><Input value={data.noticePeriod} onChange={(e) => set('noticePeriod', e.target.value)} /></Field>
                  <Field label="Location"><Input value={data.location} onChange={(e) => set('location', e.target.value)} /></Field>
                  <Field label="LinkedIn URL"><Input value={data.linkedIn} onChange={(e) => set('linkedIn', e.target.value)} /></Field>

                  <SectionHeading>Executive Summary</SectionHeading>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Cover Page Summary
                    </Label>
                    <p className="text-[10px] text-gray-400">
                      Type rough notes (reasons for leaving, aspirations, achievements) and hit Auto Rewrite — AI will polish them into the Aaron Wallis voice.
                    </p>
                    <Textarea
                      value={data.executiveSummary}
                      onChange={(e) => set('executiveSummary', e.target.value)}
                      className="min-h-[200px] text-xs"
                      placeholder="e.g. Leaving Moody's due to lack of progression. Wants a more entrepreneurial environment. Strong performer — hit 120% quota last year. Loves working with hedge funds and asset managers..."
                      disabled={rewriting}
                    />
                    <Button
                      onClick={handleRewrite}
                      disabled={!data.executiveSummary.trim() || rewriting}
                      size="sm"
                      className="w-full gap-1.5 bg-[#1a3668] hover:bg-[#12274d] text-white"
                    >
                      {rewriting
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Rewriting…</>
                        : <><Wand2 className="h-3.5 w-3.5" /> Auto Rewrite</>}
                    </Button>
                    {rewriteError && <p className="text-xs text-red-500">{rewriteError}</p>}
                  </div>
                </TabsContent>

                {/* Profile & Skills */}
                <TabsContent value="profile" className="space-y-3 pt-4">
                  <SectionHeading>Profile</SectionHeading>
                  <Field label="Profile Statement">
                    <Textarea value={data.profile} onChange={(e) => set('profile', e.target.value)} className="min-h-[160px] text-xs" />
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

                {/* Experience */}
                <TabsContent value="experience" className="space-y-4 pt-4">
                  {data.experience.map((exp, idx) => (
                    <div key={exp.id} className="border border-gray-200 rounded-lg p-3 space-y-2.5 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#1a3668]">{idx + 1}. {exp.company || 'New Role'}</span>
                        <button onClick={() => removeExp(exp.id)} className="text-red-400 hover:text-red-600 p-0.5">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="From"><Input value={exp.dateFrom} onChange={(e) => updateExp(exp.id, 'dateFrom', e.target.value)} className="text-xs h-7" placeholder="Jan 2020" /></Field>
                        <Field label="To"><Input value={exp.dateTo} onChange={(e) => updateExp(exp.id, 'dateTo', e.target.value)} className="text-xs h-7" placeholder="Dec 2022" /></Field>
                      </div>
                      <Field label="Company"><Input value={exp.company} onChange={(e) => updateExp(exp.id, 'company', e.target.value)} className="text-xs h-7" /></Field>
                      <Field label="Job Title"><Input value={exp.role} onChange={(e) => updateExp(exp.id, 'role', e.target.value)} className="text-xs h-7" /></Field>
                      <Field label="Company Description (optional)">
                        <Textarea value={exp.description} onChange={(e) => updateExp(exp.id, 'description', e.target.value)} className="text-xs min-h-[50px]" />
                      </Field>
                      <Field label="Bullet Points (one per line)">
                        <Textarea value={getBullets(exp)} onChange={(e) => updateBullets(exp.id, e.target.value)} className="text-xs min-h-[100px] font-mono" />
                      </Field>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addExp} className="w-full gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add Role
                  </Button>
                </TabsContent>

                {/* Education & Languages */}
                <TabsContent value="education" className="space-y-3 pt-4">
                  <SectionHeading>Qualifications</SectionHeading>
                  <p className="text-xs text-gray-500">One qualification per line</p>
                  <Textarea value={qualsText} onChange={(e) => setQualsText(e.target.value)} className="min-h-[100px] text-xs font-mono" placeholder="BA (Hons) Computer Science  University of Bristol  2010-2013" />

                  <SectionHeading>Languages</SectionHeading>
                  <p className="text-xs text-gray-500">One language per line</p>
                  <Textarea value={langsText} onChange={(e) => setLangsText(e.target.value)} className="min-h-[100px] text-xs font-mono" placeholder="English - Fluent&#10;French - Conversational" />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div className="flex-1 overflow-auto bg-gray-300 p-8">
            <div className="mb-4 text-center">
              <span className="inline-block bg-white/80 text-xs text-gray-500 px-3 py-1 rounded-full shadow-sm">
                Live preview — click &ldquo;Download PDF&rdquo; to export
              </span>
            </div>
            <div style={{ transform: 'scale(0.72)', transformOrigin: 'top center' }}>
              <CvTemplate data={data} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Print-only CV (full fidelity, no scaling) ── */}
      <div id="pdf-capture-wrapper" className="hidden print:block">
        <CvTemplate data={data} printRef={printRef} />
      </div>
    </>
  )
}
