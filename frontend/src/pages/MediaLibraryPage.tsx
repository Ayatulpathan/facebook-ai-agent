import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Download,
  Video,
  CheckCircle2,
  AlertCircle,
  HardDrive
} from 'lucide-react'
import { api } from '../services/api'
import { Card } from '../components/ui/Card'

export const MediaLibraryPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [filterType, setFilterType] = useState<string>('all')
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { data: mediaAssets, isLoading } = useQuery({
    queryKey: ['mediaAssets', filterType],
    queryFn: () => api.getMedia(filterType === 'all' ? undefined : filterType)
  })

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadMedia(formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mediaAssets'] })
      setUploadMessage(`Successfully uploaded ${data.filename}`)
      setErrorMessage(null)
      setTimeout(() => setUploadMessage(null), 3500)
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to upload media file.")
    }
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaAssets'] })
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const formData = new FormData()
      formData.append('file', file)
      uploadMutation.mutate(formData)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-blue-500" />
            Local Media Asset Library
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage product images, logos, rendered graphics, and video clips stored locally in /data/media/.
          </p>
        </div>

        {/* Upload Trigger Button */}
        <div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*,video/mp4"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Upload Media File
            </span>
          </label>
        </div>
      </div>

      {uploadMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          All Assets ({mediaAssets?.length || 0})
        </button>
        <button
          onClick={() => setFilterType('image')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'image'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Images
        </button>
        <button
          onClick={() => setFilterType('video')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'video'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Videos (Reels)
        </button>
      </div>

      {/* Media Assets Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">Loading media assets...</div>
      ) : mediaAssets && mediaAssets.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {mediaAssets.map((asset: any) => {
            const isVideo = asset.file_type.startsWith('video/')
            return (
              <Card key={asset.id} className="border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col justify-between group">
                <div className="relative aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
                  {isVideo ? (
                    <video
                      src={asset.file_path}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={asset.file_path}
                      alt={asset.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  {asset.is_generated && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-blue-600/90 text-white text-[9px] font-bold uppercase tracking-wider">
                      Studio
                    </div>
                  )}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                      <Video className="w-8 h-8 text-white drop-shadow" />
                    </div>
                  )}
                </div>

                <div className="p-2.5 space-y-1.5 text-xs">
                  <p className="font-semibold text-slate-200 truncate text-[11px]" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{asset.dimensions || 'Unknown'}</span>
                    <span>{Math.round(asset.file_size_bytes / 1024)} KB</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <a
                      href={asset.file_path}
                      download={asset.filename}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-white"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => deleteMutation.mutate(asset.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-dashed border-slate-800 py-16 text-center bg-slate-950/30">
          <HardDrive className="w-12 h-12 mx-auto text-slate-600 mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-white">Media Library is Empty</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Upload product photos and logos here, or render graphics in Graphic Studio to populate your local library.
          </p>
        </Card>
      )}
    </div>
  )
}
