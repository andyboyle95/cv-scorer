'use client'

import { useState, useRef, useCallback, Fragment } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { CvTemplate, CandidateData, ExperienceEntry } from '@/components/cv-template'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
import { Label } from '@/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import { Plus, Trash2, FileDown, ArrowLeft, Upload, ClipboardPaste, Loader2, CheckCircle2, ChevronDown, ChevronUp, Wand2, Sparkles, Pencil, RefreshCw, Target, X } from 'lucide-react'
import Image from 'next/image'

interface InterviewQuestion {
  theme: string
  question: string
  followUp: string
  rationale: string
  pageBreakAfter?: boolean
}

function groupIqByPageBreak(items: InterviewQuestion[]): InterviewQuestion[][] {
  const groups: InterviewQuestion[][] = []
  let current: InterviewQuestion[] = []
  for (const item of items) {
    current.push(item)
    if (item.pageBreakAfter) { groups.push(current); current = [] }
  }
  if (current.length > 0) groups.push(current)
  return groups
}

const IQ_DEFAULT_THEMES = [
  'Sales Ability & Commercial Acumen',
  'Communication & Presentation Skills',
  'Client Relationship Management',
  'Negotiation & Influencing',
  'Target & Results Orientation',
  'Leadership & People Management',
  'Problem Solving & Critical Thinking',
  'Resilience & Handling Rejection',
  'Planning & Organisation',
  'Customer Focus',
  'Teamwork & Collaboration',
  'Adaptability & Change',
  'Strategic Thinking',
]

const IQ_ADDITIONAL_THEMES = [
  'Innovation & Creativity',
  'Coaching & Developing Others',
  'Data Analysis & Decision Making',
  'Digital Literacy & Technology Adoption',
  'Cross-functional Collaboration',
  'Values & Cultural Fit',
  'Risk Awareness & Management',
  'Business Development & New Business',
  'Emotional Intelligence',
  'Time Management & Prioritisation',
]

