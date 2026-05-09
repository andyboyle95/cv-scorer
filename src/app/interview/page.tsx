'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Button } from '@/ui/button'
import { Textarea } from '@/ui/textarea'
import {
  ArrowLeft,
  Upload,
  ClipboardPaste,
  Loader2,
  CheckCircle2,
  FileDown,
  Sparkles,
  Pencil,
  RefreshCw,
} from 'lucide-react'

interface Question {
  theme: string
  question: string
  followUp: string
  rationale: string
  pageBreakAfter?: boolean
}

function groupByPageBreak(items: Question[]): Question[][] {
  const groups: Question[][] = []
  let current: Question[] = []
  for (const item of items) {
    current.push(item)
    if (item.pageBreakAfter) { groups.push(current); current = [] }
  }
  if (current.length > 0) groups.push(current)
  return groups
}

const DEFAULT_THEMES = [
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

const ADDITIONAL_THEMES = [
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

const QUESTION_COUNTS = [5, 10, 15, 20]

type ImportStatus = 'idle' | 'parsing' | 'done' | 'error'
type Step = 'setup' | 'generating' | 'results'

export default function InterviewPage() {
  const [cvText, setCvText] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle')
  const [importError, setImportError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(DEFAULT_THEMES))
  const [questionCount, setQuestionCount] = useState(10)
  const [step, setStep] = useState<Step>('setup')
  const [questions, setQuestions] = useState<Question[]>([])
  const [candidateName, setCandidateName] = useState('')
  const [generateError, setGenerateError] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Per-question edit / regenerate state
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<Question>({ theme: '', question: '', followUp: '', rationale: '' })
  const [regeneratingIdxs, setRegeneratingIdxs] = useState<Set<number>>(new Set())

  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleTheme = (theme: string) => {
    setSelectedThemes((prev) => {
      const next = new Set(prev)
      if (next.has(theme)) next.delete(theme)
      else next.add(theme)
      return next
    })
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
      setCvText((parsed as { text: string }).text)
      setImportStatus('done')
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

  const handleUsePaste = () => {
    if (pasteText.trim().length >= 50) {
      setCvText(pasteText)
      setPasteText('')
      setImportStatus('done')
    }
  }

  const handleGenerate = async () => {
    if (!cvText.trim() || selectedThemes.size === 0) return
    setStep('generating')
    setGenerateError('')
    try {
      const res = await fetch('/api/generate-interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText,
          themes: Array.from(selectedThemes),
          questionCount,
        }),
      })
      let json: Record<string, unknown>
      try {
        json = await res.json()
      } catch {
        throw new Error(`Server error (${res.status})`)
      }
      if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Generation failed')
      setQuestions((json as { questions: Question[] }).questions ?? [])
      setCandidateName((json as { candidateName?: string }).candidateName ?? '')
      setStep('results')
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed')
      setStep('setup')
    }
  }

  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditDraft({ ...questions[idx] })
  }

  const saveEdit = () => {
    if (editingIdx === null) return
    setQuestions((prev) => prev.map((q, i) => i === editingIdx ? { ...editDraft } : q))
    setEditingIdx(null)
  }

  const regenerateQuestion = async (idx: number) => {
    setRegeneratingIdxs((prev) => new Set([...prev, idx]))
    try {
      const res = await fetch('/api/generate-interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText,
          themes: [questions[idx].theme],
          questionCount: 1,
          avoidQuestion: questions[idx].question,
        }),
      })
      let json: Record<string, unknown>
      try { json = await res.json() } catch { throw new Error(`Server error (${res.status})`) }
      if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Regeneration failed')
      const newQs = (json as { questions: Question[] }).questions
      if (newQs?.[0]) {
        setQuestions((prev) => prev.map((q, i) => i === idx ? { ...newQs[0], theme: q.theme } : q))
      }
    } catch (err) {
      console.error('Regenerate failed:', err)
    } finally {
      setRegeneratingIdxs((prev) => { const s = new Set(prev); s.delete(idx); return s })
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const wrapper = document.getElementById('interview-pdf-wrapper') as HTMLElement
      if (!wrapper) return

      const prev = wrapper.getAttribute('style') ?? ''
      wrapper.style.cssText = 'display:block;position:fixed;left:-10000px;top:0;z-index:-1;'

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      const pages = wrapper.querySelectorAll<HTMLElement>('.iq-pdf-page')
      const pdfWidth = 210
      const pdfHeight = 297
      let pdf: InstanceType<typeof jsPDF> | null = null
      let firstPdfPage = true

      for (let p = 0; p < pages.length; p++) {
        const canvas = await html2canvas(pages[p], {
          scale: 2,
          allowTaint: true,
          useCORS: true,
          logging: false,
        })

        const a4HeightPx = Math.round(canvas.width * (pdfHeight / pdfWidth))
        let yOffset = 0

        while (yOffset < canvas.height) {
          const slicePx = Math.min(a4HeightPx, canvas.height - yOffset)
          const slice = document.createElement('canvas')
          slice.width = canvas.width
          slice.height = a4HeightPx
          const ctx = slice.getContext('2d')!
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, slice.width, slice.height)
          ctx.drawImage(canvas, 0, yOffset, canvas.width, slicePx, 0, 0, canvas.width, slicePx)
          const img = slice.toDataURL('image/jpeg', 0.95)
          if (firstPdfPage) {
            pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
            firstPdfPage = false
          } else {
            pdf!.addPage('a4', 'p')
          }
          pdf!.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight)
          yOffset += a4HeightPx
        }
      }

      wrapper.setAttribute('style', prev)

      const slug = (candidateName || 'interview-questions')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      pdf!.save(`${slug}-interview-questions.pdf`)
    } catch (err) {
      console.error('PDF download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  // ── Generating ──────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
        <Header title="Interview Question Generator" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-[#1a3668] mx-auto" />
            <p className="text-lg font-semibold text-[#1a3668]">Generating interview questions…</p>
            <p className="text-sm text-gray-500">Analysing CV and crafting tailored questions</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Results ─────────────────────────────────────────────────────
  if (step === 'results') {
    return (
      <>
        <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
          <Header title="Interview Question Generator" />

          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
            <button
              onClick={() => setStep('setup')}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1a3668]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to setup
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#1a3668]">
                {candidateName || 'Interview Questions'}
              </p>
              <p className="text-xs text-gray-400">{questions.length} questions generated</p>
            </div>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="bg-[#df2681] hover:bg-[#c01f6e] text-white gap-2"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating PDF…
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" /> Download PDF
                </>
              )}
            </Button>
          </div>

          {/* Questions list */}
          <div className="flex-1 overflow-auto px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {questions.map((q, i) =>
                editingIdx === i ? (
                  // ── Edit mode ──────────────────────────────────────────
                  <div key={i} className="bg-white rounded-xl border-2 shadow-sm p-5 space-y-3" style={{ borderColor: '#1a3668' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#1a3668] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Theme</span>
                    </div>
                    <div>
                      <select
                        value={editDraft.theme}
                        onChange={(e) => setEditDraft((d) => ({ ...d, theme: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1a3668] cursor-pointer"
                      >
                        <optgroup label="Default themes">
                          {DEFAULT_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </optgroup>
                        <optgroup label="Additional themes">
                          {ADDITIONAL_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Question</p>
                      <Textarea
                        value={editDraft.question}
                        onChange={(e) => setEditDraft((d) => ({ ...d, question: e.target.value }))}
                        className="text-sm min-h-[80px] resize-y"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Follow-up probe</p>
                      <Textarea
                        value={editDraft.followUp}
                        onChange={(e) => setEditDraft((d) => ({ ...d, followUp: e.target.value }))}
                        className="text-sm min-h-[60px] resize-y"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} className="bg-[#1a3668] hover:bg-[#12274d] text-white">
                        Save changes
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingIdx(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // ── View mode ───────────────────────────────────────────
                  <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#1a3668] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: '#eef1f7', color: '#1a3668' }}>
                            {q.theme}
                          </span>
                          <div className="flex gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => startEdit(i)}
                              title="Edit question"
                              className="p-1.5 rounded text-gray-400 hover:text-[#1a3668] hover:bg-gray-100 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => regenerateQuestion(i)}
                              disabled={regeneratingIdxs.has(i)}
                              title="Regenerate with AI"
                              className="p-1.5 rounded text-gray-400 hover:text-[#df2681] hover:bg-gray-100 transition-colors disabled:opacity-40"
                            >
                              {regeneratingIdxs.has(i)
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <RefreshCw className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 leading-relaxed">{q.question}</p>
                      </div>
                    </div>
                    <div className="pl-10 space-y-2">
                      <div className="rounded-lg p-3" style={{ background: '#f8f9fc', borderLeft: '2px solid #1a3668' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: '#1a3668' }}>Follow-up probe</p>
                        <p className="text-xs text-gray-700">{q.followUp}</p>
                      </div>
                      {q.rationale && (
                        <p className="text-[10px] text-gray-400 italic">{q.rationale}</p>
                      )}
                    </div>
                    {i < questions.length - 1 && (
                      <div className="pt-2 border-t border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={q.pageBreakAfter ?? false}
                            onChange={(e) => setQuestions((prev) =>
                              prev.map((item, idx) => idx === i ? { ...item, pageBreakAfter: e.target.checked } : item)
                            )}
                            className="w-3.5 h-3.5 rounded flex-shrink-0"
                            style={{ accentColor: '#1a3668' }}
                          />
                          <span className="text-[10px] text-gray-400 group-hover:text-gray-600">
                            Start next question on a new page
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Hidden PDF capture div — split into .iq-pdf-page sections at page breaks */}
        <div id="interview-pdf-wrapper" style={{ display: 'none', fontFamily: 'Arial, Helvetica, sans-serif' }}>
          {groupByPageBreak(questions).map((group, gIdx, allGroups) => {
            const isFirst = gIdx === 0
            const isLast = gIdx === allGroups.length - 1
            // running question number offset for this group
            const qOffset = allGroups.slice(0, gIdx).reduce((sum, g) => sum + g.length, 0)
            return (
              <div
                key={gIdx}
                className="iq-pdf-page"
                style={{ width: '210mm', minHeight: '297mm', background: '#ffffff', padding: '0 14mm 10mm' }}
              >
                {/* Brand strip */}
                <div style={{ margin: '0 -14mm' }}>
                  <div style={{ background: '#1a3668', height: '10mm' }} />
                  <div style={{ background: '#df2681', height: '3px' }} />
                </div>

                <div style={{ paddingTop: '6mm' }}>
                  {/* Header row — every page */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5mm' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/aaron-wallis-logo.png"
                      alt="Aaron Wallis"
                      style={{ height: '32px', width: 'auto' }}
                      crossOrigin="anonymous"
                    />
                    <div style={{ textAlign: 'right', fontSize: '9px', color: '#1a3668', lineHeight: '1.5' }}>
                      <p style={{ fontWeight: 'bold', margin: 0 }}>Competency Based Interview Questions</p>
                      <p style={{ margin: 0 }}>Prepared by Aaron Wallis Sales Recruitment</p>
                      {isFirst && <p style={{ margin: 0 }}>{new Date().toLocaleDateString('en-GB')}</p>}
                    </div>
                  </div>

                  {/* Candidate name — first page only */}
                  {isFirst && candidateName && (
                    <h1 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1a3668', textAlign: 'center', margin: '0 0 5mm 0', paddingBottom: '3mm', borderBottom: '2px solid #1a3668' }}>
                      {candidateName}
                    </h1>
                  )}

                  {/* Questions for this group */}
                  {group.map((q, i) => (
                    <div key={i} style={{ borderLeft: '3px solid #1a3668', paddingLeft: '4mm', marginBottom: '5mm' }}>
                      <p style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#1a3668', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2mm 0' }}>
                        {qOffset + i + 1}.&nbsp;&nbsp;{q.theme}
                      </p>
                      <p style={{ fontSize: '10px', fontWeight: '600', color: '#111827', margin: '0 0 2.5mm 0', lineHeight: '1.45' }}>
                        {q.question}
                      </p>
                      <div style={{ background: '#f0f2f5', padding: '2mm 3mm', marginBottom: '1.5mm' }}>
                        <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#1a3668', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Follow-up: </span>
                        <span style={{ fontSize: '9px', color: '#374151', lineHeight: '1.4' }}>{q.followUp}</span>
                      </div>
                      {q.rationale && (
                        <p style={{ fontSize: '7.5px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
                          {q.rationale}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Footer — last page only */}
                  {isLast && (
                    <div style={{ marginTop: '6mm', paddingTop: '3mm', borderTop: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '7.5px', color: '#9ca3af', margin: 0, lineHeight: '1.4' }}>
                        Aaron Wallis and Aaron Wallis Sales Recruitment are trading names of Aaron Wallis Recruitment and Training Limited (Registered in the UK, No. 6356563). All candidate information provided is confidential and protected under current Data Protection Laws.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // ── Setup ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      <Header title="Interview Question Generator" />

      {/* Back nav */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center shadow-sm">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1a3668]">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
      </div>

      <div className="flex-1 overflow-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Step 1 — CV Upload */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-[#1a3668] mb-4 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#1a3668] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                1
              </span>
              Upload Candidate CV
            </h2>

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-3 ${
                dragOver ? 'border-[#df2681] bg-pink-50' : 'border-gray-200 hover:border-gray-300'
              } ${importStatus === 'parsing' ? 'pointer-events-none opacity-50' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {importStatus === 'parsing' ? (
                <>
                  <Loader2 className="h-6 w-6 mx-auto mb-2 text-[#1a3668] animate-spin" />
                  <p className="text-xs text-[#1a3668] font-medium">Parsing file…</p>
                </>
              ) : importStatus === 'done' && cvText ? (
                <>
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-xs text-green-600 font-medium">CV loaded — ready to generate</p>
                  <p className="text-[10px] text-gray-400 mt-1">Click or drop to replace</p>
                </>
              ) : (
                <>
                  <Upload className="h-7 w-7 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">Drop a file or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">PDF · DOCX · DOC · RTF · TXT</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.rtf,.txt"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>

            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">or paste CV text</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste candidate CV text here…"
              className="min-h-[100px] text-xs font-mono resize-y mb-2"
            />
            <Button
              onClick={handleUsePaste}
              disabled={pasteText.trim().length < 50}
              size="sm"
              className="w-full gap-1.5 bg-[#1a3668] hover:bg-[#12274d] text-white"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Use Pasted Text
            </Button>

            {importStatus === 'error' && (
              <p className="text-xs text-red-500 mt-2">{importError}</p>
            )}
          </div>

          {/* Step 2 — Question count */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-[#1a3668] mb-4 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#1a3668] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                2
              </span>
              Number of Questions
            </h2>
            <div className="flex gap-3">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                    questionCount === n
                      ? 'bg-[#1a3668] text-white border-[#1a3668]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a3668]/40'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3 — Themes */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-[#1a3668] mb-1 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#1a3668] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                3
              </span>
              Competency Themes
            </h2>
            <p className="text-xs text-gray-500 mb-5 ml-8">
              {selectedThemes.size} selected — AI picks the most relevant for this candidate
            </p>

            <div className="mb-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Default themes
              </p>
              <div className="space-y-2">
                {DEFAULT_THEMES.map((theme) => (
                  <label key={theme} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedThemes.has(theme)}
                      onChange={() => toggleTheme(theme)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: '#1a3668' }}
                    />
                    <span className="text-sm text-gray-700 group-hover:text-[#1a3668] transition-colors">
                      {theme}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Additional themes
              </p>
              <div className="space-y-2">
                {ADDITIONAL_THEMES.map((theme) => (
                  <label key={theme} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedThemes.has(theme)}
                      onChange={() => toggleTheme(theme)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: '#1a3668' }}
                    />
                    <span className="text-sm text-gray-700 group-hover:text-[#1a3668] transition-colors">
                      {theme}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Generate */}
          {generateError && (
            <p className="text-sm text-red-500 text-center">{generateError}</p>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!cvText.trim() || selectedThemes.size === 0}
            className="w-full bg-[#df2681] hover:bg-[#c01f6e] text-white h-12 text-base font-semibold gap-2 rounded-xl shadow-sm"
          >
            <Sparkles className="h-5 w-5" />
            Generate Interview Questions
          </Button>

          {!cvText.trim() && (
            <p className="text-xs text-gray-400 text-center -mt-2">
              Upload or paste a CV above to get started
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
