import React, { useState } from 'react';

interface LogisticsErpPanelProps {
  api?: any;
}

export const LogisticsErpPanel: React.FC<LogisticsErpPanelProps> = ({ api }) => {
  const [activeSubTab, setActiveSubTab] = useState<'rates' | 'label' | 'erp'>('rates');

  // Rates State
  const [carrier, setCarrier] = useState('FEDEX');
  const [originPostal, setOriginPostal] = useState('10001');
  const [destPostal, setDestPostal] = useState('90210');
  const [weightKg, setWeightKg] = useState('4.5');
  const [serviceLevel, setServiceLevel] = useState('FEDEX_EXPRESS_SAVER');
  const [rateResult, setRateResult] = useState<any>(null);

  // Label State
  const [labelCarrier, setLabelCarrier] = useState('UPS');
  const [recipientName, setRecipientName] = useState('Jane Doe');
  const [shippingAddress, setShippingAddress] = useState('123 Enterprise Way, Suite 400, Austin, TX 78701');
  const [labelWeight, setLabelWeight] = useState('2.5');
  const [labelFormat, setLabelFormat] = useState<'ZPL' | 'PDF' | 'BOTH'>('BOTH');
  const [labelResult, setLabelResult] = useState<any>(null);

  // ERP State
  const [erpProvider, setErpProvider] = useState('QUICKBOOKS');
  const [referenceId, setReferenceId] = useState(`SO-${crypto.randomUUID().split('-')[0]}`);
  const [memo, setMemo] = useState('Inventory dispatch revenue posting');
  const [accountCode, setAccountCode] = useState('1200');
  const [amountCents, setAmountCents] = useState('45000');
  const [postingType, setPostingType] = useState('DEBIT');
  const [apiKey, setApiKey] = useState('');
  const [erpResult, setErpResult] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculateRates = async () => {
    setLoading(true);
    setError(null);
    const activeToken = localStorage.getItem('auth_token') || '';
    try {
      if (api && api.calculateShippingRates) {
        const res = await api.calculateShippingRates({
          carrier,
          originPostalCode: originPostal,
          destinationPostalCode: destPostal,
          weightKg: parseFloat(weightKg),
          serviceLevel,
        });
        setRateResult(res);
      } else {
        // Direct REST fallback call
        const response = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
          },
          body: JSON.stringify({
            carrier,
            originPostalCode: originPostal,
            destinationPostalCode: destPostal,
            weightKg: parseFloat(weightKg),
            serviceLevel,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch rates');
        setRateResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error calculating rates');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLabel = async () => {
    setLoading(true);
    setError(null);
    const activeToken = localStorage.getItem('auth_token') || '';
    try {
      if (api && api.generateShippingLabel) {
        const res = await api.generateShippingLabel({
          carrier: labelCarrier,
          recipientName,
          shippingAddress,
          weightKg: parseFloat(labelWeight),
          format: labelFormat,
        });
        setLabelResult(res);
      } else {
        const response = await fetch('/api/shipping/label', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
          },
          body: JSON.stringify({
            carrier: labelCarrier,
            recipientName,
            shippingAddress,
            weightKg: parseFloat(labelWeight),
            format: labelFormat,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to generate label');
        setLabelResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error generating label');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncErp = async () => {
    setLoading(true);
    setError(null);
    const activeToken = localStorage.getItem('auth_token') || '';
    try {
      const payload = {
        provider: erpProvider,
        referenceId,
        memo,
        lines: [
          {
            accountCode,
            description: memo,
            amountCents: parseInt(amountCents, 10),
            postingType,
          },
        ],
        apiKey,
      };

      if (api && api.syncERPJournal) {
        const res = await api.syncERPJournal(payload);
        setErpResult(res);
      } else {
        const response = await fetch('/api/erp/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to sync ERP journal');
        setErpResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error syncing ERP journal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 text-slate-100 rounded-xl shadow-2xl border border-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Enterprise Logistics & ERP Integrations
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Calculate carrier rates, generate thermal ZPL/PDF shipping labels, and sync double-entry journal postings to QuickBooks, NetSuite, and Xero.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center space-x-2 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveSubTab('rates')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSubTab === 'rates'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🚚 Carrier Rates
          </button>
          <button
            onClick={() => setActiveSubTab('label')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSubTab === 'label'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🏷️ Label Generator
          </button>
          <button
            onClick={() => setActiveSubTab('erp')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSubTab === 'erp'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 ERP Sync
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="p-4 bg-red-950/60 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error" className="text-red-400 hover:text-red-200 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded">×</button>
        </div>
      )}

      {/* Subtab 1: Carrier Rates */}
      {activeSubTab === 'rates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/60 space-y-4">
            <h3 className="text-lg font-semibold text-blue-300">Carrier Quote Request</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Carrier Provider</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="FEDEX">FedEx Express</option>
                  <option value="UPS">UPS Ground</option>
                  <option value="DHL">DHL Express</option>
                  <option value="GENERIC_LTL">Freight / LTL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Service Level</label>
                <input
                  type="text"
                  value={serviceLevel}
                  onChange={(e) => setServiceLevel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Origin Zip</label>
                <input
                  type="text"
                  value={originPostal}
                  onChange={(e) => setOriginPostal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Destination Zip</label>
                <input
                  type="text"
                  value={destPostal}
                  onChange={(e) => setDestPostal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleCalculateRates}
              disabled={loading} aria-busy={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-lg shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Calculating Rate...' : 'Calculate Shipping Rate'}
            </button>
          </div>

          <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/60 flex flex-col justify-between">
            <h3 className="text-lg font-semibold text-indigo-300 mb-4">Rate Breakdown Quote</h3>
            {rateResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/80 rounded-lg border border-indigo-500/30 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Carrier:</span>
                    <span className="font-semibold text-indigo-400">{rateResult.carrier}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Service Level:</span>
                    <span className="text-slate-200">{rateResult.serviceLevel}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Est. Delivery:</span>
                    <span className="text-emerald-400 font-medium">{rateResult.estimatedDeliveryDays} Business Days</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm">
                    <span className="text-slate-400">Base Freight:</span>
                    <span className="text-slate-300">${(rateResult.baseRateCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Fuel Surcharge:</span>
                    <span className="text-slate-300">${(rateResult.fuelSurchargeCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between items-center text-base font-bold">
                    <span className="text-slate-100">Total Rate:</span>
                    <span className="text-2xl text-emerald-400">${(rateResult.totalRateCents / 100).toFixed(2)} {rateResult.currency}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                <span className="text-4xl mb-2">📦</span>
                <p className="text-sm">Submit shipping parameters to view rate calculation.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 2: Label Generator */}
      {activeSubTab === 'label' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/60 space-y-4">
            <h3 className="text-lg font-semibold text-purple-300">Label Generator Parameters</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Carrier</label>
                <select
                  value={labelCarrier}
                  onChange={(e) => setLabelCarrier(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="UPS">UPS Ground</option>
                  <option value="FEDEX">FedEx Express</option>
                  <option value="DHL">DHL Express</option>
                  <option value="GENERIC_LTL">Freight LTL (with BOL)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Label Format</label>
                <select
                  value={labelFormat}
                  onChange={(e) => setLabelFormat(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="BOTH">ZPL Command & PDF Blob (Both)</option>
                  <option value="ZPL">Raw ZPL Thermal Strings Only</option>
                  <option value="PDF">Base64 PDF Blob Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Shipping Address</label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleGenerateLabel}
              disabled={loading} aria-busy={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-lg shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Generating Label...' : 'Generate Thermal / PDF Label'}
            </button>
          </div>

          <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/60 flex flex-col justify-between space-y-4">
            <h3 className="text-lg font-semibold text-purple-300">Generated Shipping Artifacts</h3>
            {labelResult ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-slate-900 rounded-md border border-purple-500/30 flex justify-between items-center">
                  <span className="text-slate-400">Tracking Number:</span>
                  <span className="font-bold text-emerald-400 text-sm">{labelResult.trackingNumber}</span>
                </div>

                {labelResult.zplString && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-sans text-xs">Thermal Printer Command (ZPL):</span>
                      <span className="text-[10px] text-purple-400 font-sans">4x6 Direct Thermal</span>
                    </div>
                    <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-purple-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                      {labelResult.zplString}
                    </pre>
                  </div>
                )}

                {labelResult.pdfBase64 && (
                  <div className="space-y-1">
                    <span className="text-slate-400 font-sans text-xs">PDF Document Stream (Base64 Snippet):</span>
                    <pre className="p-2 bg-slate-950 rounded border border-slate-800 text-emerald-400 text-[11px] overflow-x-auto truncate">
                      {labelResult.pdfBase64}
                    </pre>
                  </div>
                )}

                {labelResult.bolUrl && (
                  <div className="p-2 bg-indigo-950/40 rounded border border-indigo-500/40 flex justify-between items-center">
                    <span className="text-indigo-300 font-sans">Bill of Lading (BOL):</span>
                    <a href={labelResult.bolUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline font-sans">
                      Download LTL BOL PDF
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                <span className="text-4xl mb-2">🏷️</span>
                <p className="text-sm">Generate label to view ZPL thermal strings and PDF payloads.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: ERP Sync */}
      {activeSubTab === 'erp' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/60 space-y-4">
            <h3 className="text-lg font-semibold text-emerald-300">ERP Accounting Sync Input</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target ERP System</label>
                <select
                  value={erpProvider}
                  onChange={(e) => setErpProvider(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="QUICKBOOKS">Intuit QuickBooks Online (V3 API)</option>
                  <option value="NETSUITE">Oracle NetSuite (SuiteTalk REST)</option>
                  <option value="XERO">Xero Accounting (ManualJournals)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Reference ID</label>
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Account Code</label>
                <input
                  type="text"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Amount (Cents)</label>
                <input
                  type="number"
                  value={amountCents}
                  onChange={(e) => setAmountCents(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                <select
                  value={postingType}
                  onChange={(e) => setPostingType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="DEBIT">Debit</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">API Key / Auth Token (Set to "mock" for fallback mode)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleSyncErp}
              disabled={loading} aria-busy={loading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Posting Journal Entry...' : 'Post Journal Entry to ERP'}
            </button>
          </div>

          <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/60 flex flex-col justify-between">
            <h3 className="text-lg font-semibold text-emerald-300 mb-4">ERP Sync Confirmation</h3>
            {erpResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/90 rounded-lg border border-emerald-500/40 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Status:</span>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                      ✓ SUCCESSFUL SYNC
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Provider:</span>
                    <span className="font-semibold text-emerald-300">{erpResult.provider}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">External ERP Journal ID:</span>
                    <span className="font-mono text-indigo-300">{erpResult.externalJournalId}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Posted Amount:</span>
                    <span className="font-bold text-slate-100">${(erpResult.postedAmountCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-300">
                    {erpResult.message}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                <span className="text-4xl mb-2">📊</span>
                <p className="text-sm">Submit journal parameters to test ERP adapter sync.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
