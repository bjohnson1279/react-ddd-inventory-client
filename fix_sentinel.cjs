const fs = require('fs');

try {
  let sentinelCode = fs.readFileSync('.jules/sentinel.md', 'utf8');

  // Strip git markers
  sentinelCode = sentinelCode.replace(/<<<<<<< HEAD\n/g, '').replace(/=======\n/g, '').replace(/>>>>>>> c74c468 \(Fix weak PRNG vulnerability in App.tsx\)\n/g, '');

  fs.writeFileSync('.jules/sentinel.md', sentinelCode);
  console.log("Stripped markers");
} catch (e) {
  console.log(e);
}
