'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import {
  getSchedule,
  pauseSchedule,
  resumeSchedule,
  triggerScheduleNow,
  cronToHuman,
} from '@/lib/scheduler'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

import { HiOutlineChartBar, HiOutlineNewspaper, HiOutlineCog } from 'react-icons/hi'
import { HiArrowTrendingUp, HiArrowTrendingDown, HiCheck, HiXMark, HiOutlinePhoto } from 'react-icons/hi2'
import {
  FiHome,
  FiSend,
  FiRefreshCw,
  FiImage,
  FiMail,
  FiClock,
  FiPlay,
  FiPause,
  FiZap,
  FiPlus,
  FiExternalLink,
  FiX,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiLoader,
  FiActivity,
  FiEdit3,
  FiSave,
} from 'react-icons/fi'
import {
  RiRobot2Line,
  RiPaletteLine,
  RiMailSendLine,
  RiCalendarScheduleLine,
  RiGoogleLine,
} from 'react-icons/ri'

// ============================================================================
// CONSTANTS
// ============================================================================

const AGENT_IDS = {
  orchestrator: '699313373f10687c1b733643',
  visual: '6993135225f124ed75877416',
  delivery: '699313531642f60bc66327f6',
}

const SCHEDULE_IDS = {
  orchestrator: '69931361399dfadeac37756a',
  visual: '69931361399dfadeac37756b',
  delivery: '69931361399dfadeac37756c',
}

const GOLD = 'hsl(40, 50%, 55%)'
const GOLD_DIM = 'hsl(40, 30%, 40%)'
const CHART_GOLD = '#C4973B'
const CHART_BRONZE = '#8C6A3A'
const CHART_STEEL = '#5A8A9E'
const CHART_GREY = '#808080'
const CHART_MUTED = '#5C5247'

// ============================================================================
// TYPES
// ============================================================================

interface Edition {
  id: number
  date: string
  subject: string
  status: 'sent' | 'failed' | 'pending'
  lead_title: string
  streak: boolean
  lead_content?: string
  lead_source_url?: string
  classifieds?: { title: string; summary: string; source_url: string }[]
  terminal_challenge?: {
    question: string
    options: string[]
    correct_answer: string
    explanation: string
  }
  research_summary?: string
  infographic_url?: string
}

interface Metrics {
  todayStatus: 'sent' | 'failed' | 'pending'
  totalEditions: number
  currentStreak: number
  subscriberCount: number
  subscriberGrowth: number
}

interface PipelineStage {
  name: string
  icon: React.ReactNode
  status: 'complete' | 'running' | 'failed' | 'idle'
}

interface StatusMessage {
  type: 'success' | 'error' | 'info'
  text: string
}

type TabId = 'overview' | 'analytics' | 'gallery' | 'editions' | 'settings'

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_EDITIONS: Edition[] = [
  {
    id: 42, date: '2026-02-16', subject: 'DeepSeek R2 Drops: Open-Source Reasoning at Scale', status: 'sent',
    lead_title: 'DeepSeek R2 Drops', streak: true,
    lead_content: 'DeepSeek has released R2, a fully open-source reasoning model that matches o3 on complex benchmarks while running at 1/10th the cost. The model introduces a novel "chain-of-verification" architecture that dramatically reduces hallucinations in multi-step reasoning tasks.',
    lead_source_url: 'https://deepseek.com/r2',
    classifieds: [
      { title: 'LangChain Hub hits 10K templates', summary: 'Community-driven prompt templates now power production apps worldwide.', source_url: 'https://langchain.com' },
      { title: 'Weights & Biases acquires Comet ML', summary: 'MLOps consolidation continues as W&B expands experiment tracking capabilities.', source_url: 'https://wandb.ai' },
      { title: 'Mistral releases Codestral 2', summary: 'New code generation model supports 200+ languages with inline documentation.', source_url: 'https://mistral.ai' },
    ],
    terminal_challenge: {
      question: 'What technique does DeepSeek R2 use to reduce hallucinations?',
      options: ['Chain-of-thought prompting', 'Chain-of-verification', 'Self-consistency decoding', 'Constitutional AI'],
      correct_answer: 'Chain-of-verification',
      explanation: 'R2 introduces chain-of-verification, which cross-checks intermediate reasoning steps against known facts before proceeding.',
    },
    research_summary: 'Today saw three major developments in the open-source AI space. DeepSeek R2 leads with breakthrough reasoning capabilities, while LangChain and Mistral continue to build developer infrastructure.',
    infographic_url: 'https://placehold.co/800x600/1a1612/C4973B?text=DeepSeek+R2+Infographic',
  },
  {
    id: 41, date: '2026-02-15', subject: 'Anthropic Ships Claude Opus 4: The Agentic Leap', status: 'sent',
    lead_title: 'Claude Opus 4 Launch', streak: true,
    lead_content: 'Anthropic released Claude Opus 4, featuring extended thinking with 128K output tokens and breakthrough performance on agentic coding tasks. The model sets new records on SWE-bench and TAU-bench.',
    lead_source_url: 'https://anthropic.com',
    classifieds: [
      { title: 'OpenAI launches Codex CLI', summary: 'Terminal-native coding agent with full filesystem access.', source_url: 'https://openai.com' },
      { title: 'Google DeepMind AlphaEvolve', summary: 'AI discovers novel algorithms for fundamental math problems.', source_url: 'https://deepmind.google' },
    ],
    terminal_challenge: {
      question: 'What is the maximum output token count for Claude Opus 4 extended thinking?',
      options: ['32K', '64K', '128K', '256K'],
      correct_answer: '128K',
      explanation: 'Claude Opus 4 supports up to 128K output tokens in extended thinking mode.',
    },
    research_summary: 'A landmark day for AI agents. Claude Opus 4 demonstrates that frontier models can now handle complex multi-file coding tasks autonomously.',
    infographic_url: 'https://placehold.co/800x600/1a1612/C4973B?text=Claude+Opus+4+Infographic',
  },
  {
    id: 40, date: '2026-02-14', subject: 'LangGraph 2.0: Production Agent Orchestration', status: 'sent',
    lead_title: 'LangGraph 2.0', streak: true,
    lead_content: 'LangChain releases LangGraph 2.0 with native support for human-in-the-loop workflows, persistent state management, and production deployment tooling.',
    lead_source_url: 'https://langchain.com/langgraph',
    classifieds: [
      { title: 'Vercel AI SDK 4.0', summary: 'Streaming tool calls and multi-modal support in Next.js.', source_url: 'https://vercel.com' },
    ],
    terminal_challenge: {
      question: 'Which feature is NEW in LangGraph 2.0?',
      options: ['Graph-based workflows', 'Persistent state management', 'LLM integration', 'Prompt templates'],
      correct_answer: 'Persistent state management',
      explanation: 'LangGraph 2.0 introduces native persistent state management for production agent orchestration.',
    },
    research_summary: 'Agent orchestration frameworks are maturing rapidly. LangGraph 2.0 addresses the critical gap of state management in production deployments.',
    infographic_url: 'https://placehold.co/800x600/1a1612/C4973B?text=LangGraph+2.0+Infographic',
  },
  {
    id: 39, date: '2026-02-13', subject: 'Nvidia CUDA 13: Native Transformer Kernels', status: 'failed',
    lead_title: 'CUDA 13 Kernels', streak: false,
    lead_content: 'Nvidia unveils CUDA 13 with hardware-level transformer kernel optimizations, promising 3x inference speedups on H200 GPUs.',
    lead_source_url: 'https://nvidia.com/cuda',
    classifieds: [],
    terminal_challenge: {
      question: 'What speedup does CUDA 13 promise for transformer inference?',
      options: ['1.5x', '2x', '3x', '5x'],
      correct_answer: '3x',
      explanation: 'CUDA 13 native transformer kernels deliver approximately 3x inference speedups on H200 GPUs.',
    },
    research_summary: 'Infrastructure advances continue to lower the cost barrier for AI deployment.',
    infographic_url: 'https://placehold.co/800x600/1a1612/C4973B?text=CUDA+13+Infographic',
  },
  {
    id: 38, date: '2026-02-12', subject: 'Hugging Face Spaces Pro: GPU Inference at Scale', status: 'sent',
    lead_title: 'HF Spaces Pro', streak: true,
    lead_content: 'Hugging Face launches Spaces Pro with dedicated GPU inference, auto-scaling, and enterprise SLA guarantees for production ML applications.',
    lead_source_url: 'https://huggingface.co/spaces-pro',
    classifieds: [
      { title: 'Meta releases Llama 4 Scout', summary: 'Mixture-of-experts model with 17B active parameters.', source_url: 'https://ai.meta.com' },
      { title: 'Cursor raises $900M', summary: 'AI code editor valued at $9B in latest funding round.', source_url: 'https://cursor.com' },
    ],
    terminal_challenge: {
      question: 'What is the active parameter count of Llama 4 Scout?',
      options: ['7B', '13B', '17B', '70B'],
      correct_answer: '17B',
      explanation: 'Llama 4 Scout uses a mixture-of-experts architecture with 17B active parameters per forward pass.',
    },
    research_summary: 'The MLOps ecosystem is consolidating around a few major platforms, with Hugging Face and cloud providers competing for the production inference market.',
    infographic_url: 'https://placehold.co/800x600/1a1612/C4973B?text=HF+Spaces+Pro+Infographic',
  },
]

