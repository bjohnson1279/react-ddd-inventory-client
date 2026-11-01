import React, { useState, useEffect } from 'react';

export const LaborDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching operator data
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <div className="p-4">Loading your dashboard...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">My Labor Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500">
          <h2 className="text-gray-500 font-medium">Picks per Hour</h2>
          <p className="text-4xl font-bold text-gray-900 mt-2">124 <span className="text-sm text-green-500 font-normal">+12% from last week</span></p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-500">
          <h2 className="text-gray-500 font-medium">Accuracy Score</h2>
          <p className="text-4xl font-bold text-gray-900 mt-2">99.8% <span className="text-sm text-gray-400 font-normal">Top 5%</span></p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-purple-500">
          <h2 className="text-gray-500 font-medium">Distance Walked</h2>
          <p className="text-4xl font-bold text-gray-900 mt-2">4.2 km <span className="text-sm text-gray-400 font-normal">Today</span></p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Zone Leaderboard (Top Pickers)</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Picks/Hr</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-yellow-500">#1</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Sarah J.</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">145</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">100%</td>
            </tr>
            <tr className="bg-blue-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">#2</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">You</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">124</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">99.8%</td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#3</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Mike T.</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">118</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">98.5%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