function buildCvText(data: CandidateData): string {
  const parts: string[] = []
  if (data.candidateName) parts.push(data.candidateName)
  if (data.roleAppliedFor) parts.push(`Role applied for: ${data.roleAppliedFor}`)
  if (data.profile) parts.push(`\nProfile\n${data.profile}`)
  const skills = data.skills.filter(Boolean)
  if (skills.length) parts.push(`\nSkills\n${skills.join(', ')}`)
  for (const exp of data.experience.filter(e => e.company || e.role)) {
    parts.push(`\n${exp.company} — ${exp.role} (${[exp.dateFrom, exp.dateTo].filter(Boolean).join(' - ')})`)
    if (exp.description) parts.push(exp.description)
    for (const b of exp.bullets.filter(Boolean)) parts.push(`• ${b}`)
  }
  const quals = data.qualifications.filter(Boolean)
  if (quals.length) parts.push(`\nQualifications\n${quals.join('\n')}`)
  return parts.join('\n')
}

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

  // Job-spec tailoring state (used by Auto Rewrite on the Cover tab)
  const [jobSpecOpen, setJobSpecOpen] = useState(false)
  const [jobSpecText, setJobSpecText] = useState('')
  const [jobSpecFileName, setJobSpecFileName] = useState('')
  const [jobSpecStatus, setJobSpecStatus] = useState<'idle' | 'parsing' | 'ready' | 'error'>('idle')
  const [jobSpecError, setJobSpecError] = useState('')
  const [jobSpecDragOver, setJobSpecDragOver] = useState(false)
  const jobSpecFileInputRef = useRef<HTMLInputElement>(null)

  // Interview questions state
  const [interviewEnabled, setInterviewEnabled] = useState(false)
  const [interviewCount, setInterviewCount] = useState(10)
  const [interviewThemes, setInterviewThemes] = useState<Set<string>>(new Set(IQ_DEFAULT_THEMES))
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([])
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [questionGenError, setQuestionGenError] = useState('')

  // Per-question edit / regenerate state (interview tab)
  const [iqEditingIdx, setIqEditingIdx] = useState<number | null>(null)
  const [iqEditDraft, setIqEditDraft] = useState<InterviewQuestion>({ theme: '', question: '', followUp: '', rationale: '' })
  const [iqRegeneratingIdxs, setIqRegeneratingIdxs] = useState<Set<number>>(new Set())

  // Profile & Skills tailoring state
  const [tailoringProfile, setTailoringProfile] = useState(false)
  const [tailorError, setTailorError] = useState('')
  const [addedSkills, setAddedSkills] = useState<string[]>([])

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
          jobSpec: jobSpecText.trim() || undefined,
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

  // ── Tailor profile & skills to job spec ──────────────────────

  const handleTailorProfileSkills = async () => {
    if (!jobSpecText.trim()) return
    setTailoringProfile(true)
    setTailorError('')
    try {
      const res = await fetch('/api/tailor-profile-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: data.profile,
          skills: data.skills.filter(Boolean),
          experience: data.experience.map((e) => ({
            company: e.company,
            role: e.role,
            description: e.description,
            bullets: e.bullets.filter(Boolean),
          })),
          jobSpec: jobSpecText,
          candidateName: data.candidateName,
          roleAppliedFor: data.roleAppliedFor,
        }),
      })
      let json: Record<string, unknown>
      try { json = await res.json() } catch { throw new Error(`Server error (${res.status})`) }
      if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Tailoring failed')
      const out = json as { profile: string; skills: string[]; addedSkills: string[] }
      setData((prev) => ({
        ...prev,
        profile: out.profile || prev.profile,
        skills: out.skills?.length ? out.skills : prev.skills,
      }))
      setAddedSkills(out.addedSkills || [])
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : 'Tailoring failed')
    } finally {
      setTailoringProfile(false)
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

  // ── Job spec (Auto Rewrite tailoring) ─────────────────────────
  const handleJobSpecFile = async (file: File) => {
    setJobSpecStatus('parsing')
    setJobSpecError('')
    setJobSpecFileName(file.name)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-cv', { method: 'POST', body: formData })
      let parsed: Record<string, unknown>
      try { parsed = await res.json() } catch { throw new Error(`File parse failed (${res.status})`) }
      if (!res.ok) throw new Error((parsed as { error?: string }).error ?? 'Failed to parse file')
      const { text } = parsed as { text: string }
      setJobSpecText(text.trim())
      setJobSpecStatus('ready')
    } catch (err) {
      setJobSpecError(err instanceof Error ? err.message : 'File parsing failed')
      setJobSpecStatus('error')
    }
  }

  const handleJobSpecDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setJobSpecDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleJobSpecFile(file)
  }

  const clearJobSpec = () => {
    setJobSpecText('')
    setJobSpecFileName('')
    setJobSpecStatus('idle')
    setJobSpecError('')
  }

  // ── Experience helpers ──
  const updateExp = (id: string, field: keyof ExperienceEntry, value: string | string[] | boolean) => {
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

  const toggleInterviewTheme = (theme: string) => {
    setInterviewThemes((prev) => {
      const next = new Set(prev)
      if (next.has(theme)) next.delete(theme)
      else next.add(theme)
      return next
    })
  }

  const handleGenerateQuestions = async () => {
    if (interviewThemes.size === 0) return
    setGeneratingQuestions(true)
    setQuestionGenError('')
    try {
      const cvText = buildCvText(data)
      const res = await fetch('/api/generate-interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText,
          themes: Array.from(interviewThemes),
          questionCount: interviewCount,
        }),
      })
      let json: Record<string, unknown>
      try { json = await res.json() } catch { throw new Error(`Server error (${res.status})`) }
      if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Generation failed')
      setInterviewQuestions((json as { questions: InterviewQuestion[] }).questions ?? [])
      setInterviewEnabled(true)
    } catch (err) {
      setQuestionGenError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGeneratingQuestions(false)
    }
  }

  const iqStartEdit = (idx: number) => {
    setIqEditingIdx(idx)
    setIqEditDraft({ ...interviewQuestions[idx] })
  }

  const iqSaveEdit = () => {
    if (iqEditingIdx === null) return
    setInterviewQuestions((prev) => prev.map((q, i) => i === iqEditingIdx ? { ...iqEditDraft } : q))
    setIqEditingIdx(null)
  }

  const iqRegenerateQuestion = async (idx: number) => {
    setIqRegeneratingIdxs((prev) => new Set([...prev, idx]))
    try {
      const cvText = buildCvText(data)
      const res = await fetch('/api/generate-interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText,
          themes: [interviewQuestions[idx].theme],
          questionCount: 1,
          avoidQuestion: interviewQuestions[idx].question,
        }),
      })
      let json: Record<string, unknown>
      try { json = await res.json() } catch { throw new Error(`Server error (${res.status})`) }
      if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Regeneration failed')
      const newQs = (json as { questions: InterviewQuestion[] }).questions
      if (newQs?.[0]) {
        setInterviewQuestions((prev) => prev.map((q, i) => i === idx ? { ...newQs[0], theme: q.theme } : q))
      }
    } catch (err) {
      console.error('Regenerate failed:', err)
    } finally {
      setIqRegeneratingIdxs((prev) => { const s = new Set(prev); s.delete(idx); return s })
    }
  }

  const iqTogglePageBreak = (idx: number) => {
    setInterviewQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, pageBreakAfter: !q.pageBreakAfter } : q))
  }

  const renderIqPages = (showPageCutLine = false) => {
    if (!interviewQuestions.length) return null
    const groups = groupIqByPageBreak(interviewQuestions)
    let qOffset = 0
    return groups.map((group, gIdx) => {
      const isFirst = gIdx === 0
      const isLast = gIdx === groups.length - 1
      const startNum = qOffset
      qOffset += group.length
      return (
        <div key={gIdx} className="cv-page bg-white shadow-md rounded mx-auto mt-4 print:mt-0"
          style={{ width: '210mm', minHeight: '297mm', padding: '0 14mm 10mm', fontFamily: 'Arial, Helvetica, sans-serif', position: 'relative' }}>

          {/* A4 page-cut guide — preview only, not captured into PDF */}
          {showPageCutLine && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: '297mm', borderTop: '2px dashed rgba(239,68,68,0.55)', pointerEvents: 'none', zIndex: 10 }}>
              <span style={{ position: 'absolute', right: '14mm', top: '-11px', fontSize: '8px', color: 'rgba(239,68,68,0.75)', background: 'white', padding: '0 5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ✂ page cut
              </span>
            </div>
          )}

          {/* Brand strip */}
          <div style={{ margin: '0 -14mm' }}>
            <div style={{ background: '#1a3668', height: '7mm' }} />
            <div style={{ background: '#df2681', height: '2.5px' }} />
          </div>

          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '4mm', marginBottom: '4mm', paddingBottom: '2mm', borderBottom: '2px solid #1a3668' }}>
            <Image
              src="/aaron-wallis-logo.png"
              alt="Aaron Wallis"
              width={130}
              height={42}
              style={{ height: '10mm', width: 'auto', objectFit: 'contain' }}
              unoptimized
            />
            <span style={{ color: '#df2681', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Aaron Wallis Sales Recruitment
            </span>
          </div>

          {/* Title — first page only */}
          {isFirst && (
            <>
              <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: '#1a3668', margin: '0 0 1mm 0' }}>
                Competency Based Interview Questions
              </h2>
              {data.candidateName && (
                <p style={{ textAlign: 'center', fontSize: '10.5px', color: '#555', margin: '0 0 5mm 0' }}>{data.candidateName}</p>
              )}
            </>
          )}

          {/* Questions */}
          <div>
            {group.map((q, i) => (
              <div key={i} style={{ borderLeft: '3px solid #1a3668', paddingLeft: '4mm', marginBottom: '4mm' }}>
                <p style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#1a3668', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2mm 0' }}>
                  {startNum + i + 1}.&nbsp;&nbsp;{q.theme}
                </p>
                <p style={{ fontSize: '10px', fontWeight: '600', color: '#111827', margin: '0 0 2mm 0', lineHeight: '1.4' }}>
                  {q.question}
                </p>
                <div style={{ background: '#f0f2f5', padding: '2mm 3mm', marginBottom: '1.5mm' }}>
                  <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#1a3668', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Follow-up: </span>
                  <span style={{ fontSize: '9px', color: '#374151', lineHeight: '1.35' }}>{q.followUp}</span>
                </div>
                {q.rationale && (
                  <p style={{ fontSize: '7.5px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
                    {q.rationale}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Footer — last page only */}
          {isLast && (
            <div style={{ marginTop: '6mm', paddingTop: '3mm', borderTop: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '8px', color: '#9ca3af', lineHeight: '1.4', margin: 0 }}>
                Aaron Wallis and Aaron Wallis Sales Recruitment are trading names of Aaron Wallis Recruitment and Training Limited (Registered in the UK, No. 6356563). All candidate information provided is confidential and protected under current Data Protection Laws.
              </p>
            </div>
          )}
        </div>
      )
    })
  }

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
                <TabsList className="grid grid-cols-5 w-full text-[10px]">
                  <TabsTrigger value="cover">Cover</TabsTrigger>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="experience">Experience</TabsTrigger>
                  <TabsTrigger value="education">Education</TabsTrigger>
                  <TabsTrigger value="interview">Interview Qs</TabsTrigger>
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

                  {/* Tailor-to-job-spec panel (optional) */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setJobSpecOpen((o) => !o)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#1a3668] hover:bg-white/60 rounded-lg"
                    >
                      <span className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" />
                        Tailor to Job Spec
                        <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Optional</span>
                        {jobSpecStatus === 'ready' && (
                          <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Attached
                          </span>
                        )}
                      </span>
                      {jobSpecOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {jobSpecOpen && (
                      <div className="px-3 pb-3 space-y-2">
                        <p className="text-[10px] text-gray-500">
                          Upload or paste a job advert / spec. Auto Rewrite will emphasise the parts of the candidate&rsquo;s background that match the role&rsquo;s requirements — without inventing anything.
                        </p>

                        {/* File drop */}
                        <div
                          className={`border-2 border-dashed rounded-md p-3 text-center cursor-pointer transition-colors ${
                            jobSpecDragOver ? 'border-[#df2681] bg-pink-50' : 'border-gray-200 bg-white hover:border-gray-300'
                          } ${jobSpecStatus === 'parsing' ? 'pointer-events-none opacity-50' : ''}`}
                          onDragOver={(e) => { e.preventDefault(); setJobSpecDragOver(true) }}
                          onDragLeave={() => setJobSpecDragOver(false)}
                          onDrop={handleJobSpecDrop}
                          onClick={() => jobSpecFileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mx-auto mb-1 text-gray-400" />
                          <p className="text-[11px] font-medium text-gray-600">Drop a file or click to browse</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">PDF · DOCX · DOC · RTF · TXT</p>
                          <input
                            ref={jobSpecFileInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.docx,.doc,.rtf,.txt"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleJobSpecFile(f) }}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-[9px] text-gray-400 uppercase tracking-wide">or paste</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        <Textarea
                          value={jobSpecText}
                          onChange={(e) => {
                            setJobSpecText(e.target.value)
                            setJobSpecFileName('')
                            setJobSpecStatus(e.target.value.trim() ? 'ready' : 'idle')
                          }}
                          placeholder="Paste the job advert or job spec here..."
                          className="min-h-[90px] text-[11px] font-mono resize-y bg-white"
                          disabled={jobSpecStatus === 'parsing'}
                        />

                        {jobSpecStatus === 'parsing' && (
                          <div className="flex items-center gap-2 text-[11px] text-[#1a3668]">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Parsing file…
                          </div>
                        )}
                        {jobSpecStatus === 'ready' && (
                          <div className="flex items-center justify-between gap-2 text-[11px] text-green-600">
                            <span className="flex items-center gap-1.5 min-w-0">
                              <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {jobSpecFileName || `${jobSpecText.trim().length.toLocaleString()} chars ready`}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={clearJobSpec}
                              className="flex items-center gap-0.5 text-gray-400 hover:text-red-500 flex-shrink-0"
                              title="Remove job spec"
                            >
                              <X className="h-3 w-3" />
                              Clear
                            </button>
                          </div>
                        )}
                        {jobSpecStatus === 'error' && (
                          <p className="text-[11px] text-red-500">{jobSpecError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Cover Page Summary
                    </Label>
                    <p className="text-[10px] text-gray-400">
                      Type rough notes (reasons for leaving, aspirations, achievements) and hit Auto Rewrite — AI will polish them into the Aaron Wallis voice{jobSpecStatus === 'ready' ? ', tailored to the attached job spec' : ''}.
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
                        : <><Wand2 className="h-3.5 w-3.5" /> {jobSpecStatus === 'ready' ? 'Auto Rewrite (tailored)' : 'Auto Rewrite'}</>}
                    </Button>
                    {rewriteError && <p className="text-xs text-red-500">{rewriteError}</p>}
                  </div>
                </TabsContent>

                {/* Profile & Skills */}
                <TabsContent value="profile" className="space-y-3 pt-4">
                  {/* Tailor Profile & Skills to Job Spec */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1a3668]">
                      <Target className="h-3.5 w-3.5" />
                      Tailor Profile &amp; Skills to Job Spec
                      {jobSpecStatus === 'ready' && (
                        <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Attached
                        </span>
                      )}
                    </div>

                    {jobSpecStatus === 'ready' ? (
                      <p className="text-[10px] text-gray-500">
                        Rewrites the Profile paragraph and reorders Skills to lead with matches. Only uses claims already evidenced in your CV — nothing is fabricated. Any new skills the AI adds are shown for you to review.
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-500">
                        Attach a job advert on the <strong>Cover</strong> tab (under Executive Summary) first — then come back here to tailor the profile and skills to it.
                      </p>
                    )}

                    <Button
                      onClick={handleTailorProfileSkills}
                      disabled={tailoringProfile || jobSpecStatus !== 'ready'}
                      size="sm"
                      className="w-full gap-1.5 bg-[#1a3668] hover:bg-[#12274d] text-white"
                    >
                      {tailoringProfile
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Tailoring…</>
                        : <><Wand2 className="h-3.5 w-3.5" /> Tailor Profile &amp; Skills</>}
                    </Button>
                    {tailorError && <p className="text-[11px] text-red-500">{tailorError}</p>}
                    {addedSkills.length > 0 && (
                      <div className="rounded border border-amber-200 bg-amber-50 p-2 space-y-1">
                        <p className="text-[10px] font-semibold text-amber-800">
                          {addedSkills.length} new skill{addedSkills.length === 1 ? '' : 's'} suggested — review before exporting
                        </p>
                        <ul className="text-[11px] text-amber-900 space-y-0.5">
                          {addedSkills.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                        <button
                          type="button"
                          onClick={() => setAddedSkills([])}
                          className="text-[10px] text-amber-700 hover:text-amber-900 underline"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>

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
                      <div className="pt-2 border-t border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={exp.pageBreakAfter ?? false}
                            onChange={(e) => updateExp(exp.id, 'pageBreakAfter', e.target.checked)}
                            className="w-3.5 h-3.5 rounded flex-shrink-0"
                            style={{ accentColor: '#1a3668' }}
                          />
                          <span className="text-[10px] text-gray-500 group-hover:text-[#1a3668]">
                            Start next role on a new page
                          </span>
                        </label>
                      </div>
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

                {/* Interview Questions */}
                <TabsContent value="interview" className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <SectionHeading>Interview Questions</SectionHeading>
                    <label className="flex items-center gap-2 cursor-pointer mb-1">
                      <input
                        type="checkbox"
                        checked={interviewEnabled}
                        onChange={(e) => setInterviewEnabled(e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#1a3668' }}
                      />
                      <span className="text-xs text-gray-600 font-medium">Include in PDF</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 -mt-2">
                    Generate competency-based questions tailored to this candidate and append them to the exported PDF.
                  </p>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Number of Questions</Label>
                    <div className="flex gap-2">
                      {[5, 10, 15, 20].map((n) => (
                        <button
                          key={n}
                          onClick={() => setInterviewCount(n)}
                          className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                            interviewCount === n
                              ? 'bg-[#1a3668] text-white border-[#1a3668]'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a3668]/40'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Default themes</p>
                    {IQ_DEFAULT_THEMES.map((theme) => (
                      <label key={theme} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={interviewThemes.has(theme)}
                          onChange={() => toggleInterviewTheme(theme)}
                          className="w-3.5 h-3.5 rounded flex-shrink-0"
                          style={{ accentColor: '#1a3668' }}
                        />
                        <span className="text-xs text-gray-700 group-hover:text-[#1a3668] transition-colors">{theme}</span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Additional themes</p>
                    {IQ_ADDITIONAL_THEMES.map((theme) => (
                      <label key={theme} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={interviewThemes.has(theme)}
                          onChange={() => toggleInterviewTheme(theme)}
                          className="w-3.5 h-3.5 rounded flex-shrink-0"
                          style={{ accentColor: '#1a3668' }}
                        />
                        <span className="text-xs text-gray-700 group-hover:text-[#1a3668] transition-colors">{theme}</span>
                      </label>
                    ))}
                  </div>

                  <Button
                    onClick={handleGenerateQuestions}
                    disabled={generatingQuestions || interviewThemes.size === 0}
                    size="sm"
                    className="w-full gap-1.5 bg-[#1a3668] hover:bg-[#12274d] text-white"
                  >
                    {generatingQuestions ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5" /> Generate Questions</>
                    )}
                  </Button>
                  {questionGenError && <p className="text-xs text-red-500">{questionGenError}</p>}

                  {interviewQuestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {interviewQuestions.length} questions ready
                        {interviewEnabled
                          ? ' — will be included in PDF'
                          : ' — tick "Include in PDF" above to add'}
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {interviewQuestions.map((q, i) => (
                          <Fragment key={i}>
                            {iqEditingIdx === i ? (
                              // ── Edit mode (compact) ──
                              <div className="bg-white rounded-lg border-2 p-3 space-y-2" style={{ borderColor: '#1a3668' }}>
                                <p className="text-[10px] font-bold" style={{ color: '#1a3668' }}>Q{i + 1} · {q.theme}</p>
                                <div>
                                  <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Question</p>
                                  <Textarea
                                    value={iqEditDraft.question}
                                    onChange={(e) => setIqEditDraft((d) => ({ ...d, question: e.target.value }))}
                                    className="text-xs min-h-[60px] resize-y"
                                  />
                                </div>
                                <div>
                                  <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Follow-up</p>
                                  <Textarea
                                    value={iqEditDraft.followUp}
                                    onChange={(e) => setIqEditDraft((d) => ({ ...d, followUp: e.target.value }))}
                                    className="text-xs min-h-[40px] resize-y"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={iqSaveEdit} className="text-[10px] h-7 px-2 bg-[#1a3668] hover:bg-[#12274d] text-white">Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => setIqEditingIdx(null)} className="text-[10px] h-7 px-2">Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              // ── View mode (compact) ──
                              <div className="bg-gray-50 rounded-lg border border-gray-100 p-2.5">
                                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                  <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#1a3668' }}>{q.theme}</span>
                                  <div className="flex gap-0.5 flex-shrink-0">
                                    <button
                                      onClick={() => iqStartEdit(i)}
                                      title="Edit"
                                      className="p-1 rounded text-gray-400 hover:text-[#1a3668] hover:bg-white transition-colors"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => iqRegenerateQuestion(i)}
                                      disabled={iqRegeneratingIdxs.has(i)}
                                      title="Regenerate with AI"
                                      className="p-1 rounded text-gray-400 hover:text-[#df2681] hover:bg-white transition-colors disabled:opacity-40"
                                    >
                                      {iqRegeneratingIdxs.has(i)
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <RefreshCw className="h-3 w-3" />}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[10px] text-gray-800 leading-relaxed font-medium">{q.question}</p>
                                <p className="text-[9px] text-gray-400 mt-1.5 leading-relaxed">
                                  <span className="font-semibold" style={{ color: '#1a3668' }}>↳ </span>{q.followUp}
                                </p>
                                {i < interviewQuestions.length - 1 && (
                                  <label className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-gray-200 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!q.pageBreakAfter}
                                      onChange={() => iqTogglePageBreak(i)}
                                      className="h-2.5 w-2.5 flex-shrink-0"
                                      style={{ accentColor: '#1a3668' }}
                                    />
                                    <span className="text-[9px] text-gray-400 hover:text-[#1a3668]">Start next question on a new page</span>
                                  </label>
                                )}
                              </div>
                            )}
                            {q.pageBreakAfter && i < interviewQuestions.length - 1 && (
                              <div className="flex items-center gap-2 py-0.5">
                                <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: '#1a3668', opacity: 0.35 }} />
                                <span className="text-[8px] font-bold uppercase tracking-widest px-1" style={{ color: '#1a3668', opacity: 0.5 }}>Page break</span>
                                <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: '#1a3668', opacity: 0.35 }} />
                              </div>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  )}
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
              {interviewEnabled && renderIqPages(true)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Print-only CV (full fidelity, no scaling) ── */}
      <div id="pdf-capture-wrapper" className="hidden print:block">
        <CvTemplate data={data} printRef={printRef} />

        {/* Interview questions pages — rendered via shared renderIqPages() */}
        {interviewEnabled && renderIqPages()}
      </div>
    </>
  )
}
