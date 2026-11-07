import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Palette,
  Sparkles,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  Check
} from 'lucide-react'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Textarea } from '../components/ui/Input'

export const GraphicStudioPage: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('promotional')
  const [primaryColor, setPrimaryColor] = useState('#1877F2')
  const [secondaryColor, setSecondaryColor] = useState('#42B72A')
  const [format, setFormat] = useState('PNG')

  // Form Fields State
  const [fields, setFields] = useState<Record<string, string>>({
    title: 'Transform Your Business Workflow with AI',
    subtitle: 'Proven local tools, verified pricing & instant setup',
    badge_text: 'Featured Announcement',
    cta_text: 'Send Message Now',
    price_text: '500 BDT Standard Plan',
    quote: 'Innovation begins when complexity is made simple.',
    author: 'Tech Director',
    details: 'Limited availability this week across all service categories.'
  })

  const [renderedAsset, setRenderedAsset] = useState<any>(null)
  const [successNote, setSuccessNote] = useState<string | null>(null)

  const { data: templateSpecs } = useQuery({
    queryKey: ['graphicTemplates'],
    queryFn: () => api.getGraphicTemplates()
  })

  const { data: brand } = useQuery({
    queryKey: ['brandProfile'],
    queryFn: () => api.getBrandProfile()
  })

  React.useEffect(() => {
    if (brand) {
      if (brand.primary_color) setPrimaryColor(brand.primary_color)
      if (brand.secondary_color) setSecondaryColor(brand.secondary_color)
    }
  }, [brand])

  const renderMutation = useMutation({
    mutationFn: () => api.renderGraphic({
      template: selectedTemplate,
      data: fields,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      format: format
    }),
    onSuccess: (data) => {
      setRenderedAsset(data)
      setSuccessNote("Graphic rendered successfully and saved to Media Library!")
      setTimeout(() => setSuccessNote(null), 4000)
    }
  })

  const handleFieldChange = (key: string, val: string) => {
    setFields(prev => ({ ...prev, [key]: val }))
  }

  const templatesList = templateSpecs?.templates ? Object.keys(templateSpecs.templates) : [
    "promotional",
    "product_showcase",
    "sale_announcement",
    "festival_greeting",
    "educational",
    "quote_graphic",
    "price_card",
    "announcement_banner"
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Palette className="w-6 h-6 text-blue-500" />
            Graphic Design Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Render professional 1080x1080 promotional graphics via local vector canvas without heavy GPU overhead.
          </p>
        </div>
      </div>

      {successNote && (
        <div className="p-3.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNote}</span>
        </div>
      )}

      {/* Template Selector Grid */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
          Select Template Style (8 Built-in Layouts)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {templatesList.map((tplKey) => {
            const isSelected = selectedTemplate === tplKey
            const info = templateSpecs?.templates?.[tplKey]
            return (
              <button
                key={tplKey}
                onClick={() => setSelectedTemplate(tplKey)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/40 text-blue-200 shadow-sm shadow-blue-500/20'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-xs capitalize flex items-center justify-between">
                  <span>{tplKey.replace('_', ' ')}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                  {info?.description || 'Custom template layout'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Editor & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Customization Controls */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold">Customize Content & Colors</CardTitle>
            <CardDescription className="text-xs">
              Parameters are injected into the 1080x1080 canvas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <Input
              label="Headline / Title"
              value={fields.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Main headline text..."
            />

            <Textarea
              label="Subtitle / Supporting Text"
              value={fields.subtitle || ''}
              onChange={(e) => handleFieldChange('subtitle', e.target.value)}
              placeholder="Detailed description, greeting, or explanation..."
              rows={2}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Badge / Tag Text"
                value={fields.badge_text || ''}
                onChange={(e) => handleFieldChange('badge_text', e.target.value)}
                placeholder="e.g. Special Offer / Tip #1"
              />
              <Input
                label="Call to Action (CTA)"
                value={fields.cta_text || ''}
                onChange={(e) => handleFieldChange('cta_text', e.target.value)}
                placeholder="e.g. Message Page Now"
              />
            </div>

            <Input
              label="Price Badge Text (Optional)"
              value={fields.price_text || ''}
              onChange={(e) => handleFieldChange('price_text', e.target.value)}
              placeholder="e.g. 500 BDT Standard Plan"
            />

            {/* Colors & Format */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-[11px] text-slate-300">{primaryColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  Secondary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-[11px] text-slate-300">{secondaryColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  Export Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="flex h-8 w-full rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100"
                >
                  <option value="PNG">PNG (High Quality)</option>
                  <option value="JPEG">JPEG (Compressed)</option>
                </select>
              </div>
            </div>

            <Button
              onClick={() => renderMutation.mutate()}
              isLoading={renderMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold h-10 mt-2"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Render & Save to Media Library
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Live Rendered Output */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Rendered Canvas Preview</CardTitle>
              <Badge variant="outline">1080 × 1080 px</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            {renderedAsset ? (
              <div className="space-y-3 w-full flex flex-col items-center">
                <div className="rounded-xl overflow-hidden border border-slate-800 shadow-2xl max-w-sm aspect-square bg-slate-950">
                  <img
                    src={renderedAsset.file_path}
                    alt="Rendered graphic"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={renderedAsset.file_path}
                    download={renderedAsset.filename}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300">
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download {renderedAsset.filename}
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-500 text-xs space-y-2">
                <ImageIcon className="w-12 h-12 mx-auto text-slate-600 opacity-40" />
                <p>Click "Render & Save to Media Library" to generate the 1080x1080 visual asset.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
