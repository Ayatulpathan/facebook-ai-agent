import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  Palette,
  ShieldAlert,
  DollarSign
} from 'lucide-react'
import { api } from '../services/api'
import { BrandProfile } from '../types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'

export const BrandProfilePage: React.FC = () => {
  const queryClient = useQueryClient()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['brandProfile'],
    queryFn: () => api.getBrandProfile()
  })

  const [formData, setFormData] = useState<Partial<BrandProfile>>({})
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setFormData(profile)
    }
  }, [profile])

  const mutation = useMutation({
    mutationFn: (updated: Partial<BrandProfile>) => api.updateBrandProfile(updated),
    onSuccess: (data) => {
      queryClient.setQueryData(['brandProfile'], data)
      setSaveSuccess(true)
      setSaveError(null)
      setTimeout(() => setSaveSuccess(false), 3500)
    },
    onError: (err: any) => {
      setSaveError(err.message || 'Failed to save brand profile.')
    }
  })

  const handleChange = (field: keyof BrandProfile, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-slate-400 text-sm">
        Loading brand profile configuration...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-500" />
            Brand Profile & Operating Guidelines
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure the core identity, brand colors, voice tone, verified pricing, and strict negative safety boundaries for all local AI agents.
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          isLoading={mutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-xs font-semibold px-4"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          Save Changes
        </Button>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Brand profile and AI boundary guidelines updated successfully.</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Facebook Page & Brand Identity */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold">1. Page Identity & Voice Tone</CardTitle>
            <CardDescription className="text-xs">
              Primary brand information shared with all content generation agents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Facebook Page Name"
                value={formData.page_name || ''}
                onChange={(e) => handleChange('page_name', e.target.value)}
                placeholder="e.g. Apex Tech Solutions"
                required
              />
              <Input
                label="Supported Languages"
                value={formData.languages || ''}
                onChange={(e) => handleChange('languages', e.target.value)}
                placeholder="Bangla, English"
                required
              />
            </div>

            <Textarea
              label="Page Description"
              value={formData.page_description || ''}
              onChange={(e) => handleChange('page_description', e.target.value)}
              placeholder="Brief summary of the Facebook page's public mission and offerings..."
              rows={2}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                label="Brand Core Identity & Values"
                value={formData.brand_identity || ''}
                onChange={(e) => handleChange('brand_identity', e.target.value)}
                placeholder="Professional, reliable, innovative, customer-obsessed..."
                rows={2}
              />
              <Textarea
                label="Writing Tone & Style"
                value={formData.writing_tone || ''}
                onChange={(e) => handleChange('writing_tone', e.target.value)}
                placeholder="Engaging, Friendly, Professional, Action-oriented..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Visual Identity & Brand Colors */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-400" />
              2. Visual Styling & Promotional Colors
            </CardTitle>
            <CardDescription className="text-xs">
              Used by Graphic Studio and SVG promotional templates for on-brand asset generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primary_color || '#1877F2'}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="w-10 h-10 rounded border border-slate-700 bg-transparent cursor-pointer p-0.5"
                  />
                  <Input
                    value={formData.primary_color || '#1877F2'}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.secondary_color || '#42B72A'}
                    onChange={(e) => handleChange('secondary_color', e.target.value)}
                    className="w-10 h-10 rounded border border-slate-700 bg-transparent cursor-pointer p-0.5"
                  />
                  <Input
                    value={formData.secondary_color || '#42B72A'}
                    onChange={(e) => handleChange('secondary_color', e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Brand Logo Path / URL"
                  value={formData.brand_logo_url || ''}
                  onChange={(e) => handleChange('brand_logo_url', e.target.value)}
                  placeholder="/media/logo.png"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Commercial Data & Verified Pricing */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              3. Products, Verified Prices & Contact
            </CardTitle>
            <CardDescription className="text-xs">
              <strong>CRITICAL ANTI-HALLUCINATION RULE:</strong> AI agents will only quote prices explicitly listed here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="Verified Prices & Official Packages"
              value={formData.verified_prices || ''}
              onChange={(e) => handleChange('verified_prices', e.target.value)}
              placeholder="e.g. Basic Package: 1,500 BDT, Pro Package: 3,500 BDT, Consultation: Free"
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                label="Products & Services Catalog"
                value={formData.products_and_services || ''}
                onChange={(e) => handleChange('products_and_services', e.target.value)}
                placeholder="List available items, features, guarantees, warranties..."
                rows={3}
              />
              <Textarea
                label="Official Contact Information"
                value={formData.contact_details || ''}
                onChange={(e) => handleChange('contact_details', e.target.value)}
                placeholder="Official WhatsApp, hotline, support email, physical address..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Default Call-To-Action (CTA)"
                value={formData.preferred_cta || ''}
                onChange={(e) => handleChange('preferred_cta', e.target.value)}
                placeholder="Send Message / Order Now"
              />
              <Input
                label="Target Audience Overview"
                value={formData.target_audience || ''}
                onChange={(e) => handleChange('target_audience', e.target.value)}
                placeholder="Age 20-40, urban tech consumers, business owners"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Strict Prohibitions & Negative Rules */}
        <Card className="border-red-900/40 bg-slate-900/60">
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold text-red-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              4. Prohibited Claims & Sensitive Topics (Safety Rail)
            </CardTitle>
            <CardDescription className="text-xs">
              Strict rules enforced during local quality-check evaluation before content reaches the approval queue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="Prohibited Claims (Must Never Be Stated)"
              value={formData.prohibited_claims || ''}
              onChange={(e) => handleChange('prohibited_claims', e.target.value)}
              placeholder="Do not promise instant profits, unverified medical cures, or guarantee 100% results..."
              rows={2}
            />
            <Textarea
              label="Prohibited Topics"
              value={formData.prohibited_topics || ''}
              onChange={(e) => handleChange('prohibited_topics', e.target.value)}
              placeholder="Political endorsements, religious controversies, competitor bashing..."
              rows={2}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            isLoading={mutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Brand Guidelines
          </Button>
        </div>
      </form>
    </div>
  )
}
