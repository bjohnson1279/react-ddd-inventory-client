import React, { useState } from 'react';

export const PredictiveScheduling: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedule, setSchedule] = useState<any[]>([]);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate calling the Python AI sidecar
    setTimeout(() => {
      setSchedule([
        { id: 1, operator: 'Sarah J.', zone: 'Zone A', shiftStart: '08:00 AM', shiftEnd: '04:00 PM', predictedDemand: 1100 },
        { id: 2, operator: 'You', zone: 'Zone B', shiftStart: '09:00 AM', shiftEnd: '05:00 PM', predictedDemand: 950 },
        { id: 3, operator: 'Mike T.', zone: 'Zone A', shiftStart: '12:00 PM', shiftEnd: '08:00 PM', predictedDemand: 800 },
      ]);
      setIsGenerating(false);
    }, 1200);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Predictive Labor Scheduling</h1>
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? 'Analyzing Demand...' : 'Generate AI Schedule'}
        </button>
      </div>

      {!schedule.length && !isGenerating && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <p className="text-gray-500 mb-4">No schedules generated for the upcoming period.</p>
          <p className="text-sm text-gray-400">Click "Generate AI Schedule" to let the sidecar analyze demand forecasts and suggest shifts.</p>
        </div>
      )}

      {schedule.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-800">Suggested Shift Assignments</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift Start</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift End</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Picks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {schedule.map(shift => (
                <tr key={shift.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{shift.operator}</td>
                  <td className="px-6 py-4 text-gray-500">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {shift.zone}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{shift.shiftStart}</td>
                  <td className="px-6 py-4 text-gray-500">{shift.shiftEnd}</td>
                  <td className="px-6 py-4 text-gray-500">{shift.predictedDemand}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-gray-50 border-t flex justify-end">
             <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow">
               Approve & Publish Schedule
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