const MOCK_METRICS: Metrics = {
  todayStatus: 'sent',
  totalEditions: 42,
  currentStreak: 12,
  subscriberCount: 1247,
  subscriberGrowth: 3.2,
}

// ============================================================================
// HELPERS
// ============================================================================

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-medium text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-medium text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-medium text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-medium">{part}</strong> : part
  )
}

function statusColor(status: string) {
  switch (status) {
    case 'sent': return 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30'
    case 'failed': return 'bg-red-600/20 text-red-400 border-red-600/30'
    case 'pending': return 'bg-amber-600/20 text-amber-400 border-amber-600/30'
    default: return 'bg-muted text-muted-foreground'
  }
}

function statusDot(status: string) {
  switch (status) {
    case 'sent': case 'complete': return 'bg-emerald-500'
    case 'failed': return 'bg-red-500'
    case 'pending': case 'running': return 'bg-amber-500'
    default: return 'bg-muted-foreground'
  }
}

// ============================================================================
// SUB-COMPONENTS (defined inline, NOT exported)
// ============================================================================

function Sidebar({ activeTab, setActiveTab, pipelineOverall }: {
  activeTab: TabId
  setActiveTab: (t: TabId) => void
  pipelineOverall: 'complete' | 'running' | 'failed' | 'idle'
}) {
  const navItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'OVERVIEW', icon: <FiHome size={18} /> },
    { id: 'analytics', label: 'ANALYTICS', icon: <HiOutlineChartBar size={18} /> },
    { id: 'gallery', label: 'GALLERY', icon: <HiOutlinePhoto size={18} /> },
    { id: 'editions', label: 'EDITIONS', icon: <HiOutlineNewspaper size={18} /> },
    { id: 'settings', label: 'SETTINGS', icon: <HiOutlineCog size={18} /> },
  ]

  return (
    <div className="w-64 min-h-screen border-r border-border flex flex-col" style={{ background: 'hsl(30, 7%, 7%)' }}>
      <div className="px-6 pt-8 pb-6">
        <h1 className="font-serif text-xl tracking-[0.2em] uppercase" style={{ color: GOLD }}>
          The AI Forge
        </h1>
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-1">
          Newsletter Intelligence
        </p>
      </div>

      <Separator className="opacity-30" />

      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs tracking-[0.15em] uppercase transition-all duration-200 ${activeTab === item.id ? 'text-primary bg-secondary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <Separator className="opacity-30" />

      <div className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${statusDot(pipelineOverall)}`} />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            {pipelineOverall === 'complete' ? 'Pipeline Active' :
             pipelineOverall === 'running' ? 'Pipeline Running' :
             pipelineOverall === 'failed' ? 'Pipeline Error' :
             'Pipeline Idle'}
          </span>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, suffix, trend, trendValue, borderGold }: {
  label: string
  value: string | number
  suffix?: string
  trend?: 'up' | 'down' | 'none'
  trendValue?: string
  borderGold?: boolean
}) {
  return (
    <Card className="relative overflow-hidden" style={borderGold ? { borderColor: GOLD, borderWidth: '1px' } : {}}>
      <CardContent className="p-5">
        <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">{label}</p>
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-3xl font-light" style={{ color: GOLD }}>{value}</span>
            {suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
          </div>
          {trend && trend !== 'none' && (
            <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend === 'up' ? <HiArrowTrendingUp size={14} /> : <HiArrowTrendingDown size={14} />}
              {trendValue}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PipelineTimeline({ stages }: { stages: PipelineStage[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal">Pipeline Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {stages.map((stage, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className={`w-10 h-10 flex items-center justify-center border ${stage.status === 'complete' ? 'border-emerald-500 bg-emerald-500/10' : stage.status === 'running' ? 'border-amber-500 bg-amber-500/10' : stage.status === 'failed' ? 'border-red-500 bg-red-500/10' : 'border-border bg-card'}`}>
                  {stage.status === 'complete' ? <HiCheck className="text-emerald-400" size={18} /> :
                   stage.status === 'running' ? <FiLoader className="text-amber-400 animate-spin" size={16} /> :
                   stage.status === 'failed' ? <HiXMark className="text-red-400" size={18} /> :
                   <span className="text-muted-foreground">{stage.icon}</span>}
                </div>
                <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground text-center">{stage.name}</span>
              </div>
              {i < stages.length - 1 && (
                <div className={`h-px flex-1 max-w-[60px] ${stage.status === 'complete' ? 'bg-emerald-500/50' : 'bg-border'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] tracking-[0.15em] uppercase border ${statusColor(status)}`}>
      {status}
    </span>
  )
}

function DeliverEmailDialog({ open, onOpenChange, edition, loading, onDeliver }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  edition: Edition | null
  loading: boolean
  onDeliver: (email: string) => void
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Please enter a valid email address')
      return
    }
    setError('')
    onDeliver(trimmed)
  }

  useEffect(() => {
    if (!open) {
      setEmail('')
      setError('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border" onInteractOutside={(e) => { if (loading) e.preventDefault() }}>
        <DialogHeader>
          <DialogTitle className="font-serif font-light tracking-wide flex items-center gap-2">
            <FiMail size={16} style={{ color: GOLD }} />
            Deliver to Email
          </DialogTitle>
        </DialogHeader>
        {edition && (
          <div className="space-y-4">
            <div className="p-3 bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-serif text-sm" style={{ color: GOLD }}>#{edition.id}</span>
                <StatusBadge status={edition.status} />
              </div>
              <p className="text-sm font-light">{edition.subject}</p>
              <p className="text-[10px] text-muted-foreground tracking-wider mt-1">{edition.date}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliver-email" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Recipient Email
              </Label>
              <Input
                id="deliver-email"
                type="email"
                placeholder="recipient@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
                className="bg-input border-border text-sm"
                disabled={loading}
              />
              {error && <p className="text-[10px] text-red-400 tracking-wider">{error}</p>}
            </div>

            <Button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSubmit() }}
              disabled={loading || !email.trim()}
              className="w-full text-xs tracking-wider"
              style={{ backgroundColor: GOLD, color: 'hsl(30, 8%, 6%)' }}
            >
              {loading ? (
                <FiLoader size={12} className="mr-2 animate-spin" />
              ) : (
                <FiSend size={12} className="mr-2" />
              )}
              {loading ? 'Sending...' : 'Send Newsletter'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AgentInfoPanel({ activeAgentId }: { activeAgentId: string | null }) {
  const agents = [
    { id: AGENT_IDS.orchestrator, name: 'Newsletter Orchestrator', purpose: 'Research + Editorial', icon: <RiRobot2Line size={14} /> },
    { id: AGENT_IDS.visual, name: 'Visual Agent', purpose: 'Infographic Generation', icon: <RiPaletteLine size={14} /> },
    { id: AGENT_IDS.delivery, name: 'Delivery Agent', purpose: 'Gmail Distribution', icon: <RiMailSendLine size={14} /> },
  ]

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal flex items-center gap-2">
          <FiActivity size={12} /> Agent Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{agent.icon}</span>
              <div>
                <p className="text-xs font-light">{agent.name}</p>
                <p className="text-[10px] text-muted-foreground">{agent.purpose}</p>
              </div>
            </div>
            <div className={`w-2 h-2 ${activeAgentId === agent.id ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SCREEN: OVERVIEW
// ============================================================================

function OverviewScreen({ metrics, editions, pipelineStages, loading, onRegenDraft, onRegenImage, onResend, onDeliverToEmail, activeAgentId }: {
  metrics: Metrics
  editions: Edition[]
  pipelineStages: PipelineStage[]
  loading: boolean
  onRegenDraft: () => void
  onRegenImage: () => void
  onResend: () => void
  onDeliverToEmail: (edition: Edition) => void
  activeAgentId: string | null
}) {
  const hasFailed = pipelineStages.some(s => s.status === 'failed')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-light tracking-wide">Dashboard</h2>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">Edition {metrics.totalEditions} Overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Today's Status"
          value={metrics.todayStatus.charAt(0).toUpperCase() + metrics.todayStatus.slice(1)}
          borderGold
        />
        <MetricCard
          label="Total Editions"
          value={metrics.totalEditions}
          trend="up"
          trendValue="+1 today"
          borderGold
        />
        <MetricCard
          label="Current Streak"
          value={metrics.currentStreak}
          suffix="days"
          trend="up"
          trendValue="active"
          borderGold
        />
        <MetricCard
          label="Subscribers"
          value={metrics.subscriberCount.toLocaleString()}
          trend="up"
          trendValue={`+${metrics.subscriberGrowth}%`}
          borderGold
        />
      </div>

      <PipelineTimeline stages={pipelineStages} />

      {hasFailed && (
        <Card style={{ borderColor: 'hsl(0, 50%, 50%)', borderWidth: '1px' }}>
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-red-400 tracking-widest uppercase">Recovery Actions</span>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={onRegenDraft} disabled={loading} className="text-xs tracking-wider">
                <FiRefreshCw size={12} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                Re-generate Draft
              </Button>
              <Button variant="outline" size="sm" onClick={onRegenImage} disabled={loading} className="text-xs tracking-wider">
                <FiImage size={12} className="mr-1" />
                Re-generate Infographic
              </Button>
              <Button variant="outline" size="sm" onClick={onResend} disabled={loading} className="text-xs tracking-wider">
                <FiSend size={12} className="mr-1" />
                Re-send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal">Recent Editions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {editions.slice(0, 5).map((ed) => (
              <div key={ed.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-4">
                  <span className="font-serif text-lg font-light w-8" style={{ color: GOLD }}>#{ed.id}</span>
                  <div>
                    <p className="text-sm font-light">{ed.lead_title}</p>
                    <p className="text-[10px] text-muted-foreground tracking-wider">{ed.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => onDeliverToEmail(ed)}
                    disabled={loading}
                    className="text-xs tracking-wider px-4 py-2 font-medium border-0"
                    style={{ backgroundColor: GOLD, color: 'hsl(30, 8%, 6%)' }}
                  >
                    <FiMail size={14} className="mr-2" />
                    Deliver to Email
                  </Button>
                  <StatusBadge status={ed.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AgentInfoPanel activeAgentId={activeAgentId} />
    </div>
  )
}

// ============================================================================
// SCREEN: ANALYTICS
// ============================================================================

function AnalyticsScreen({ editions }: { editions: Edition[] }) {
  const [dateRange, setDateRange] = useState('30d')

  const deliveryTrendData = React.useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2026, 0, 18 + i)
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        delivered: i < 27 ? (i === 15 || i === 22 ? 0 : 1) : (i === 28 ? 1 : 1),
        subscribers: 1100 + Math.floor(i * 5.2) + (i > 20 ? Math.floor(i * 2) : 0),
      }
    })
  }, [])

  const puzzleData = React.useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map((day, i) => ({
      day,
      completionRate: [78, 82, 75, 88, 91, 65, 58][i],
    }))
  }, [])

  const subscriberData = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'][i],
      subscribers: [420, 510, 580, 640, 720, 810, 870, 950, 1020, 1100, 1180, 1247][i],
    }))
  }, [])

  const calendarWeeks = React.useMemo(() => {
    const weeks: { day: number; value: number; date: string }[][] = []
    for (let w = 0; w < 5; w++) {
      const week: { day: number; value: number; date: string }[] = []
      for (let d = 0; d < 7; d++) {
        const dayNum = w * 7 + d + 1
        if (dayNum <= 28) {
          week.push({
            day: dayNum,
            value: dayNum === 13 ? 0 : (dayNum % 7 === 0 || dayNum % 7 === 6) ? 2 : dayNum % 3 === 0 ? 5 : 4,
            date: `Feb ${dayNum}`,
          })
        }
      }
      if (week.length > 0) weeks.push(week)
    }
    return weeks
  }, [])

  function heatColor(val: number) {
    if (val === 0) return 'hsl(0, 50%, 30%)'
    if (val <= 2) return 'hsl(40, 30%, 20%)'
    if (val <= 3) return 'hsl(40, 40%, 30%)'
    if (val <= 4) return 'hsl(40, 50%, 40%)'
    return 'hsl(40, 50%, 55%)'
  }

  const tooltipStyle = {
    backgroundColor: 'hsl(30, 6%, 12%)',
    border: '1px solid hsl(30, 6%, 20%)',
    borderRadius: '0px',
    color: 'hsl(30, 10%, 90%)',
    fontSize: '11px',
    letterSpacing: '0.05em',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-light tracking-wide">Analytics</h2>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">Performance Metrics</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-card border border-border text-xs px-3 py-1.5 text-foreground tracking-wider"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal">Delivery Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deliveryTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 6%, 16%)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(30, 8%, 55%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(30, 6%, 20%)' }} tickLine={false} interval={4} />
                <YAxis tick={{ fill: 'hsl(30, 8%, 55%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(30, 6%, 20%)' }} tickLine={false} domain={[0, 1]} ticks={[0, 1]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="stepAfter" dataKey="delivered" stroke={CHART_GOLD} strokeWidth={2} dot={{ fill: CHART_GOLD, r: 3 }} activeDot={{ r: 5, fill: CHART_GOLD }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal">Puzzle Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={puzzleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 6%, 16%)" />
                  <XAxis dataKey="day" tick={{ fill: 'hsl(30, 8%, 55%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(30, 6%, 20%)' }} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(30, 8%, 55%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(30, 6%, 20%)' }} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="completionRate" fill={CHART_GOLD} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal">Subscriber Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={subscriberData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 6%, 16%)" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(30, 8%, 55%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(30, 6%, 20%)' }} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(30, 8%, 55%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(30, 6%, 20%)' }} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="subscribers" stroke={CHART_GOLD} fill={CHART_GOLD} fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal">Engagement Heatmap (February)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex gap-1 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="w-10 h-5 flex items-center justify-center text-[9px] text-muted-foreground tracking-wider">{d}</div>
              ))}
            </div>
            {calendarWeeks.map((week, wi) => (
              <div key={wi} className="flex gap-1">
                {week.map((day) => (
                  <div
                    key={day.day}
                    className="w-10 h-10 flex items-center justify-center text-[10px] font-light border border-border/30 transition-all hover:scale-110"
                    style={{ backgroundColor: heatColor(day.value) }}
                    title={`${day.date}: ${day.value === 0 ? 'No engagement' : day.value <= 2 ? 'Low' : day.value <= 3 ? 'Medium' : 'High'}`}
                  >
                    {day.day}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[9px] text-muted-foreground tracking-wider">Less</span>
            {[0, 2, 3, 4, 5].map((v) => (
              <div key={v} className="w-4 h-4 border border-border/30" style={{ backgroundColor: heatColor(v) }} />
            ))}
            <span className="text-[9px] text-muted-foreground tracking-wider">More</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// SCREEN: GALLERY
// ============================================================================

function GalleryScreen({ editions, onRegenImage, loading }: {
  editions: Edition[]
  onRegenImage: (title: string) => void
  loading: boolean
}) {
  const [selectedImage, setSelectedImage] = useState<Edition | null>(null)

  const infographics = editions.filter((e) => e.infographic_url)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-light tracking-wide">Gallery</h2>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">Infographic Archive</p>
        </div>
      </div>

      {infographics.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <HiOutlinePhoto size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No infographics generated yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {infographics.map((ed) => (
            <Card key={ed.id} className="overflow-hidden cursor-pointer group transition-all duration-200 hover:border-primary/50" onClick={() => setSelectedImage(ed)}>
              <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                <img
                  src={ed.infographic_url ?? ''}
                  alt={`Edition ${ed.id} infographic`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif text-sm" style={{ color: GOLD }}>#{ed.id}</span>
                  <span className="text-[10px] text-muted-foreground tracking-wider">{ed.date}</span>
                </div>
                <p className="text-xs font-light">{ed.lead_title}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif font-light tracking-wide flex items-center gap-2">
              <span style={{ color: GOLD }}>#{selectedImage?.id}</span>
              {selectedImage?.lead_title}
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="bg-secondary border border-border overflow-hidden">
                <img
                  src={selectedImage.infographic_url ?? ''}
                  alt={`Edition ${selectedImage.id}`}
                  className="w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground tracking-wider">{selectedImage.date}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onRegenImage(selectedImage.lead_title)
                    setSelectedImage(null)
                  }}
                  disabled={loading}
                  className="text-xs tracking-wider"
                >
                  <FiRefreshCw size={12} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Re-generate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// SCREEN: EDITIONS ARCHIVE
// ============================================================================

function EditionsScreen({ editions, onDeliverToEmail, loading }: { editions: Edition[]; onDeliverToEmail: (edition: Edition) => void; loading: boolean }) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
      setQuizAnswer(null)
      setShowExplanation(false)
    } else {
      setExpandedId(id)
      setQuizAnswer(null)
      setShowExplanation(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-light tracking-wide">Editions</h2>
        <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">Complete Archive</p>
      </div>

      <div className="space-y-3">
        {editions.map((ed) => (
          <Card key={ed.id} className={`transition-all duration-200 ${expandedId === ed.id ? 'border-primary/40' : ''}`}>
            <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(ed.id)}>
              <div className="flex items-center gap-4">
                <span className="font-serif text-lg font-light w-8" style={{ color: GOLD }}>#{ed.id}</span>
                <div>
                  <p className="text-sm font-light">{ed.subject}</p>
                  <p className="text-[10px] text-muted-foreground tracking-wider">{ed.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={ed.status} />
                {expandedId === ed.id ? <FiChevronUp size={14} className="text-muted-foreground" /> : <FiChevronDown size={14} className="text-muted-foreground" />}
              </div>
            </div>

            {expandedId === ed.id && (
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                {ed.lead_content && (
                  <div>
                    <h4 className="text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: GOLD }}>The Lead</h4>
                    <h3 className="font-serif text-lg font-light mb-2">{ed.lead_title}</h3>
                    <div className="text-sm font-light text-foreground/80">{renderMarkdown(ed.lead_content)}</div>
                    {ed.lead_source_url && (
                      <a href={ed.lead_source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs mt-2 transition-colors hover:text-primary" style={{ color: GOLD_DIM }}>
                        <FiExternalLink size={10} /> Source
                      </a>
                    )}
                  </div>
                )}

                {Array.isArray(ed.classifieds) && ed.classifieds.length > 0 && (
                  <div>
                    <h4 className="text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: GOLD }}>The Classifieds</h4>
                    <div className="space-y-2">
                      {ed.classifieds.map((c, ci) => (
                        <div key={ci} className="p-3 bg-secondary/50 border border-border">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-light">{c.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{c.summary}</p>
                            </div>
                            {c.source_url && (
                              <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <FiExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ed.terminal_challenge && (
                  <div>
                    <h4 className="text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: GOLD }}>The Terminal Challenge</h4>
                    <div className="p-4 bg-secondary/50 border border-border">
                      <p className="text-sm font-light mb-3">{ed.terminal_challenge.question}</p>
                      {Array.isArray(ed.terminal_challenge.options) && (
                        <div className="space-y-2">
                          {ed.terminal_challenge.options.map((opt, oi) => {
                            const isCorrect = opt === ed.terminal_challenge?.correct_answer
                            const isSelected = quizAnswer === opt
                            return (
                              <button
                                key={oi}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setQuizAnswer(opt)
                                  setShowExplanation(true)
                                }}
                                disabled={!!quizAnswer}
                                className={`w-full text-left px-3 py-2 text-xs tracking-wider border transition-all ${isSelected ? (isCorrect ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-red-500 bg-red-500/10 text-red-400') : quizAnswer && isCorrect ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border hover:border-primary/30 hover:bg-secondary'}`}
                              >
                                {opt}
                                {isSelected && isCorrect && <HiCheck className="inline ml-2" size={14} />}
                                {isSelected && !isCorrect && <HiXMark className="inline ml-2" size={14} />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {showExplanation && ed.terminal_challenge.explanation && (
                        <div className="mt-3 p-3 border border-primary/20 bg-primary/5">
                          <p className="text-xs font-light text-foreground/80">{ed.terminal_challenge.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {ed.research_summary && (
                  <div>
                    <h4 className="text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: GOLD }}>Research Summary</h4>
                    <div className="text-sm font-light text-foreground/80">{renderMarkdown(ed.research_summary)}</div>
                  </div>
                )}

                <Separator className="opacity-30" />

                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onDeliverToEmail(ed) }}
                    disabled={loading}
                    className="text-xs tracking-wider px-4 py-2 font-medium border-0"
                    style={{ backgroundColor: GOLD, color: 'hsl(30, 8%, 6%)' }}
                  >
                    <FiMail size={14} className="mr-2" />
                    Deliver to Email
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// SCREEN: SETTINGS
// ============================================================================

function SettingsScreen({ schedules, onToggleSchedule, onTriggerNow, schedulesLoading, statusMsg, deliveryTime, setDeliveryTime, subscriberEmails, setSubscriberEmails, autoDelivery, setAutoDelivery, onSaveSettings, settingsSaved }: {
  schedules: { id: string; name: string; agentId: string; cron: string; timezone: string; isActive: boolean; nextRun: string | null }[]
  onToggleSchedule: (id: string, currentActive: boolean) => void
  onTriggerNow: (id: string) => void
  schedulesLoading: boolean
  statusMsg: StatusMessage | null
  deliveryTime: string
  setDeliveryTime: (v: string) => void
  subscriberEmails: string[]
  setSubscriberEmails: React.Dispatch<React.SetStateAction<string[]>>
  autoDelivery: boolean
  setAutoDelivery: (v: boolean) => void
  onSaveSettings: () => void
  settingsSaved: boolean
}) {
  const [emailInput, setEmailInput] = useState('')

  const addEmail = () => {
    const email = emailInput.trim()
    if (email && email.includes('@') && !subscriberEmails.includes(email)) {
      setSubscriberEmails((prev) => [...prev, email])
      setEmailInput('')
    }
  }

  const removeEmail = (email: string) => {
    setSubscriberEmails((prev) => prev.filter((e) => e !== email))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-light tracking-wide">Settings</h2>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">Pipeline Configuration</p>
        </div>
        <Button
          onClick={onSaveSettings}
          className="text-xs tracking-wider px-5 py-2 font-medium border-0"
          style={{ backgroundColor: GOLD, color: 'hsl(30, 8%, 6%)' }}
        >
          {settingsSaved ? <HiCheck size={14} className="mr-2" /> : <FiSave size={14} className="mr-2" />}
          {settingsSaved ? 'Saved' : 'Save Settings'}
        </Button>
      </div>

      {statusMsg && (
        <div className={`p-3 border text-xs tracking-wider ${statusMsg.type === 'success' ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-400' : statusMsg.type === 'error' ? 'border-red-600/30 bg-red-600/10 text-red-400' : 'border-primary/30 bg-primary/10 text-primary'}`}>
          {statusMsg.text}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal">Delivery Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <FiClock size={16} className="text-muted-foreground" />
            <Input
              type="time"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="w-40 bg-input border-border text-sm"
            />
            <span className="text-xs text-muted-foreground tracking-wider">EST (America/New_York)</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal">Subscriber List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="email@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addEmail() }}
              className="bg-input border-border text-sm flex-1"
            />
            <Button variant="outline" size="sm" onClick={addEmail} className="text-xs tracking-wider">
              <FiPlus size={12} className="mr-1" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {subscriberEmails.map((email) => (
              <span key={email} className="inline-flex items-center gap-1 px-2 py-1 bg-secondary border border-border text-xs tracking-wider">
                <FiMail size={10} className="text-muted-foreground" />
                {email}
                <button onClick={() => removeEmail(email)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                  <FiX size={10} />
                </button>
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 tracking-wider">{subscriberEmails.length} subscriber{subscriberEmails.length !== 1 ? 's' : ''}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal">Auto-Delivery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-light">Automatic Newsletter Delivery</p>
              <p className="text-xs text-muted-foreground mt-1">When enabled, the pipeline runs and delivers on schedule</p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-delivery" className="text-xs text-muted-foreground">{autoDelivery ? 'ON' : 'OFF'}</Label>
              <Switch id="auto-delivery" checked={autoDelivery} onCheckedChange={setAutoDelivery} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal flex items-center gap-2">
            <RiCalendarScheduleLine size={14} /> Schedule Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedulesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => (
                <div key={s.id} className="p-4 border border-border bg-secondary/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-light">{s.name}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] tracking-widest uppercase border ${s.isActive ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-400' : 'border-muted bg-muted/50 text-muted-foreground'}`}>
                        {s.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleSchedule(s.id, s.isActive)}
                        disabled={schedulesLoading}
                        className="text-xs px-2"
                      >
                        {s.isActive ? <FiPause size={12} /> : <FiPlay size={12} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTriggerNow(s.id)}
                        disabled={schedulesLoading}
                        className="text-xs px-2"
                        title="Trigger now"
                      >
                        <FiZap size={12} />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-[10px] text-muted-foreground tracking-wider">
                    <div>
                      <span className="uppercase block mb-0.5">Schedule</span>
                      <span className="text-foreground/70">{cronToHuman(s.cron)}</span>
                    </div>
                    <div>
                      <span className="uppercase block mb-0.5">Timezone</span>
                      <span className="text-foreground/70">{s.timezone}</span>
                    </div>
                    <div>
                      <span className="uppercase block mb-0.5">Next Run</span>
                      <span className="text-foreground/70">{s.nextRun ? new Date(s.nextRun).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-normal">Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <RiGoogleLine size={16} className="text-muted-foreground" />
                <span className="text-sm font-light">Gmail (Composio)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500" />
                <span className="text-[10px] text-emerald-400 tracking-widest uppercase">Connected</span>
              </div>
            </div>
            <Separator className="opacity-30" />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <FiSearch size={16} className="text-muted-foreground" />
                <span className="text-sm font-light">Web Search (Research)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500" />
                <span className="text-[10px] text-emerald-400 tracking-widest uppercase">Active</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Page() {
  // ----- State -----
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [editions, setEditions] = useState<Edition[]>(MOCK_EDITIONS)
  const [metrics, setMetrics] = useState<Metrics>(MOCK_METRICS)
  const [loading, setLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<StatusMessage | null>(null)

  const [sampleMode, setSampleMode] = useState(true)
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false)
  const [deliverEdition, setDeliverEdition] = useState<Edition | null>(null)
  const [deliverLoading, setDeliverLoading] = useState(false)
  const deliverEditionRef = useRef<Edition | null>(null)

  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([
    { name: 'Research', icon: <FiSearch size={14} />, status: 'complete' },
    { name: 'Edit', icon: <FiEdit3 size={14} />, status: 'complete' },
    { name: 'Infographic', icon: <FiImage size={14} />, status: 'complete' },
    { name: 'Deliver', icon: <FiSend size={14} />, status: 'complete' },
  ])

  const [scheduleData, setScheduleData] = useState<{ id: string; name: string; agentId: string; cron: string; timezone: string; isActive: boolean; nextRun: string | null }[]>([
    { id: SCHEDULE_IDS.orchestrator, name: 'Newsletter Orchestrator', agentId: AGENT_IDS.orchestrator, cron: '0 8 * * *', timezone: 'America/New_York', isActive: true, nextRun: null },
    { id: SCHEDULE_IDS.visual, name: 'Visual Agent', agentId: AGENT_IDS.visual, cron: '5 8 * * *', timezone: 'America/New_York', isActive: true, nextRun: null },
    { id: SCHEDULE_IDS.delivery, name: 'Delivery Agent', agentId: AGENT_IDS.delivery, cron: '10 8 * * *', timezone: 'America/New_York', isActive: true, nextRun: null },
  ])
  const [schedulesLoading, setSchedulesLoading] = useState(false)

  // ----- Settings state (lifted for persistence) -----
  const [deliveryTime, setDeliveryTime] = useState('08:00')
  const [subscriberEmails, setSubscriberEmails] = useState<string[]>([
    'team@company.com', 'dev-leads@company.com', 'cto@startup.io'
  ])
  const [autoDelivery, setAutoDelivery] = useState(true)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aiforge_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.deliveryTime) setDeliveryTime(parsed.deliveryTime)
        if (Array.isArray(parsed.subscriberEmails)) setSubscriberEmails(parsed.subscriberEmails)
        if (typeof parsed.autoDelivery === 'boolean') setAutoDelivery(parsed.autoDelivery)
      }
    } catch {
      // ignore parse errors, use defaults
    }
  }, [])

  const handleSaveSettings = useCallback(() => {
    try {
      const settings = { deliveryTime, subscriberEmails, autoDelivery }
      localStorage.setItem('aiforge_settings', JSON.stringify(settings))
      setSettingsSaved(true)
      setStatusMsg({ type: 'success', text: 'Settings saved successfully.' })
      setTimeout(() => setSettingsSaved(false), 2000)
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save settings.' })
    }
  }, [deliveryTime, subscriberEmails, autoDelivery])

  const pipelineOverall: 'complete' | 'running' | 'failed' | 'idle' = pipelineStages.some(s => s.status === 'failed') ? 'failed' :
    pipelineStages.some(s => s.status === 'running') ? 'running' :
    pipelineStages.every(s => s.status === 'complete') ? 'complete' : 'idle'

  // ----- Fetch schedules on mount -----
  useEffect(() => {
    async function fetchSchedules() {
      setSchedulesLoading(true)
      try {
        const results = await Promise.allSettled([
          getSchedule(SCHEDULE_IDS.orchestrator),
          getSchedule(SCHEDULE_IDS.visual),
          getSchedule(SCHEDULE_IDS.delivery),
        ])
        const names = ['Newsletter Orchestrator', 'Visual Agent', 'Delivery Agent']
        const ids = [SCHEDULE_IDS.orchestrator, SCHEDULE_IDS.visual, SCHEDULE_IDS.delivery]
        const agentIds = [AGENT_IDS.orchestrator, AGENT_IDS.visual, AGENT_IDS.delivery]

        const updated = ids.map((id, i) => {
          const r = results[i]
          if (r.status === 'fulfilled' && r.value.success && r.value.schedule) {
            const s = r.value.schedule
            return {
              id: s.id || id,
              name: names[i],
              agentId: s.agent_id || agentIds[i],
              cron: s.cron_expression || ['0 8 * * *', '5 8 * * *', '10 8 * * *'][i],
              timezone: s.timezone || 'America/New_York',
              isActive: s.is_active ?? true,
              nextRun: s.next_run_time ?? null,
            }
          }
          return scheduleData[i]
        })
        setScheduleData(updated)
      } catch {
        // keep defaults
      }
      setSchedulesLoading(false)
    }
    fetchSchedules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Agent call handlers -----
  const handleRegenDraft = useCallback(async () => {
    setLoading(true)
    setActiveAgentId(AGENT_IDS.orchestrator)
    setStatusMsg({ type: 'info', text: 'Running newsletter pipeline...' })
    setPipelineStages((prev) => prev.map((s, i) => i === 0 ? { ...s, status: 'running' as const } : { ...s, status: 'idle' as const }))

    try {
      const result = await callAIAgent(
        'Run the daily newsletter pipeline. Research the top 3 AI developments from the last 24 hours, compile an edition with The Lead, The Classifieds, and The Terminal Challenge.',
        AGENT_IDS.orchestrator
      )

      if (result.success) {
        const data = result?.response?.result
        const newEdition: Edition = {
          id: (data?.edition_number as number) ?? (metrics.totalEditions + 1),
          date: (data?.date as string) ?? new Date().toISOString().split('T')[0],
          subject: (data?.subject_line as string) ?? 'New Edition',
          status: (data?.pipeline_status as string) === 'success' ? 'sent' : 'pending',
          lead_title: (data?.the_lead as { title?: string })?.title ?? 'Latest AI News',
          streak: true,
          lead_content: (data?.the_lead as { content?: string })?.content ?? '',
          lead_source_url: (data?.the_lead as { source_url?: string })?.source_url ?? '',
          classifieds: Array.isArray(data?.the_classifieds) ? data.the_classifieds : [],
          terminal_challenge: data?.the_terminal_challenge ? {
            question: (data.the_terminal_challenge as { question?: string }).question ?? '',
            options: Array.isArray((data.the_terminal_challenge as { options?: string[] }).options) ? (data.the_terminal_challenge as { options: string[] }).options : [],
            correct_answer: (data.the_terminal_challenge as { correct_answer?: string }).correct_answer ?? '',
            explanation: (data.the_terminal_challenge as { explanation?: string }).explanation ?? '',
          } : undefined,
          research_summary: (data?.research_summary as string) ?? '',
        }
        setEditions((prev) => [newEdition, ...prev])
        setMetrics((prev) => ({ ...prev, totalEditions: prev.totalEditions + 1 }))
        setPipelineStages((prev) => prev.map((s, i) => i <= 1 ? { ...s, status: 'complete' as const } : s))
        setStatusMsg({ type: 'success', text: 'Newsletter draft generated successfully.' })
      } else {
        setPipelineStages((prev) => prev.map((s, i) => i === 0 ? { ...s, status: 'failed' as const } : s))
        setStatusMsg({ type: 'error', text: result?.error ?? 'Failed to generate draft.' })
      }
    } catch {
      setPipelineStages((prev) => prev.map((s, i) => i === 0 ? { ...s, status: 'failed' as const } : s))
      setStatusMsg({ type: 'error', text: 'Network error while generating draft.' })
    }
    setActiveAgentId(null)
    setLoading(false)
  }, [metrics.totalEditions])

  const handleRegenImage = useCallback(async (title?: string) => {
    setLoading(true)
    setActiveAgentId(AGENT_IDS.visual)
    setStatusMsg({ type: 'info', text: 'Generating infographic...' })
    setPipelineStages((prev) => prev.map((s, i) => i === 2 ? { ...s, status: 'running' as const } : s))

    try {
      const storyTitle = title ?? editions[0]?.lead_title ?? 'Latest AI Development'
      const result = await callAIAgent(
        `Generate an infographic for today's lead story: ${storyTitle}. Use the brand gold and grey accent palette with architectural layout.`,
        AGENT_IDS.visual
      )

      if (result.success) {
        const jsonData = result?.response?.result
        const files = Array.isArray(result?.module_outputs?.artifact_files) ? result.module_outputs.artifact_files : []
        const imageUrl = files.length > 0 ? files[0]?.file_url : undefined

        if (imageUrl) {
          setEditions((prev) => {
            const updated = [...prev]
            if (updated.length > 0) {
              updated[0] = { ...updated[0], infographic_url: imageUrl }
            }
            return updated
          })
        }
        setPipelineStages((prev) => prev.map((s, i) => i === 2 ? { ...s, status: 'complete' as const } : s))
        setStatusMsg({ type: 'success', text: `Infographic generated: ${(jsonData?.infographic_description as string) ?? 'Complete'}` })
      } else {
        setPipelineStages((prev) => prev.map((s, i) => i === 2 ? { ...s, status: 'failed' as const } : s))
        setStatusMsg({ type: 'error', text: result?.error ?? 'Failed to generate infographic.' })
      }
    } catch {
      setPipelineStages((prev) => prev.map((s, i) => i === 2 ? { ...s, status: 'failed' as const } : s))
      setStatusMsg({ type: 'error', text: 'Network error while generating infographic.' })
    }
    setActiveAgentId(null)
    setLoading(false)
  }, [editions])

  const handleResend = useCallback(async () => {
    setLoading(true)
    setActiveAgentId(AGENT_IDS.delivery)
    setStatusMsg({ type: 'info', text: 'Sending newsletter...' })
    setPipelineStages((prev) => prev.map((s, i) => i === 3 ? { ...s, status: 'running' as const } : s))

    try {
      const latestEdition = editions[0]
      const recipientList = subscriberEmails.length > 0 ? subscriberEmails.join(', ') : 'team@company.com'

      const classifiedsText = Array.isArray(latestEdition?.classifieds) && latestEdition.classifieds.length > 0
        ? latestEdition.classifieds.map((c, i) => `${i + 1}. ${c.title}: ${c.summary}`).join('\n')
        : 'None'

      const emailBody = [
        `THE LEAD: ${latestEdition?.lead_title ?? 'Latest AI News'}`,
        latestEdition?.lead_content ?? '',
        '',
        'THE CLASSIFIEDS:',
        classifiedsText,
        '',
        latestEdition?.research_summary ? `RESEARCH SUMMARY: ${latestEdition.research_summary}` : '',
      ].filter(Boolean).join('\n')

      const result = await callAIAgent(
        `You MUST use the GMAIL_SEND_EMAIL tool to send an email right now. Do NOT just describe what you would do - actually call the tool.

Recipient email address (to): ${recipientList}
Email subject: ${latestEdition?.subject ?? 'AI Newsletter'}
Email body:
${emailBody}

Send this email immediately using the GMAIL_SEND_EMAIL tool. This is edition #${latestEdition?.id ?? 'latest'}.`,
        AGENT_IDS.delivery
      )

      if (result.success) {
        const data = result?.response?.result
        const rawResponse = (result?.raw_response ?? '').toLowerCase()
        const deliveryStatus = (data?.delivery_status as string) ?? ''
        const errorMessage = (data?.error_message as string) ?? ''
        const statusLower = deliveryStatus.toLowerCase()
        const hasError = errorMessage.length > 0 && !errorMessage.toLowerCase().includes('none') && !errorMessage.toLowerCase().includes('n/a')

        if (hasError) {
          setPipelineStages((prev) => prev.map((s, i) => i === 3 ? { ...s, status: 'failed' as const } : s))
          setStatusMsg({ type: 'error', text: `Delivery failed: ${errorMessage}` })
        } else if (statusLower.includes('success') || statusLower.includes('sent') || statusLower.includes('delivered') || rawResponse.includes('sent') || rawResponse.includes('delivered') || rawResponse.includes('gmail_send_email')) {
          setEditions((prev) => {
            const updated = [...prev]
            if (updated.length > 0) {
              updated[0] = { ...updated[0], status: 'sent' }
            }
            return updated
          })
          setMetrics((prev) => ({ ...prev, todayStatus: 'sent' }))
          setPipelineStages((prev) => prev.map((s, i) => i === 3 ? { ...s, status: 'complete' as const } : s))
          setStatusMsg({ type: 'success', text: `Delivered to ${(data?.recipients_count as number) ?? subscriberEmails.length} recipients.` })
        } else {
          setPipelineStages((prev) => prev.map((s, i) => i === 3 ? { ...s, status: 'failed' as const } : s))
          setStatusMsg({ type: 'error', text: (data?.error_message as string) ?? 'Delivery status unclear.' })
        }
      } else {
        setPipelineStages((prev) => prev.map((s, i) => i === 3 ? { ...s, status: 'failed' as const } : s))
        setStatusMsg({ type: 'error', text: result?.error ?? 'Failed to send newsletter.' })
      }
    } catch {
      setPipelineStages((prev) => prev.map((s, i) => i === 3 ? { ...s, status: 'failed' as const } : s))
      setStatusMsg({ type: 'error', text: 'Network error while sending.' })
    }
    setActiveAgentId(null)
    setLoading(false)
  }, [editions, subscriberEmails])

  // ----- Schedule handlers -----
  const handleToggleSchedule = useCallback(async (scheduleId: string, currentActive: boolean) => {
    setSchedulesLoading(true)
    setStatusMsg(null)
    try {
      const result = currentActive ? await pauseSchedule(scheduleId) : await resumeSchedule(scheduleId)
      if (result.success) {
        setScheduleData((prev) => prev.map((s) => s.id === scheduleId ? { ...s, isActive: !currentActive } : s))
        setStatusMsg({ type: 'success', text: `Schedule ${currentActive ? 'paused' : 'resumed'} successfully.` })
      } else {
        setStatusMsg({ type: 'error', text: result.error ?? 'Failed to toggle schedule.' })
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error toggling schedule.' })
    }
    setSchedulesLoading(false)
  }, [])

  const handleTriggerNow = useCallback(async (scheduleId: string) => {
    setSchedulesLoading(true)
    setStatusMsg(null)
    try {
      const result = await triggerScheduleNow(scheduleId)
      if (result.success) {
        setStatusMsg({ type: 'success', text: 'Schedule triggered. Execution starting...' })
      } else {
        setStatusMsg({ type: 'error', text: result.error ?? 'Failed to trigger schedule.' })
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error triggering schedule.' })
    }
    setSchedulesLoading(false)
  }, [])

  // ----- Deliver to email -----
  const openDeliverDialog = useCallback((edition: Edition) => {
    deliverEditionRef.current = edition
    setDeliverEdition(edition)
    setDeliverDialogOpen(true)
  }, [])

  const handleDeliverToEmail = useCallback(async (email: string) => {
    const edition = deliverEditionRef.current
    if (!edition) return
    setDeliverLoading(true)
    setActiveAgentId(AGENT_IDS.delivery)
    setStatusMsg({ type: 'info', text: `Delivering edition #${edition.id} to ${email}...` })

    const classifiedsText = Array.isArray(edition.classifieds) && edition.classifieds.length > 0
      ? edition.classifieds.map((c, i) => `${i + 1}. ${c.title}: ${c.summary}`).join('\n')
      : 'None'

    const emailBody = [
      `Subject: ${edition.subject}`,
      '',
      `THE LEAD: ${edition.lead_title}`,
      edition.lead_content ?? '',
      '',
      'THE CLASSIFIEDS:',
      classifiedsText,
      '',
      edition.research_summary ? `RESEARCH SUMMARY: ${edition.research_summary}` : '',
    ].filter(Boolean).join('\n')

    try {
      const result = await callAIAgent(
        `You MUST use the GMAIL_SEND_EMAIL tool to send an email right now. Do NOT just describe what you would do - actually call the tool.

Recipient email address (to): ${email}
Email subject: ${edition.subject}
Email body:
${emailBody}

Send this email immediately using the GMAIL_SEND_EMAIL tool. The recipient is ${email}. This is edition #${edition.id}.`,
        AGENT_IDS.delivery
      )

      if (result.success) {
        const data = result?.response?.result
        const rawResponse = (result?.raw_response ?? '').toLowerCase()
        const deliveryStatus = (data?.delivery_status as string) ?? ''
        const errorMessage = (data?.error_message as string) ?? ''
        const statusLower = deliveryStatus.toLowerCase()
        const hasError = errorMessage.length > 0 && !errorMessage.toLowerCase().includes('none') && !errorMessage.toLowerCase().includes('n/a')

        if (hasError) {
          setStatusMsg({ type: 'error', text: `Delivery failed: ${errorMessage}` })
        } else if (statusLower.includes('success') || statusLower.includes('sent') || statusLower.includes('delivered') || rawResponse.includes('sent') || rawResponse.includes('delivered') || rawResponse.includes('gmail_send_email')) {
          setStatusMsg({ type: 'success', text: `Edition #${edition.id} delivered to ${email} successfully.` })
        } else {
          setStatusMsg({ type: 'info', text: `Edition #${edition.id} delivery requested for ${email}. Check inbox shortly.` })
        }
      } else {
        setStatusMsg({ type: 'error', text: result?.error ?? `Failed to deliver to ${email}.` })
      }
    } catch {
      setStatusMsg({ type: 'error', text: `Network error delivering to ${email}.` })
    }

    setDeliverLoading(false)
    setActiveAgentId(null)
    setDeliverDialogOpen(false)
  }, [])

  // ----- Sample data toggle -----
  const handleSampleToggle = useCallback((checked: boolean) => {
    setSampleMode(checked)
    if (checked) {
      setEditions(MOCK_EDITIONS)
      setMetrics(MOCK_METRICS)
      setPipelineStages([
        { name: 'Research', icon: <FiSearch size={14} />, status: 'complete' },
        { name: 'Edit', icon: <FiEdit3 size={14} />, status: 'complete' },
        { name: 'Infographic', icon: <FiImage size={14} />, status: 'complete' },
        { name: 'Deliver', icon: <FiSend size={14} />, status: 'complete' },
      ])
    } else {
      setEditions([])
      setMetrics({ todayStatus: 'pending', totalEditions: 0, currentStreak: 0, subscriberCount: 0, subscriberGrowth: 0 })
      setPipelineStages([
        { name: 'Research', icon: <FiSearch size={14} />, status: 'idle' },
        { name: 'Edit', icon: <FiEdit3 size={14} />, status: 'idle' },
        { name: 'Infographic', icon: <FiImage size={14} />, status: 'idle' },
        { name: 'Deliver', icon: <FiSend size={14} />, status: 'idle' },
      ])
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} pipelineOverall={pipelineOverall} />

      <div className="flex-1 min-h-screen">
        <header className="px-8 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            {statusMsg && (
              <div className={`text-xs tracking-wider ${statusMsg.type === 'success' ? 'text-emerald-400' : statusMsg.type === 'error' ? 'text-red-400' : 'text-primary'}`}>
                {statusMsg.text}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="sample-toggle" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Sample Data</Label>
            <Switch id="sample-toggle" checked={sampleMode} onCheckedChange={handleSampleToggle} />
          </div>
        </header>

        <ScrollArea className="h-[calc(100vh-57px)]">
          <main className="p-8 max-w-6xl">
            {activeTab === 'overview' && (
              <OverviewScreen
                metrics={metrics}
                editions={editions}
                pipelineStages={pipelineStages}
                loading={loading}
                onRegenDraft={handleRegenDraft}
                onRegenImage={() => handleRegenImage()}
                onResend={handleResend}
                onDeliverToEmail={openDeliverDialog}
                activeAgentId={activeAgentId}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsScreen editions={editions} />
            )}

            {activeTab === 'gallery' && (
              <GalleryScreen
                editions={editions}
                onRegenImage={(title) => handleRegenImage(title)}
                loading={loading}
              />
            )}

            {activeTab === 'editions' && (
              <EditionsScreen editions={editions} onDeliverToEmail={openDeliverDialog} loading={loading || deliverLoading} />
            )}

            {activeTab === 'settings' && (
              <SettingsScreen
                schedules={scheduleData}
                onToggleSchedule={handleToggleSchedule}
                onTriggerNow={handleTriggerNow}
                schedulesLoading={schedulesLoading}
                statusMsg={statusMsg}
                deliveryTime={deliveryTime}
                setDeliveryTime={setDeliveryTime}
                subscriberEmails={subscriberEmails}
                setSubscriberEmails={setSubscriberEmails}
                autoDelivery={autoDelivery}
                setAutoDelivery={setAutoDelivery}
                onSaveSettings={handleSaveSettings}
                settingsSaved={settingsSaved}
              />
            )}
          </main>
        </ScrollArea>
      </div>

      <DeliverEmailDialog
        open={deliverDialogOpen}
        onOpenChange={(open) => { if (!deliverLoading) setDeliverDialogOpen(open) }}
        edition={deliverEdition}
        loading={deliverLoading}
        onDeliver={handleDeliverToEmail}
      />
    </div>
  )
}
