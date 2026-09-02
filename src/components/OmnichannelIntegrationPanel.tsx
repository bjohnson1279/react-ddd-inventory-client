import React, { useState, useEffect } from "react";
import { useInventory } from "../api/client";

export const OmnichannelIntegrationPanel: React.FC<{ tenantId: string }> = ({
  tenantId,
}) => {
  const { client } = useInventory();

  // Amazon state
  const [amazonSellerId, setAmazonSellerId] = useState("");
  const [amazonAuthToken, setAmazonAuthToken] = useState("");
  const [amazonMarketplaceId, setAmazonMarketplaceId] = useState("");

  // WooCommerce state
  const [wooUrl, setWooUrl] = useState("");
  const [wooKey, setWooKey] = useState("");
  const [wooSecret, setWooSecret] = useState("");

  // Shopify state
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");

  const [connections, setConnections] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchConnections = async () => {
    try {
      const data = await client.getConnections(tenantId);
      setConnections(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [tenantId, client]);

  const handleConnectAmazon = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await client.connectAmazon(
        tenantId,
        amazonSellerId,
        amazonAuthToken,
        amazonMarketplaceId,
      );
      setSuccess("Amazon connected successfully");
      setAmazonSellerId("");
      setAmazonAuthToken("");
      setAmazonMarketplaceId("");
      fetchConnections();
    } catch (err: any) {
      setError(err.message || "Failed to connect Amazon");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWoo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await client.connectWooCommerce(tenantId, wooUrl, wooKey, wooSecret);
      setSuccess("WooCommerce connected successfully");
      setWooUrl("");
      setWooKey("");
      setWooSecret("");
      fetchConnections();
    } catch (err: any) {
      setError(err.message || "Failed to connect WooCommerce");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectShopify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await client.connectShopify(tenantId, shopifyDomain, shopifyToken);
      setSuccess("Shopify connected successfully");
      setShopifyDomain("");
      setShopifyToken("");
      fetchConnections();
    } catch (err: any) {
      setError(err.message || "Failed to connect Shopify");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Omnichannel Integrations
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Amazon Panel */}
        <div className="border border-gray-200 rounded p-4">
          <h3 className="font-medium text-lg mb-3">Amazon Seller Central</h3>
          <form onSubmit={handleConnectAmazon}>
            <div className="mb-3">
              <label
                htmlFor="amazonSellerId"
                className="block text-sm text-gray-600 mb-1"
              >
                Seller ID
              </label>
              <input
                id="amazonSellerId"
                type="text"
                value={amazonSellerId}
                onChange={(e) => setAmazonSellerId(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                required
              />
            </div>
            <div className="mb-3">
              <label
                htmlFor="amazonAuthToken"
                className="block text-sm text-gray-600 mb-1"
              >
                MWS Auth Token
              </label>
              <input
                id="amazonAuthToken"
                type="password"
                value={amazonAuthToken}
                onChange={(e) => setAmazonAuthToken(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                required
              />
            </div>
            <div className="mb-3">
              <label
                htmlFor="amazonMarketplaceId"
                className="block text-sm text-gray-600 mb-1"
              >
                Marketplace ID
              </label>
              <input
                id="amazonMarketplaceId"
                type="text"
                value={amazonMarketplaceId}
                onChange={(e) => setAmazonMarketplaceId(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full bg-blue-600 text-white rounded p-2 text-sm hover:bg-blue-700"
            >
              {loading ? "Connecting..." : "Connect Amazon"}
            </button>
          </form>
        </div>

        {/* WooCommerce Panel */}
        <div className="border border-gray-200 rounded p-4">
          <h3 className="font-medium text-lg mb-3">WooCommerce</h3>
          <form onSubmit={handleConnectWoo}>
            <div className="mb-3">
              <label
                htmlFor="wooUrl"
                className="block text-sm text-gray-600 mb-1"
              >
                Store URL
              </label>
              <input
                id="wooUrl"
                type="url"
                value={wooUrl}
                onChange={(e) => setWooUrl(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                required
                placeholder="https://store.com"
              />
            </div>
            <div className="mb-3">
              <label
                htmlFor="wooKey"
                className="block text-sm text-gray-600 mb-1"
              >
                Consumer Key
              </label>
              <input
                id="wooKey"
                type="text"
                value={wooKey}
                onChange={(e) => setWooKey(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                required
              />
            </div>
            <div className="mb-3">
              <label
                htmlFor="wooSecret"
                className="block text-sm text-gray-600 mb-1"
              >
                Consumer Secret
              </label>
              <input
                id="wooSecret"
                type="password"
                value={wooSecret}
                onChange={(e) => setWooSecret(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full bg-purple-600 text-white rounded p-2 text-sm hover:bg-purple-700"
            >
              {loading ? "Connecting..." : "Connect WooCommerce"}
            </button>
          </form>
        </div>

        {/* Shopify Panel */}
        <div className="border border-gray-200 rounded p-4">
          <h3 className="font-medium text-lg mb-3">Shopify</h3>
          <form onSubmit={handleConnectShopify}>
            <div className="mb-3">
              <label
                htmlFor="shopifyDomain"
                className="block text-sm text-gray-600 mb-1"
              >
                Store Domain
              </label>
              <input
                id="shopifyDomain"
                type="text"
                value={shopifyDomain}
                onChange={(e) => setShopifyDomain(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                required
                placeholder="store.myshopify.com"
              />
            </div>
            <div className="mb-3">
              <label
                htmlFor="shopifyToken"
                className="block text-sm text-gray-600 mb-1"
              >
                Access Token
              </label>
              <input
                id="shopifyToken"
                type="password"
                value={shopifyToken}
                onChange={(e) => setShopifyToken(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full bg-green-600 text-white rounded p-2 text-sm hover:bg-green-700"
            >
              {loading ? "Connecting..." : "Connect Shopify"}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="font-medium text-lg mb-3">Active Connections</h3>
        <div className="bg-gray-50 rounded p-4 text-sm text-gray-700 overflow-auto">
          {connections ? (
            <pre>{JSON.stringify(connections, null, 2)}</pre>
          ) : (
            <p>Loading connections...</p>
          )}
        </div>
      </div>
    </div>
  );
};
