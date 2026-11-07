import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Sparkles,
  Save,
  CheckCircle2,
  Calendar,
  Send,
  Image as ImageIcon,
  Check,
  ShieldCheck
} from 'lucide-react'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Textarea } from '../components/ui/Input'

export const ContentStudioPage: React.FC = () => {
  const [nicheId, setNicheId] = useState<number | null>(null)
  const [postType, setPostType] = useState('promotional')
  const [language, setLanguage] = useState('both')
  const [topic, setTopic] = useState('')
  
  // Post Form State
  const [title, setTitle] = useState('')
  const [captionBn, setCaptionBn] = useState('')
  const [captionEn, setCaptionEn] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [cta, setCta] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [qcNotes, setQcNotes] = useState<string | null>(null)
  const [qcScore, setQcScore] = useState<number | null>(null)
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { data: niches } = useQuery({
    queryKey: ['niches'],
    queryFn: () => api.getNiches(true)
  })

  const { data: mediaAssets } = useQuery({
    queryKey: ['mediaAssets'],
    queryFn: () => api.getMedia()
  })

  React.useEffect(() => {
    if (niches && niches.length > 0 && nicheId === null) {
      setNicheId(niches[0].id)
    }
  }, [niches, nicheId])

  // AI Generation Mutation
  const generateMutation = useMutation({
    mutationFn: () => api.generatePost({
      niche_id: nicheId,
      topic: topic,
      post_type: postType,
      language: language,
      save_as_draft: false
    }),
    onSuccess: (data) => {
      setTitle(data.title || topic)
      setCaptionBn(data.caption_bn || '')
      setCaptionEn(data.caption_en || '')
      setHashtags(data.hashtags || '')
      setCta(data.call_to_action || '')
      if (data.quality_check) {
        setQcScore(data.quality_check.score)
        setQcNotes(data.quality_check.notes)
      }
    }
  })

  // Save / Submit Mutation
  const savePostMutation = useMutation({
    mutationFn: (asPendingApproval: boolean) => api.createContent({
      niche_id: nicheId,
      title: title || topic || 'Untitled Post',
      content_type: 'post',
      language: language,
      caption_bn: captionBn,
      caption_en: captionEn,
      hashtags: hashtags,
      call_to_action: cta,
      media_asset_ids: selectedMediaId ? [selectedMediaId] : [],
      scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      status: asPendingApproval ? 'Pending Approval' : 'Draft'
    }),
    onSuccess: (_, asPendingApproval) => {
      setSuccessMessage(
        asPendingApproval
          ? "Post successfully submitted to Approval Center! Requires admin authorization before publishing."
          : "Post saved as Draft in SQLite database."
      )
      setTimeout(() => setSuccessMessage(null), 4500)
    }
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-blue-500" />
            AI Content Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Craft, generate, review, and stage Facebook posts in Bangla & English with zero price hallucination.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Generator Prompt Bar */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div className="sm:col-span-2">
              <Input
                label="Topic, Product, or Announcement Concept"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 5 Signs your laptop needs thermal paste replacement"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                Target Niche
              </label>
              <select
                value={nicheId || ''}
                onChange={(e) => setNicheId(Number(e.target.value))}
                className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                Type & Language
              </label>
              <div className="flex gap-2">
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="promotional">Promotional</option>
                  <option value="educational">Educational</option>
                  <option value="engagement">Engagement</option>
                  <option value="festival">Festival</option>
                </select>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="both">Both</option>
                  <option value="bn">Bangla</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div>
              <Button
                onClick={() => generateMutation.mutate()}
                isLoading={generateMutation.isPending}
                disabled={!topic.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold h-10"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor & Metadata Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Content */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Post Editor</CardTitle>
                {qcScore !== null && (
                  <Badge variant={qcScore >= 0.7 ? "success" : "warning"}>
                    QC Compliance: {Math.round(qcScore * 100)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <Input
                label="Post Title / Headline"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Headline for internal reference & preview..."
              />

              <Textarea
                label="Bangla Caption (বাংলা পোস্টের বিবরণ)"
                value={captionBn}
                onChange={(e) => setCaptionBn(e.target.value)}
                placeholder="বাংলা ক্যাপশন লিখুন বা AI দিয়ে তৈরি করুন..."
                rows={4}
              />

              <Textarea
                label="English Caption"
                value={captionEn}
                onChange={(e) => setCaptionEn(e.target.value)}
                placeholder="English caption here..."
                rows={4}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Target Hashtags"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#Tech #Bangladesh #Solutions"
                />
                <Input
                  label="Call to Action (CTA)"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Send Message / Shop Now"
                />
              </div>

              {/* Quality Audit Notice */}
              {qcNotes && (
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-300 mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Quality Control Audit
                  </div>
                  <p>{qcNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Media Attachment & Scheduling */}
        <div className="space-y-4">
          {/* Scheduling Card */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Publishing Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Input
                label="Scheduled Date & Time (Local Time)"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                Leave empty to keep as unscheduled draft.
              </p>
            </CardContent>
          </Card>

          {/* Media Asset Picker */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                Attach Media Asset
              </CardTitle>
              <CardDescription className="text-xs">
                Select from local Media Library.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {mediaAssets && mediaAssets.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {mediaAssets.map((asset: any) => {
                    const isSelected = selectedMediaId === asset.id
                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedMediaId(isSelected ? null : asset.id)}
                        className={`relative rounded-lg overflow-hidden border cursor-pointer aspect-square bg-slate-950 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/40'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {asset.file_type.startsWith('image/') ? (
                          <img
                            src={asset.file_path}
                            alt={asset.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-[10px] text-center p-1 text-slate-400">
                            🎬 Video Reel
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  No media uploaded yet. You can render graphics in Graphic Studio or upload in Media Library.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={() => savePostMutation.mutate(false)}
              isLoading={savePostMutation.isPending}
              variant="outline"
              className="w-full text-xs font-semibold h-10 border-slate-700 text-slate-300 hover:text-white"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Save as Draft
            </Button>

            <Button
              onClick={() => savePostMutation.mutate(true)}
              isLoading={savePostMutation.isPending}
              className="w-full text-xs font-semibold h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Submit to Approval Center
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
