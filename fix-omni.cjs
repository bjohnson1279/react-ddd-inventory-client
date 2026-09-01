const fs = require('fs');

const file = 'src/components/OmnichannelIntegrationPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const labels = [
    { old: 'Seller ID', id: 'amazonSellerId' },
    { old: 'MWS Auth Token', id: 'amazonAuthToken' },
    { old: 'Marketplace ID', id: 'amazonMarketplaceId' },
    { old: 'Store URL', id: 'wooUrl' },
    { old: 'Consumer Key', id: 'wooKey' },
    { old: 'Consumer Secret', id: 'wooSecret' },
    { old: 'Store Domain', id: 'shopifyDomain' },
    { old: 'Access Token', id: 'shopifyToken' }
];

/* Wait, OmnichannelIntegrationPanel already has htmlFor */
