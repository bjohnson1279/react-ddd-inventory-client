const fs = require('fs');
const content = fs.readFileSync('src/components/AnomalyDetectionPanel.tsx', 'utf-8');
const search = `  // ⚡ Bolt: Memoize filtered alerts to prevent O(N) array filtering on every render
  const filteredAlerts = React.useMemo(() => {
    return (
      data?.alerts?.filter(
        (alert: any) =>
          filter === "All" ||
          alert.severity.toLowerCase() === filter.toLowerCase(),
      ) || []
    );
  }, [data?.alerts, filter]);`;
console.log(content.includes(search));
