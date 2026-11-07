import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Users,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { api } from '../services/api'
import { Niche, NicheFormData } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'

export const NichesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNiche, setEditingNiche] = useState<Niche | null>(null)
  const [deleteConfirmNiche, setDeleteConfirmNiche] = useState<Niche | null>(null)

  const [formData, setFormData] = useState<NicheFormData>({
    name: '',
    description: '',
    target_demographic: '',
    preferred_tone: 'Informative',
    preferred_cta: 'Learn More',
    sample_topics: '',
    is_active: true
  })

  const { data: niches, isLoading } = useQuery({
    queryKey: ['niches'],
    queryFn: () => api.getNiches()
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: NicheFormData) => api.createNiche(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niches'] })
      closeModal()
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NicheFormData> }) =>
      api.updateNiche(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niches'] })
      closeModal()
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteNiche(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niches'] })
      setDeleteConfirmNiche(null)
    }
  })

  const openCreateModal = () => {
    setEditingNiche(null)
    setFormData({
      name: '',
      description: '',
      target_demographic: '',
      preferred_tone: 'Informative',
      preferred_cta: 'Learn More',
      sample_topics: '',
      is_active: true
    })
    setIsModalOpen(true)
  }

  const openEditModal = (niche: Niche) => {
    setEditingNiche(niche)
    setFormData({
      name: niche.name,
      description: niche.description,
      target_demographic: niche.target_demographic,
      preferred_tone: niche.preferred_tone,
      preferred_cta: niche.preferred_cta,
      sample_topics: niche.sample_topics,
      is_active: niche.is_active
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingNiche(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingNiche) {
      updateMutation.mutate({ id: editingNiche.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const toggleNicheStatus = (niche: Niche) => {
    updateMutation.mutate({
      id: niche.id,
      data: { is_active: !niche.is_active }
    })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-blue-500" />
            Configurable Niches & Topics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage diverse industry verticals and content themes for your Facebook page without hardcoded limitations.
          </p>
        </div>
        <Button onClick={openCreateModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs font-semibold">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Business Niche
        </Button>
      </div>

      {/* Niches Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading configured niches...</div>
      ) : niches && niches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {niches.map((niche) => (
            <Card
              key={niche.id}
              className={`border transition-all flex flex-col justify-between ${
                niche.is_active
                  ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  : 'border-slate-800/50 bg-slate-950/40 opacity-70'
              }`}
            >
              <div>
                <CardHeader className="py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-white leading-snug">
                        {niche.name}
                      </CardTitle>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">/{niche.slug}</p>
                    </div>
                    <Badge variant={niche.is_active ? 'success' : 'outline'}>
                      {niche.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs py-2">
                  <p className="text-slate-300 leading-relaxed min-h-[3rem]">
                    {niche.description || 'No description provided.'}
                  </p>

                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">
                        <strong>Audience:</strong> {niche.target_demographic || 'General'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">
                        <strong>Tone:</strong> {niche.preferred_tone || 'Standard'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        <strong>CTA:</strong> {niche.preferred_cta || 'Default'}
                      </span>
                    </div>
                  </div>

                  {niche.sample_topics && (
                    <div className="pt-1">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Sample Focus Topics:
                      </p>
                      <p className="text-[11px] text-slate-400 italic line-clamp-2">
                        {niche.sample_topics}
                      </p>
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-3 border-t border-slate-800/60 flex items-center justify-between bg-slate-950/40">
                <button
                  onClick={() => toggleNicheStatus(niche)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {niche.is_active ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-slate-500" />
                      <span>Paused</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(niche)}
                    className="h-7 px-2 text-xs text-slate-300 hover:text-white"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmNiche(niche)}
                    className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-slate-800 py-12 text-center">
          <Layers className="w-12 h-12 mx-auto text-slate-600 mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-white">No Niches Configured</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Create your first niche to target specific products, services, or audience topics.
          </p>
          <Button onClick={openCreateModal} size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1.5" />
            Add First Niche
          </Button>
        </Card>
      )}

      {/* Add / Edit Niche Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingNiche ? `Edit Niche: ${editingNiche.name}` : 'Create New Niche'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Niche / Category Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Organic Skincare, Tech Tutorials, Home Decor"
            required
          />

          <Textarea
            label="Description & Purpose"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what kind of content and products fit into this niche..."
            rows={2}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Target Demographic"
              value={formData.target_demographic}
              onChange={(e) => setFormData({ ...formData, target_demographic: e.target.value })}
              placeholder="e.g. Age 20-35, Working Women"
            />
            <Input
              label="Preferred Writing Tone"
              value={formData.preferred_tone}
              onChange={(e) => setFormData({ ...formData, preferred_tone: e.target.value })}
              placeholder="e.g. Educational, Enthusiastic"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Preferred Call-to-Action (CTA)"
              value={formData.preferred_cta}
              onChange={(e) => setFormData({ ...formData, preferred_cta: e.target.value })}
              placeholder="e.g. Order via Messenger"
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Active Status
              </label>
              <div className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  id="is_active_checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                />
                <label htmlFor="is_active_checkbox" className="text-xs text-slate-300">
                  Enable this niche for content generation
                </label>
              </div>
            </div>
          </div>

          <Textarea
            label="Sample Topics / Keywords"
            value={formData.sample_topics}
            onChange={(e) => setFormData({ ...formData, sample_topics: e.target.value })}
            placeholder="Key themes, popular questions, seasonal hooks (comma-separated)..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={closeModal} size="sm">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              {editingNiche ? 'Save Changes' : 'Create Niche'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmNiche && (
        <Modal
          isOpen={Boolean(deleteConfirmNiche)}
          onClose={() => setDeleteConfirmNiche(null)}
          title="Confirm Niche Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Are you sure you want to delete the niche <strong>{deleteConfirmNiche.name}</strong>?
            </p>
            <p className="text-slate-500">
              This action will unassign any associated content drafts. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmNiche(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirmNiche.id)}
              >
                Delete Niche
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
