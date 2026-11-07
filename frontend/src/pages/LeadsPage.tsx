import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users2,
  Download,
  Plus,
  Search,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  X
} from 'lucide-react'
import { api, LeadItem, LeadMetrics } from '../services/api'
import { Button } from '../components/ui/Button'

export const LeadsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // New Lead Form State
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [refUrl, setRefUrl] = useState('')
  const [inquiryType, setInquiryType] = useState('Product Inquiry')
  const [productInterest, setProductInterest] = useState('')
  const [notes, setNotes] = useState('')

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery<LeadItem[]>({
    queryKey: ['crmLeads', selectedStatus, searchQuery],
    queryFn: () => api.getLeads(
      selectedStatus === 'all' ? undefined : selectedStatus,
      searchQuery || undefined
    )
  })

  // Fetch metrics
  const { data: metrics } = useQuery<LeadMetrics>({
    queryKey: ['leadMetrics'],
    queryFn: () => api.getLeadMetrics()
  })

  // Update lead mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, update }: { id: number; update: Partial<LeadItem> }) =>
      api.updateLead(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmLeads'] })
      queryClient.invalidateQueries({ queryKey: ['leadMetrics'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
    }
  })

  // Create lead mutation
  const createMutation = useMutation({
    mutationFn: () => api.createLead({
      customer_name: name,
      contact_info: contact,
      facebook_reference: refUrl,
      inquiry_type: inquiryType,
      product_interest: productInterest,
      notes: notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmLeads'] })
      queryClient.invalidateQueries({ queryKey: ['leadMetrics'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
      setIsAddModalOpen(false)
      setName('')
      setContact('')
      setRefUrl('')
      setProductInterest('')
      setNotes('')
    }
  })

  const handleCopy = (id: number, text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleExportCsv = () => {
    window.open(api.getLeadsCsvDownloadUrl(), '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users2 className="h-7 w-7 text-blue-600" />
            Lead Management CRM
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customer inquiries, buying signals, and phone numbers captured automatically from comments and Messenger.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="flex items-center space-x-2 text-slate-700 dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Lead</span>
          </Button>
        </div>
      </div>

      {/* Metrics Funnel */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Leads</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {metrics?.total ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">New Inquiries</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {metrics?.new ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Contacted</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {metrics?.contacted ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Qualified</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics?.qualified ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Closed / Won</span>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
            {metrics?.closed ?? 0}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'New', 'Contacted', 'Qualified', 'Closed'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedStatus === st
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'All Leads' : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
            <span className="text-xs">Loading CRM leads...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users2 className="h-10 w-10 mx-auto mb-2 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No leads recorded</h3>
            <p className="text-xs text-slate-500 mt-1">
              Customer inquiries containing contact numbers or buying signals will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Inquiry / Interest</th>
                  <th className="py-3 px-4">Follow-up Status</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4">Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {l.customer_name}
                      </div>
                      {l.facebook_reference && (
                        <a
                          href={l.facebook_reference}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          Profile Link <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {l.contact_info ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                            {l.contact_info}
                          </span>
                          <button
                            onClick={() => handleCopy(l.id, l.contact_info)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copy Contact"
                          >
                            {copiedId === l.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None detected</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {l.inquiry_type}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {l.product_interest || 'General'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={l.follow_up_status}
                        onChange={(e) => updateMutation.mutate({ id: l.id, update: { follow_up_status: e.target.value } })}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                          l.follow_up_status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          l.follow_up_status === 'Contacted' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          l.follow_up_status === 'Qualified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <span className="text-slate-600 dark:text-slate-400 line-clamp-2">
                        {l.notes || '—'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Add Customer Lead
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone / Email
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. 01711223344"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Facebook Profile or Message Link
                </label>
                <input
                  type="text"
                  value={refUrl}
                  onChange={(e) => setRefUrl(e.target.value)}
                  placeholder="e.g. https://facebook.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Inquiry Type
                  </label>
                  <select
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Product Inquiry">Product Inquiry</option>
                    <option value="Price Inquiry">Price Inquiry</option>
                    <option value="Order Request">Order Request</option>
                    <option value="Phone Inquiry">Phone Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Product Interest
                  </label>
                  <input
                    type="text"
                    value={productInterest}
                    onChange={(e) => setProductInterest(e.target.value)}
                    placeholder="e.g. Premium Watch"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery address, special instructions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!name.trim()}
                onClick={() => createMutation.mutate()}
                isLoading={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Lead
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
