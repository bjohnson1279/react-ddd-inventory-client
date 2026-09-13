import React, { useState } from 'react';

const CVGatewayDashboard: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImageSrc(base64);
        setResult(null); // clear old result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imageSrc) return;
    setLoading(true);

    try {
      // the base64 string includes the data URL prefix e.g. data:image/jpeg;base64,...
      // Some backends strip it, but we can pass the whole thing.
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation AnalyzeInboundImage($base64Image: String!) {
              analyzeInboundImage(base64Image: $base64Image) {
                id
                dimensions {
                  length
                  width
                  height
                }
                ocrText
                anomalyScore
                hasDamage
                status
              }
            }
          `,
          variables: { base64Image: imageSrc.split(',')[1] } // strip prefix just in case
        })
      });

      const json = await response.json();
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }
      setResult(json.data.analyzeInboundImage);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!result) return;
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation ApproveInboundScan($id: ID!) {
              approveInboundScan(id: $id) {
                id
                status
              }
            }
          `,
          variables: { id: result.id }
        })
      });
      const json = await response.json();
      if (json.errors) throw new Error(json.errors[0].message);
      
      setResult({ ...result, status: json.data.approveInboundScan.status });
      alert("Scan approved successfully!");
    } catch(err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Computer Vision Receiving Gateway</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Package Image</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
        />
      </div>

      {imageSrc && (
        <div className="mb-4">
          <img src={imageSrc} alt="Preview" className="max-w-xs mb-4 rounded shadow" />
          <button 
            onClick={handleAnalyze} 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'Analyzing...' : 'Run CV Analysis'}
          </button>
        </div>
      )}

      {result && (
        <div className="bg-white p-4 rounded shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-2">Analysis Results</h2>
          <p><strong>Scan ID:</strong> {result.id}</p>
          <p><strong>Status:</strong> {result.status}</p>
          
          <h3 className="mt-2 font-medium">Dimensioning</h3>
          <ul className="list-disc ml-5 mb-2">
            <li>Length: {result.dimensions.length} cm</li>
            <li>Width: {result.dimensions.width} cm</li>
            <li>Height: {result.dimensions.height} cm</li>
          </ul>

          <h3 className="mt-2 font-medium">OCR Extraction</h3>
          <p className="mb-2 bg-gray-100 p-2 rounded">{result.ocrText}</p>

          <h3 className="mt-2 font-medium">QA / Damage Check</h3>
          <p className={`font-semibold ${result.hasDamage ? 'text-red-600' : 'text-green-600'}`}>
            Damage Detected: {result.hasDamage ? 'YES' : 'NO'} 
            <span className="text-gray-500 font-normal ml-2">(Score: {result.anomalyScore})</span>
          </p>

          {result.status === 'PENDING' && (
            <button 
              onClick={handleApprove}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Approve Received Stock
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CVGatewayDashboard;
