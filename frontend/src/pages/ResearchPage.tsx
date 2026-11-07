import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Compass,
  Sparkles,
  BookmarkPlus,
  CheckCircle2
} from 'lucide-react'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

export const ResearchPage: React.FC = () => {
  const [selectedNicheId, setSelectedNicheId] = useState<number | null>(null)
  const [category, setCategory] = useState<string>('all')
  const [ideas, setIdeas] = useState<any[]>([])
  const [savedIdeaIds, setSavedIdeaIds] = useState<Set<string>>(new Set())

  const { data: niches, isLoading: nichesLoading } = useQuery({
    queryKey: ['niches'],
    queryFn: () => api.getNiches(true)
  })

  // Set default selected niche
  React.useEffect(() => {
    if (niches && niches.length > 0 && selectedNicheId === null) {
      setSelectedNicheId(niches[0].id)
    }
  }, [niches, selectedNicheId])

  // Research mutation
  const researchMutation = useMutation({
    mutationFn: () => api.researchTopics({
      niche_id: selectedNicheId!,
      category: category
    }),
    onSuccess: (data) => {
      setIdeas(data.ideas || [])
    }
  })

  // Save idea mutation
  const saveIdeaMutation = useMutation({
    mutationFn: (idea: { title: string; concept: string; category: string }) =>
      api.saveIdea({
        niche_id: selectedNicheId || undefined,
        title: idea.title,
        concept: idea.concept,
        category: idea.category
      }),
    onSuccess: (_, idea) => {
      setSavedIdeaIds(prev => new Set(prev).add(idea.title))
    }
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-blue-500" />
            Content Topic & Opportunity Research
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Discover seasonal hooks, customer FAQs, and educational angles. Transparently labeled as local AI ideation.
          </p>
        </div>
      </div>

      {/* Control Card */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                Target Business Niche
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
                Research Focus Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="seasonal">Seasonal & Festive Occasions</option>
                <option value="faq">Frequently Asked Questions</option>
                <option value="educational">Educational Guides & Tutorials</option>
                <option value="trending_concepts">Trending Concept Hooks</option>
              </select>
            </div>

            <div>
              <Button
                onClick={() => researchMutation.mutate()}
                isLoading={researchMutation.isPending}
                disabled={!selectedNicheId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold h-10"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Conduct Topic Research
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Grid */}
      {ideas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">
              Generated Research Opportunities ({ideas.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              🏷️ Labeled as local AI creative concepts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideas.map((item, idx) => {
              const isSaved = savedIdeaIds.has(item.title)
              return (
                <Card key={idx} className="border-slate-800 bg-slate-900/70 hover:border-slate-700 flex flex-col justify-between">
                  <CardHeader className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Badge variant="info" className="uppercase text-[10px]">
                          {item.category || 'General'}
                        </Badge>
                        <CardTitle className="text-sm font-bold text-white mt-1 leading-snug">
                          {item.title}
                        </CardTitle>
                      </div>
                      <Button
                        variant={isSaved ? "outline" : "secondary"}
                        size="sm"
                        disabled={isSaved || saveIdeaMutation.isPending}
                        onClick={() => saveIdeaMutation.mutate(item)}
                        className={`text-xs h-8 px-2.5 shrink-0 ${isSaved ? 'text-emerald-400 border-emerald-800 bg-emerald-950/20' : ''}`}
                      >
                        {isSaved ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Saved
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5 mr-1" />
                            Save Idea
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 text-xs space-y-3">
                    <p className="text-slate-300 leading-relaxed">
                      {item.concept}
                    </p>
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Source: {item.source_label || 'Local Strategy Engine'}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {ideas.length === 0 && !researchMutation.isPending && (
        <Card className="border-dashed border-slate-800 py-12 text-center bg-slate-950/30">
          <Compass className="w-12 h-12 mx-auto text-slate-600 mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-white">Ready for Topic Discovery</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Select a business niche above and click "Conduct Topic Research" to generate topic angles and customer FAQs.
          </p>
        </Card>
      )}
    </div>
  )
}
