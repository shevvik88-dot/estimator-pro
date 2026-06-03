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

// Signature + Date side by side on one line
function SignatureWithDate({ label }) {
  return (
    <div className="flex items-end gap-4">
      <div className="flex-1">
        <div className="border-b border-gray-500 h-9 mb-1" />
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <div className="w-36">
        <div className="border-b border-gray-500 h-9 mb-1" />
        <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
      </div>
    </div>
  )
}

function PrintedNameLine() {
  return (
    <div>
      <div className="border-b border-gray-500 h-9 mb-1" />
      <p className="text-xs text-gray-500 dark:text-gray-400">Printed Name</p>
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

            {/* 1 */}
            <section className="contract-section">
              <SectionHeader>Schedule of Progress Payments</SectionHeader>
              <p className="font-bold text-gray-900 dark:text-white">
                IT IS AGAINST THE LAW FOR A CONTRACTOR TO COLLECT PAYMENT FOR WORK NOT YET COMPLETED, OR FOR MATERIALS NOT YET DELIVERED. HOWEVER, A CONTRACTOR MAY REQUIRE A DOWN PAYMENT. THE DOWN PAYMENT MAY NOT EXCEED $1,000 OR 10 PERCENT (10%) OF THE CONTRACT PRICE, WHICHEVER IS LESS.
              </p>
            </section>

            {/* 2 */}
            <section className="contract-section">
              <SectionHeader>Payment Terms</SectionHeader>
              <p>
                Invoices are due within 3 days of receipt by Customer. If any payments are made with any form of payment other than cash, check or bank transfer, a 4% fee will be charged to the total payment due. In the event that a payment is dishonored by the bank, or if a payment is more than three (3) days overdue, Customer shall pay a fee of 3% of scheduled payment to Contractor.
              </p>
            </section>

            {/* 3 */}
            <section className="contract-section">
              <SectionHeader>Start and Completion of Work</SectionHeader>
              <p>
                The work shall be commenced and completed on the approximate dates listed above, as long as any required building permits are received and any agreed upon funds are paid. By signing this agreement, Customer agrees the project is considered "started" on demo day, not on the day the contract is signed.
              </p>
            </section>

            {/* 4 */}
            <section className="contract-section">
              <SectionHeader>Change Orders</SectionHeader>
              <p>
                Extra Work and Change Orders become part of the contract once the order is prepared in writing and signed by the parties prior to the commencement of any work covered by the new change order.
              </p>
            </section>

            {/* 5 */}
            <section className="contract-section">
              <SectionHeader>Mechanics Lien Warning</SectionHeader>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                NOTICE TO PROPERTY OWNER
              </p>
              <p>
                Anyone who helps improve your property, but who is not paid, may record what is called a mechanics' lien on your property. A mechanics' lien is a claim, like a mortgage or home equity loan, made against your property and recorded with the county recorder.
              </p>
              <p className="mt-2">
                Even if you pay your contractor in full, unpaid subcontractors, suppliers, and laborers who helped to improve your property may record mechanics' liens and sue you in court to foreclose the lien. If a court finds the lien is valid, you could be forced to pay twice or have a court officer sell your home to pay the lien. Liens can also affect your credit.
              </p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                BE CAREFUL.
              </p>
              <p className="mt-1">
                The Preliminary Notice can be sent up to 20 days after the subcontractor starts work. Lenders who help finance the improvement may also record liens. Protect yourself by requiring your contractor to provide a list of all subcontractors and material suppliers for this project. Obtain a signed lien release from every subcontractor and material supplier before making any payment. You may also consider issuing joint checks made payable to both the contractor and the subcontractor or supplier.
              </p>
              <p className="mt-2">
                If you do not have a lien release from everyone who may file a lien, you should withhold payment until the contractor provides the releases or the time for filing the lien has expired. If the contractor fails to provide releases within a reasonable time, you may pay the subcontractors or suppliers directly to obtain releases and deduct those amounts from the total owed to the contractor.
              </p>
              <p className="mt-2">
                For more information on mechanics' liens, contact the Contractors State License Board at www.cslb.ca.gov or 1-800-321-CSLB (2752).
              </p>
            </section>

            {/* 6 */}
            <section className="contract-section">
              <SectionHeader>Three-Day Right to Cancel</SectionHeader>
              <p>
                You, the buyer, have the right to cancel this contract within three business days. You may cancel by e-mailing, mailing, faxing, or delivering a written notice to the contractor at the contractor's place of business by midnight of the third business day after receiving a signed and dated copy of this contract that includes information about your right to cancel. Notice of cancellation, if sent by mail, is effective when deposited in the mail properly addressed with postage prepaid.
              </p>
              <p className="mt-2">
                If you cancel, the contractor must return to you anything you paid within 10 days of receiving the notice of cancellation. For a period of 10 days after the date of your notice of cancellation, you must make available to the contractor at your residence, in substantially as good condition as when received, any goods delivered to you under this contract or sale. Or you may, if you wish, comply with the contractor's instructions on how to return the goods at the contractor's expense and risk.
              </p>
            </section>

            {/* 7 */}
            <section className="contract-section">
              <SectionHeader>Contract Termination</SectionHeader>
              <p>
                Customer agrees that in the event of termination after the three day cancellation period, Customer shall be liable for 10% of the total contract price. The downpayment is not included in the 10% amount.
              </p>
            </section>

            {/* 8 */}
            <section className="contract-section">
              <SectionHeader>Dispute Resolution</SectionHeader>
              <p>
                All disputes under $10,000 shall be resolved in Sacramento County Small Claims Court and all disputes in excess of $10,000 shall be litigated in Sacramento County Superior Court.
              </p>
            </section>

            {/* 9 */}
            <section className="contract-section">
              <SectionHeader>Warranty</SectionHeader>
              <p>
                Contractor provides a one (1) year limited warranty on completed labor. That policy is terminated if the home is sold or becomes the property of anyone other than the parties named in this contract.
              </p>
            </section>

            {/* 10 */}
            <section className="contract-section">
              <SectionHeader>Workers Compensation</SectionHeader>
              <p>{companyName} carries workers compensation insurance for all employees.</p>
            </section>

            {/* 11 */}
            <section className="contract-section">
              <SectionHeader>Commercial General Liability</SectionHeader>
              <p>{companyName} carries commercial general liability insurance.</p>
            </section>

            {/* 12 */}
            <section className="contract-section">
              <SectionHeader>Permits</SectionHeader>
              <p>
                Unless otherwise specified in the attached Estimate, any and all permit fees and inspection fees are excluded from the Contract and are the full responsibility of the Customer.
              </p>
            </section>

            {/* 13 */}
            <section className="contract-section">
              <SectionHeader>Personal Property</SectionHeader>
              <p>
                Customer agrees to relocate all furniture, clothing, plants, rugs, and all personal items away from the work area prior to the commencement of work. Contractor is not responsible for any damage to items that have not been removed from the work area prior to the start of the project.
              </p>
            </section>

            {/* 14 */}
            <section className="contract-section">
              <SectionHeader>Access</SectionHeader>
              <p>
                Customer agrees to provide full access to the work area, including electricity, adequate lighting, and restroom facilities for all workers during the course of the project. Any delays caused by lack of access shall not be the responsibility of the Contractor and may result in schedule adjustments.
              </p>
            </section>

            {/* 15 */}
            <section className="contract-section">
              <SectionHeader>Collections</SectionHeader>
              <p>
                In the event payment is not made as specified in this contract, Customer agrees to pay all reasonable costs of enforcement, including attorney's fees and court costs, incurred by Contractor in collecting any amounts due under this contract.
              </p>
            </section>

            {/* 16 */}
            <section className="contract-section">
              <SectionHeader>Delays by Customer</SectionHeader>
              <p>
                If Customer delays the start of installation more than 30 days from the scheduled start date specified in this contract, Customer agrees to pay a delay fee of 1% of the total contract price per month until the project commences. Materials ordered and stored by Contractor on behalf of Customer during any such delay are stored at Customer's risk and expense.
              </p>
            </section>

            {/* 17 */}
            <section className="contract-section">
              <SectionHeader>Consequential Damages</SectionHeader>
              <p>
                Contractor shall not be liable for delays or failure to perform caused by fire, strikes, accidents, severe weather conditions, material shortages, supply chain disruptions, acts of God, governmental actions, or any other cause beyond the Contractor's reasonable control. In no event shall Contractor be liable for any consequential, incidental, indirect, special, or punitive damages of any kind arising out of or relating to this contract.
              </p>
            </section>

            {/* 18 */}
            <section className="contract-section">
              <SectionHeader>Flooring</SectionHeader>
              <p>
                All wood, engineered wood, and laminate flooring products may experience natural seasonal expansion and contraction due to changes in humidity and temperature. Gaps or separations that occur as a result of normal seasonal movement are not covered under warranty and are not the responsibility of the Contractor. Customer is advised to maintain consistent indoor humidity levels (35–55% relative humidity) as recommended by the flooring manufacturer.
              </p>
            </section>

            {/* 19 */}
            <section className="contract-section">
              <SectionHeader>Cutting and Patching</SectionHeader>
              <p>
                Any cutting and patching required as part of this project may result in areas where color, texture, or finish may not match existing surfaces exactly. Contractor will make every reasonable effort to match existing finishes; however, an exact match cannot be guaranteed due to weathering, aging, paint dye lots, discontinued materials, and general availability of matching products.
              </p>
            </section>

            {/* 20 */}
            <section className="contract-section">
              <SectionHeader>Work Done by Customer</SectionHeader>
              <p>
                If Customer performs any portion of the work that is included in the scope of this contract, no credit will be given for such work. The contract price remains as stated regardless of any work performed by the Customer or Customer's agents. Any work performed by the Customer that interferes with the Contractor's work may void the applicable warranty.
              </p>
            </section>

            {/* 21 */}
            <section className="contract-section">
              <SectionHeader>Material</SectionHeader>
              <p>
                Any material remaining after the completion of the project belongs to the Contractor unless otherwise agreed in writing. An industry-standard overage of 10–15% is ordered for most materials to account for cuts, waste, defects, and future repairs. This overage is factored into the contract price. Contractor makes no representation that materials ordered will exactly match future production runs or dye lots.
              </p>
            </section>

            {/* 22 */}
            <section className="contract-section">
              <SectionHeader>Media Release</SectionHeader>
              <p>
                Customer grants permission to Contractor to use photographs, reviews, and video of the completed project for marketing materials, website content, and social media. Customer's personal identifying information will not be published without separate written consent.
              </p>
            </section>

            {/* 23 */}
            <section className="contract-section">
              <SectionHeader>Yard Sign</SectionHeader>
              <p>
                Customer grants permission to Contractor to place a yard sign at the project location for the duration of the project, unless restricted by an HOA or local ordinance.
              </p>
            </section>

          </div>

          {/* SIGNATURES */}
          <div className="px-10 pb-10 pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-8">
              By signing below, the parties agree to all terms and conditions stated in this contract. Each party acknowledges receipt of a completed copy of this contract at the time of signing.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <SignatureWithDate label="Customer Signature" />
                <PrintedNameLine />
              </div>
              <div className="space-y-6">
                <SignatureWithDate label="Contractor Signature" />
                <PrintedNameLine />
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
