import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Lightbulb,
  Sparkles,
  Calendar,
  Send,
  CheckCircle2
} from 'lucide-react'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'

export const StrategyPage: React.FC = () => {
  const [selectedNicheId, setSelectedNicheId] = useState<number | null>(null)
  const [timeframe, setTimeframe] = useState<string>('weekly')
  const [goals, setGoals] = useState<string>('organic audience growth and trusted customer engagement')
  const [plan, setPlan] = useState<any>(null)
  const [draftingItemIdx, setDraftingItemIdx] = useState<number | null>(null)
  const [draftStatus, setDraftStatus] = useState<string | null>(null)

  const { data: niches, isLoading: nichesLoading } = useQuery({
    queryKey: ['niches'],
    queryFn: () => api.getNiches(true)
  })

  React.useEffect(() => {
    if (niches && niches.length > 0 && selectedNicheId === null) {
      setSelectedNicheId(niches[0].id)
    }
  }, [niches, selectedNicheId])

  // Strategy generation mutation
  const strategyMutation = useMutation({
    mutationFn: () => api.generateStrategy({
      niche_id: selectedNicheId!,
      timeframe: timeframe,
      goals: goals
    }),
    onSuccess: (data) => {
      setPlan(data)
    }
  })

  // Quick Draft post from strategy item
  const draftMutation = useMutation({
    mutationFn: (item: any) => api.generatePost({
      niche_id: selectedNicheId,
      topic: item.topic,
      post_type: (item.post_type || 'educational').toLowerCase(),
      language: 'both',
      save_as_draft: true
    }),
    onSuccess: (data) => {
      setDraftStatus(`Draft created successfully! Post ID: #${data.saved_content_id}`)
      setTimeout(() => setDraftStatus(null), 4000)
    }
  })

  const handleCreateDraft = (item: any, idx: number) => {
    setDraftingItemIdx(idx)
    draftMutation.mutate(item)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Lightbulb className="w-6 h-6 text-blue-500" />
            Content Strategy & Editorial Calendar
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Architect high-converting weekly and monthly editorial roadmaps tailored to each target audience.
          </p>
        </div>
      </div>

      {draftStatus && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{draftStatus}</span>
        </div>
      )}

      {/* Strategy Generator Settings Card */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                Target Niche
              </label>
              <select
                value={selectedNicheId || ''}
                onChange={(e) => setSelectedNicheId(Number(e.target.value))}
                className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={nichesLoading}
              >
                {niches?.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                Planning Horizon
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="weekly">Weekly Plan (5-7 Days)</option>
                <option value="monthly">Monthly Overview (4 Weeks)</option>
                <option value="daily">Daily Intensive (3 Angles)</option>
              </select>
            </div>

            <div>
              <Input
                label="Campaign Goal"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g. Inquiries, Trust, Shares"
              />
            </div>

            <div>
              <Button
                onClick={() => strategyMutation.mutate()}
                isLoading={strategyMutation.isPending}
                disabled={!selectedNicheId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold h-10"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate Strategy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Strategy Plan Display */}
      {plan && (
        <div className="space-y-6">
          {/* Plan Summary Card */}
          <Card className="border-blue-900/40 bg-blue-950/20">
            <CardHeader className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-white">
                    {plan.strategy_title}
                  </CardTitle>
                  <CardDescription className="text-xs text-blue-300/80 mt-1">
                    Target Demographic: {plan.target_demographic}
                  </CardDescription>
                </div>
                {plan.campaign_mix && (
                  <div className="flex items-center gap-2 text-[11px] font-medium">
                    <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700/60">
                      Edu: {plan.campaign_mix.educational}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700/60">
                      Eng: {plan.campaign_mix.engagement}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700/60">
                      Promo: {plan.campaign_mix.promotional}%
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="py-2 text-xs text-slate-300 leading-relaxed">
              {plan.summary}
            </CardContent>
          </Card>

          {/* Day by Day Plan Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-xs">
              Editorial Execution Schedule ({plan.items?.length || 0} Posts)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.items?.map((item: any, idx: number) => (
                <Card key={idx} className="border-slate-800 bg-slate-900/70 hover:border-slate-700 flex flex-col justify-between">
                  <div>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400 font-mono">
                          {item.day || `Step #${idx + 1}`}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {item.post_type}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-semibold text-white mt-1">
                        {item.topic}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="py-2 text-xs space-y-2 text-slate-300">
                      <p className="leading-relaxed">{item.concept}</p>
                      <div className="text-[11px] text-slate-400">
                        <strong>Suggested CTA:</strong> {item.suggested_cta}
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-3 border-t border-slate-800/60 bg-slate-950/40 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={draftMutation.isPending && draftingItemIdx === idx}
                      onClick={() => handleCreateDraft(item, idx)}
                      className="text-xs h-7 bg-blue-600 hover:bg-blue-700 font-medium"
                    >
                      <Send className="w-3 h-3 mr-1.5" />
                      Generate Draft Post
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!plan && !strategyMutation.isPending && (
        <Card className="border-dashed border-slate-800 py-12 text-center bg-slate-950/30">
          <Calendar className="w-12 h-12 mx-auto text-slate-600 mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-white">Generate Your Multi-Day Editorial Strategy</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Choose a niche and timeline above to architect a balanced calendar of educational, engagement, and promotional posts.
          </p>
        </Card>
      )}
    </div>
  )
}
