import { useState } from "react";
import { useIntl } from "react-intl";
import { Alert, Button, Columns, Column, FormField, Rows, Select, TextInput } from "@canva/app-ui-kit";
import { CONFIG, saveRuntimeSettings, clearRuntimeSettings, normalizeGatewayUrl } from "../config.mjs";
import { discoverAllServices } from "../services/pi-discovery.mjs";
import type { DiscoveredService } from "../services/pi-discovery.d.mts";

/** Gateway address, discovery API and access keys, kept in this browser's storage (see config.mjs). */
export function SettingsForm({ onClose, onSaved }: { onClose?: () => void; onSaved: () => void }) {
  const intl = useIntl();
  const [piDiscoveryUrl, setPiDiscoveryUrl] = useState(CONFIG.piDiscoveryUrl);
  const [gatewayUrl, setGatewayUrl] = useState(CONFIG.gatewayUrl);
  const [gatewayApiKey, setGatewayApiKey] = useState(CONFIG.gatewayApiKey);
  const [signageUrl, setSignageUrl] = useState(CONFIG.signageUrl);
  const [signagePushKey, setSignagePushKey] = useState(CONFIG.signagePushKey);
  const [annoUrl, setAnnoUrl] = useState(CONFIG.annoUrl);
  const [valopankkiUrl, setValopankkiUrl] = useState(CONFIG.valopankkiUrl);

  const [discovering, setDiscovering] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<string | null>(null);
  const [discoveredGateways, setDiscoveredGateways] = useState<DiscoveredService[]>([]);
  const [discoveredSignage, setDiscoveredSignage] = useState<DiscoveredService[]>([]);
  const [discoveredValopankki, setDiscoveredValopankki] = useState<DiscoveredService[]>([]);
  const [error, setError] = useState("");

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoveryStatus(null);
    setError("");
    try {
      const catalog = await discoverAllServices({ discoveryUrl: piDiscoveryUrl });
      const totalCount = catalog.all.length;

      setDiscoveredGateways(catalog.piGateways);
      setDiscoveredSignage(catalog.signageServices);
      setDiscoveredValopankki(catalog.valopankkiServices);

      // Auto-fill fields from discovered services
      if (catalog.piGateways.length > 0) {
        const primaryGateway = catalog.piGateways[0];
        const rawUrl = primaryGateway.endpoint_url || primaryGateway.url;
        const norm = normalizeGatewayUrl(rawUrl);
        if (norm) setGatewayUrl(norm);
      }
      if (catalog.signageServices.length > 0) {
        const primarySignage = catalog.signageServices[0];
        const rawUrl = primarySignage.endpoint_url || primarySignage.url;
        const norm = normalizeGatewayUrl(rawUrl);
        if (norm) setSignageUrl(norm);
      }
      if (catalog.valopankkiServices.length > 0) {
        const primaryValopankki = catalog.valopankkiServices[0];
        const rawUrl = primaryValopankki.endpoint_url || primaryValopankki.url;
        const norm = normalizeGatewayUrl(rawUrl);
        if (norm) setValopankkiUrl(norm);
      }
      if (catalog.annoServices.length > 0) {
        const primaryAnno = catalog.annoServices[0];
        const rawUrl = primaryAnno.endpoint_url || primaryAnno.url;
        const norm = normalizeGatewayUrl(rawUrl);
        if (norm) setAnnoUrl(norm);
      }

      if (totalCount > 0) {
        setDiscoveryStatus(
          intl.formatMessage(
            { defaultMessage: "Discovered {count} church services from Tunnus.", description: "Notice when discovery succeeds" },
            { count: totalCount },
          ),
        );
      } else {
        setDiscoveryStatus(
          intl.formatMessage({
            defaultMessage: "Discovery reached Tunnus, but no active services were registered.",
            description: "Notice when discovery returns 0 services",
          }),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiscovering(false);
    }
  };

  const save = () => {
    try {
      saveRuntimeSettings({ gatewayUrl, gatewayApiKey, signageUrl, signagePushKey, annoUrl, valopankkiUrl, piDiscoveryUrl });
      setError("");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Rows spacing="1.5u">
      {/* 1. Service Discovery API (First) */}
      <BoxWrapper>
        <FormField
          label={intl.formatMessage({ defaultMessage: "Service Discovery API (Tunnus)", description: "Label of the Service Discovery API field" })}
          description={intl.formatMessage({
            defaultMessage: "Address of Tunnus discovery catalog. Click Discover to populate all connected systems.",
            description: "Help text under discovery field",
          })}
          value={piDiscoveryUrl}
          control={(props) => <TextInput {...props} type="url" onChange={setPiDiscoveryUrl} />}
        />
        <Button variant="secondary" onClick={handleDiscover} loading={discovering} disabled={discovering} stretch>
          {intl.formatMessage({ defaultMessage: "Discover Services", description: "Button to query Tunnus discovery API" })}
        </Button>
      </BoxWrapper>

      {discoveryStatus && (
        <Alert tone="info" onDismiss={() => setDiscoveryStatus(null)}>
          {discoveryStatus}
        </Alert>
      )}

      {error && (
        <Alert tone="critical" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* 2. Pi Gateway Options & Address */}
      {discoveredGateways.length > 1 && (
        <FormField
          label={intl.formatMessage({ defaultMessage: "Discovered Pi Gateway options", description: "Label for Pi Gateway selector" })}
          value={gatewayUrl}
          control={() => (
            <Select
              value={gatewayUrl}
              options={discoveredGateways.map((g) => {
                const url = normalizeGatewayUrl(g.endpoint_url || g.url) || "";
                return {
                  value: url,
                  label: intl.formatMessage(
                    { defaultMessage: "{name} ({venue}) — {url}", description: "Discovered gateway option label" },
                    { name: g.name || g.id, venue: g.venue || "venue", url }
                  ),
                };
              })}
              onChange={(val) => {
                if (val) setGatewayUrl(val);
              }}
            />
          )}
        />
      )}

      <FormField
        label={intl.formatMessage({ defaultMessage: "Pi Gateway (https)", description: "Label of the Pi Gateway URL field" })}
        description={intl.formatMessage({
          defaultMessage: "Pi Gateway connects to local church presentation and ATEM systems.",
          description: "Help text for Pi Gateway URL field",
        })}
        value={gatewayUrl}
        control={(props) => <TextInput {...props} type="url" onChange={setGatewayUrl} />}
      />

      <FormField
        label={intl.formatMessage({ defaultMessage: "Pi Gateway access key", description: "Label of the gateway access key field" })}
        labelMarker="optional"
        description={intl.formatMessage({
          defaultMessage: "Leave empty when the gateway accepts your Canva / Tunnus sign-in.",
          description: "Help text under the access key field",
        })}
        value={gatewayApiKey}
        control={(props) => <TextInput {...props} onChange={setGatewayApiKey} />}
      />

      {/* 3. Sissi (Signage) Options & Address */}
      {discoveredSignage.length > 1 && (
        <FormField
          label={intl.formatMessage({ defaultMessage: "Discovered Sissi options", description: "Label for Sissi selector" })}
          value={signageUrl}
          control={() => (
            <Select
              value={signageUrl}
              options={discoveredSignage.map((s) => {
                const url = normalizeGatewayUrl(s.endpoint_url || s.url) || "";
                return {
                  value: url,
                  label: intl.formatMessage(
                    { defaultMessage: "{name} — {url}", description: "Discovered signage option label" },
                    { name: s.name || s.id, url }
                  ),
                };
              })}
              onChange={(val) => {
                if (val) setSignageUrl(val);
              }}
            />
          )}
        />
      )}

      <FormField
        label={intl.formatMessage({ defaultMessage: "Sissi (Signage) (https)", description: "Label of the signage service URL field" })}
        labelMarker="optional"
        description={intl.formatMessage({
          defaultMessage: "Include the path if there is one, for example https://host/sissi. Leave empty to turn signage off.",
          description: "Help text under the signage address field",
        })}
        value={signageUrl}
        control={(props) => <TextInput {...props} type="url" onChange={setSignageUrl} />}
      />

      <FormField
        label={intl.formatMessage({ defaultMessage: "Sissi signage key", description: "Label of the signage push key field" })}
        labelMarker="optional"
        description={intl.formatMessage({
          defaultMessage: "Only needed outside Canva. Leave empty when signage accepts your Canva sign-in.",
          description: "Help text under the signage key field",
        })}
        value={signagePushKey}
        control={(props) => <TextInput {...props} onChange={setSignagePushKey} />}
      />

      {/* 4. Valopankki Options & Address */}
      {discoveredValopankki.length > 1 && (
        <FormField
          label={intl.formatMessage({ defaultMessage: "Discovered Valopankki options", description: "Label for Valopankki selector" })}
          value={valopankkiUrl}
          control={() => (
            <Select
              value={valopankkiUrl}
              options={discoveredValopankki.map((v) => {
                const url = normalizeGatewayUrl(v.endpoint_url || v.url) || "";
                return {
                  value: url,
                  label: intl.formatMessage(
                    { defaultMessage: "{name} ({venue}) — {url}", description: "Discovered valopankki option label" },
                    { name: v.name || v.id, venue: v.venue || "parish", url }
                  ),
                };
              })}
              onChange={(val) => {
                if (val) setValopankkiUrl(val);
              }}
            />
          )}
        />
      )}

      <FormField
        label={intl.formatMessage({ defaultMessage: "Valopankki (https)", description: "Label of the Valopankki media library URL field" })}
        labelMarker="optional"
        description={intl.formatMessage({
          defaultMessage: "Parish media bank for photos, brand assets, and logos.",
          description: "Help text for Valopankki URL field",
        })}
        value={valopankkiUrl}
        control={(props) => <TextInput {...props} type="url" onChange={setValopankkiUrl} />}
      />

      {/* 5. Church Year API (Anno) */}
      <FormField
        label={intl.formatMessage({ defaultMessage: "Church year API (Anno) (https)", description: "Label of the Anno API URL field" })}
        labelMarker="optional"
        description={intl.formatMessage({
          defaultMessage: "Finnish Evangelical Lutheran Church liturgical calendar and readings.",
          description: "Help text for Anno API field",
        })}
        value={annoUrl}
        control={(props) => <TextInput {...props} type="url" onChange={setAnnoUrl} />}
      />

      {/* Action Buttons */}
      <Columns spacing="1u">
        <Column>
          <Button variant="primary" onClick={save} stretch>
            {intl.formatMessage({ defaultMessage: "Save", description: "Saves the settings" })}
          </Button>
        </Column>
        <Column>
          <Button
            variant="secondary"
            onClick={() => {
              clearRuntimeSettings();
              onSaved();
            }}
            stretch
          >
            {intl.formatMessage({ defaultMessage: "Use defaults", description: "Clears saved settings" })}
          </Button>
        </Column>
        {onClose && (
          <Column width="content">
            <Button variant="tertiary" onClick={onClose}>
              {intl.formatMessage({ defaultMessage: "Close", description: "Closes the settings form" })}
            </Button>
          </Column>
        )}
      </Columns>
    </Rows>
  );
}

function BoxWrapper({ children }: { children: React.ReactNode }) {
  return <Rows spacing="1u">{children}</Rows>;
}
