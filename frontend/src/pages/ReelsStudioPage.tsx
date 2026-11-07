import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Film,
  Sparkles,
  CheckCircle2,
  Video,
  Download
} from 'lucide-react'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'

export const ReelsStudioPage: React.FC = () => {
  const [topic, setTopic] = useState('3 Fast Ways to Speed Up Your Windows PC')
  const [nicheId, setNicheId] = useState<number | null>(null)
  const [duration, setDuration] = useState<number>(15)
  const [scriptData, setScriptData] = useState<any>(null)
  const [previewMode, setPreviewMode] = useState<boolean>(true)
  const [renderedReel, setRenderedReel] = useState<any>(null)
  const [renderSuccess, setRenderSuccess] = useState<string | null>(null)

  const { data: niches } = useQuery({
    queryKey: ['niches'],
    queryFn: () => api.getNiches(true)
  })

  React.useEffect(() => {
    if (niches && niches.length > 0 && nicheId === null) {
      setNicheId(niches[0].id)
    }
  }, [niches, nicheId])

  // Script Generator Mutation
  const scriptMutation = useMutation({
    mutationFn: () => api.generateReelScript({
      topic: topic,
      niche_id: nicheId || undefined,
      duration_seconds: duration
    }),
    onSuccess: (data) => {
      setScriptData(data)
    }
  })

  // FFmpeg Video Render Mutation
  const renderMutation = useMutation({
    mutationFn: () => api.renderReel({
      title: scriptData?.title?.replace('Reel: ', '') || topic,
      subtitle: scriptData?.scenes?.[0]?.subtitle || 'Top verified tips for quick results',
      duration_seconds: 6,
      preview_mode: previewMode
    }),
    onSuccess: (data) => {
      setRenderedReel(data)
      setRenderSuccess("Vertical MP4 Reel rendered and validated by FFmpeg successfully!")
      setTimeout(() => setRenderSuccess(null), 4500)
    }
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Film className="w-6 h-6 text-blue-500" />
            Reels Studio & FFmpeg Assembly
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create scene-by-scene vertical storyboards and compile local MP4 video clips via FFmpeg.
          </p>
        </div>
      </div>

      {renderSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{renderSuccess}</span>
        </div>
      )}

      {/* Script Generator Input Bar */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div className="sm:col-span-2">
              <Input
                label="Reel Concept or Hook Idea"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 3 Secret Chrome shortcuts everyone should know"
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
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>15 Seconds (Short)</option>
                <option value={30}>30 Seconds (Standard)</option>
                <option value={60}>60 Seconds (Deep Dive)</option>
              </select>
            </div>

            <div>
              <Button
                onClick={() => scriptMutation.mutate()}
                isLoading={scriptMutation.isPending}
                disabled={!topic.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold h-10"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate Script
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Grid: Script & Video Player */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Scene-by-Scene Storyboard */}
        <div className="lg:col-span-2 space-y-4">
          {scriptData ? (
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{scriptData.title}</CardTitle>
                  <Badge variant="info">Estimated: {scriptData.duration_est}</Badge>
                </div>
                <CardDescription className="text-xs">{scriptData.concept}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Scenes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Scene-by-Scene Storyboard
                  </h4>
                  {scriptData.scenes?.map((sc: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-400 font-mono">
                          Scene #{sc.scene_num} ({sc.duration})
                        </span>
                        <span className="text-[10px] text-slate-500">Visual & Audio Layer</span>
                      </div>
                      <p className="text-slate-200">
                        <strong>Visual Direction:</strong> {sc.visual}
                      </p>
                      <p className="text-slate-300">
                        <strong>Voiceover Script:</strong> "{sc.voiceover}"
                      </p>
                      <p className="text-emerald-400 font-mono text-[11px]">
                        <strong>Subtitle:</strong> {sc.subtitle}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Captions */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div>
                    <span className="font-semibold text-slate-400">Bangla Caption: </span>
                    <p className="text-slate-300 whitespace-pre-line mt-1 bg-slate-950/50 p-2.5 rounded border border-slate-800">
                      {scriptData.caption_bn}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">English Caption: </span>
                    <p className="text-slate-300 whitespace-pre-line mt-1 bg-slate-950/50 p-2.5 rounded border border-slate-800">
                      {scriptData.caption_en}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Hashtags: </span>
                    <span className="text-blue-400">{scriptData.hashtags}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-slate-800 py-16 text-center bg-slate-950/30">
              <Film className="w-12 h-12 mx-auto text-slate-600 mb-3 opacity-40" />
              <h3 className="text-sm font-semibold text-white">Generate a Reel Script</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Enter a topic above to produce a 3-scene storyboard with visual direction, voiceover lines, and subtitle text.
              </p>
            </Card>
          )}
        </div>

        {/* Right 1 Col: Video Renderer & Preview Player */}
        <div className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-400" />
                FFmpeg Video Compositor
              </CardTitle>
              <CardDescription className="text-xs">
                Local rendering optimized for 8 GB RAM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                  Resolution Profile
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      previewMode
                        ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                        : 'border-slate-800 bg-slate-950/50 text-slate-400'
                    }`}
                  >
                    <p className="font-bold text-[11px]">540 × 960</p>
                    <p className="text-[10px] text-slate-500">Fast Preview</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(false)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      !previewMode
                        ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                        : 'border-slate-800 bg-slate-950/50 text-slate-400'
                    }`}
                  >
                    <p className="font-bold text-[11px]">1080 × 1920</p>
                    <p className="text-[10px] text-slate-500">Full Vertical HD</p>
                  </button>
                </div>
              </div>

              <Button
                onClick={() => renderMutation.mutate()}
                isLoading={renderMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold h-10"
              >
                <Film className="w-4 h-4 mr-1.5" />
                Render Vertical Reel Video
              </Button>

              {/* Rendered Video Player */}
              {renderedReel && (
                <div className="pt-2 space-y-3">
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-[9/16] max-h-96 mx-auto flex items-center justify-center">
                    <video
                      controls
                      autoPlay
                      loop
                      src={renderedReel.file_path}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dimensions:</span>
                      <span className="font-mono text-slate-200">{renderedReel.dimensions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Validation:</span>
                      <span className="text-emerald-400 font-semibold">✓ Passed MP4 Checks</span>
                    </div>
                  </div>
                  <a href={renderedReel.file_path} download={renderedReel.filename}>
                    <Button variant="outline" size="sm" className="w-full text-xs border-slate-700 text-slate-300">
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download Reel (.mp4)
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
