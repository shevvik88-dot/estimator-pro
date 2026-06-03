import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getEstimate, getProfile, markContractGenerated } from '../lib/db'
import { supabase } from '../lib/supabase'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

function formatDate(dateStr) {
  if (!dateStr) return '_______________'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function addDays(dateStr, days) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function todayFormatted() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function SectionHeader({ children }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white mb-1">
      {children}
    </h3>
  )
}

function SignatureLine({ label }) {
  return (
    <div>
      <div className="border-b border-gray-500 h-9 mb-1" />
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  )
}

export default function ContractPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dbRow, setDbRow] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const [row, prof] = await Promise.all([
          getEstimate(id),
          getProfile(session.user.id),
        ])
        setDbRow(row)
        setProfile(prof)
        await markContractGenerated(id)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !dbRow) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Estimate not found.'}</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  const project = dbRow.projects || {}
  const inputs = dbRow.inputs || {}

  const total = dbRow.total || 0
  const downPayment = Math.min(1000, total * 0.10)
  const remaining = total - downPayment
  const startDate = inputs.startDate
  const completionDays = total > 10000 ? 30 : 14
  const completionDate = addDays(startDate, completionDays)

  const companyName = profile?.company_name || 'West Point Interiors Inc.'
  const licenseNum = profile?.license_number || ''
  const contractorPhone = profile?.phone || ''
  const contractorAddress = [profile?.address, profile?.city, profile?.state]
    .filter(Boolean).join(', ')

  const customerName = project.client_name || '_______________'
  const projectAddress = [project.project_address, project.city, project.state]
    .filter(Boolean).join(', ') || '_______________'

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950 py-8 px-4 md:px-8 print:py-0 print:px-0 print:bg-white">
      <div className="max-w-4xl mx-auto print:max-w-none">

        {/* ── Toolbar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => navigate(`/estimate/preview/${id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Estimate
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M4 6V2h8v4M4 12H3a1 1 0 01-1-1V7a1 1 0 011-1h10a1 1 0 011 1v4a1 1 0 01-1 1h-1M4 9h8v5H4V9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Print / PDF
          </button>
        </div>

        {/* ── Contract Document ────────────────────────────────── */}
        <div className="contract-doc bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden print:overflow-visible print:rounded-none print:border-0 print:shadow-none">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 px-10 pt-10 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{companyName}</p>
              {licenseNum && (
                <p className="text-sm text-gray-600 dark:text-gray-400">CA License #{licenseNum}</p>
              )}
              {contractorPhone && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{contractorPhone}</p>
              )}
              {contractorAddress && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{contractorAddress}</p>
              )}
            </div>
            <div className="md:text-right">
              <p className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                Home Improvement Contract
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Date: {todayFormatted()}
              </p>
            </div>
          </div>

          {/* PARTIES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-10 py-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Customer</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{customerName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{projectAddress}</p>
              {project.client_phone && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{project.client_phone}</p>
              )}
              {project.client_email && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{project.client_email}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Contractor</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{companyName}</p>
              {licenseNum && (
                <p className="text-sm text-gray-600 dark:text-gray-400">CA License #{licenseNum}</p>
              )}
              {contractorPhone && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{contractorPhone}</p>
              )}
              {contractorAddress && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{contractorAddress}</p>
              )}
            </div>
          </div>

          {/* FINANCIALS + DATES */}
          <div className="px-10 py-6 border-b border-gray-200 dark:border-gray-800">
            <div className="space-y-2 max-w-sm">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Contract Price:</span>
                <span className="font-bold text-gray-900 dark:text-white tabular-nums">{fmt(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Down Payment (due at signing):</span>
                <span className="tabular-nums text-gray-900 dark:text-white">{fmt(downPayment)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Remaining Balance:</span>
                <span className="tabular-nums text-gray-900 dark:text-white">{fmt(remaining)}</span>
              </div>
            </div>

            <div className="mt-5 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <span className="font-semibold">Payment Schedule:</span>{' '}
                Project Complete — {fmt(remaining)} due once project is complete.
              </p>
              <p>
                <span className="font-semibold">Approximate Start Date:</span>{' '}
                {formatDate(startDate)}
              </p>
              <p>
                <span className="font-semibold">Approximate Completion Date:</span>{' '}
                {completionDate || '_______________'}
              </p>
            </div>
          </div>

          {/* TERMS AND CONDITIONS */}
          <div className="px-10 py-8 space-y-5 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">

            <h2 className="text-base font-bold uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 pb-2">
              Terms and Conditions
            </h2>

            <section className="contract-section">
              <SectionHeader>Schedule of Progress Payments</SectionHeader>
              <p className="font-bold text-gray-900 dark:text-white">
                IT IS AGAINST THE LAW FOR A CONTRACTOR TO COLLECT PAYMENT FOR WORK NOT YET COMPLETED, OR FOR MATERIALS NOT YET DELIVERED. HOWEVER, A CONTRACTOR MAY REQUIRE A DOWN PAYMENT. THE DOWN PAYMENT MAY NOT EXCEED $1,000 OR 10 PERCENT (10%) OF THE CONTRACT PRICE, WHICHEVER IS LESS.
              </p>
            </section>

            <section className="contract-section">
              <SectionHeader>Payment Terms</SectionHeader>
              <p>
                Invoices are due within 3 days of receipt by Customer. If any payments are made with any form of payment other than cash, check or bank transfer, a 4% fee will be charged to the total payment due. In the event that a payment is dishonored by the bank, or if a payment is more than three (3) days overdue, Customer shall pay a fee of 3% of scheduled payment to Contractor.
              </p>
            </section>

            <section className="contract-section">
              <SectionHeader>Start and Completion of Work</SectionHeader>
              <p>
                The work shall be commenced and completed on the approximate dates listed above, as long as any required building permits are received and any agreed upon funds are paid. By signing this agreement, Customer agrees the project is considered "started" on demo day, not on the day the contract is signed.
              </p>
            </section>

            <section className="contract-section">
              <SectionHeader>Change Orders</SectionHeader>
              <p>
                Extra Work and Change Orders become part of the contract once the order is prepared in writing and signed by the parties prior to the commencement of any work covered by the new change order.
              </p>
            </section>

            <section className="contract-section">
              <SectionHeader>Mechanics Lien Warning</SectionHeader>
              <p>
                IMPORTANT INFORMATION FOR PROPERTY OWNER: If subcontractors or material suppliers are not paid by the contractor, they have the right to file a mechanics lien on your property. If a lien is filed and not released, you could be sued and lose your property. You can protect yourself from this situation by requiring your contractor to furnish a Preliminary 20-Day Notice from every subcontractor and material supplier. You can also protect yourself by issuing joint checks to pay contractors and material suppliers, and by getting lien releases from them before making any payments.
              </p>
            </section>

            <section className="contract-section">
              <SectionHeader>Three-Day Right to Cancel</SectionHeader>
              <p>
                You, the buyer, have the right to cancel this contract within three business days. You may cancel by e-mailing, mailing, faxing, or delivering a written notice to the contractor at the contractor's place of business by midnight of the third business day after receiving a signed and dated copy of this contract that includes information about your right to cancel. Notice of cancellation, if sent by mail, is effective when deposited in the mail properly addressed with postage prepaid.
              </p>
            </section>

            <section className="contract-section">
              <SectionHeader>Contract Termination</SectionHeader>
              <p>
                Customer agrees that in the event of termination after the three day cancellation period, Customer shall be liable for 10% of the total contract price. The downpayment is not included in the 10% amount.
              </p>
            </section>

            <section className="contract-section">
              <SectionHeader>Dispute Resolution</SectionHeader>
              <p>
                All disputes under $10,000 shall be resolved in Sacramento County Small Claims Court and all disputes in excess of $10,000 shall be litigated in Sacramento County Superior Court.
              </p>
            </section>

            <section className="contract-section">
              <SectionHeader>Warranty</SectionHeader>
              <p>
                Contractor provides a one (1) year limited warranty on completed labor. That policy is terminated if the home is sold or becomes the property of anyone other than the parties named in this contract.
              </p>
            </section>

            <section className="contract-section">
              <SectionHeader>Workers Compensation</SectionHeader>
              <p>{companyName} carries workers compensation insurance for all employees.</p>
            </section>

            <section className="contract-section">
              <SectionHeader>Commercial General Liability</SectionHeader>
              <p>{companyName} carries commercial general liability insurance.</p>
            </section>

            <section className="contract-section">
              <SectionHeader>Permits</SectionHeader>
              <p>
                Unless otherwise specified in the attached Estimate, any and all permit fees and inspection fees are excluded from the Contract and are the full responsibility of the Customer.
              </p>
            </section>

            <section className="contract-section">
              <SectionHeader>Media Release</SectionHeader>
              <p>
                Customer grants permission to Contractor to use photographs, reviews, video for marketing materials and social media.
              </p>
            </section>

            <section className="contract-section">
              <SectionHeader>Yard Sign</SectionHeader>
              <p>
                Customer grants permission to Contractor to put up a yard sign for the duration of the project, unless restricted by an HOA.
              </p>
            </section>

          </div>

          {/* SIGNATURES */}
          <div className="px-10 pb-10 pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-8">
              By signing below, the parties agree to all terms and conditions stated in this contract.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-7">
                <SignatureLine label="Customer Signature" />
                <SignatureLine label="Printed Name" />
                <SignatureLine label="Date" />
              </div>
              <div className="space-y-7">
                <SignatureLine label="Contractor Signature" />
                <SignatureLine label="Printed Name" />
                <SignatureLine label="Date" />
              </div>
            </div>

            {/* 3-day cancel initial line */}
            <div className="mt-10 pt-6 border-t border-dashed border-gray-300 dark:border-gray-700">
              <div className="flex items-start gap-5">
                <div className="border-b border-gray-500 w-28 h-9 shrink-0" />
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  <span className="font-semibold">Initial here</span> to confirm that the Contractor gave you notice of your three (3) business day right to cancel this contract.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
