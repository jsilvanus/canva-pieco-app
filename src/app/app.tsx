import { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { Alert, Badge, Box, Button, CogIcon, Columns, Column, ProgressBar, Rows, SegmentedControl, Text, Title } from "@canva/app-ui-kit";
import { CONFIG } from "../config.mjs";
import { getGatewayStatus } from "../services/gateway-api.mjs";
import { SettingsForm } from "./settings_form";
import type { NoticeTone } from "./types";
import { SlidesView } from "./slides_view";
import { GraphicsView } from "./graphics_view";

const HEALTH_INTERVAL_MS = 15000;

/** The design panel: gateway status, settings, and the Slides / Graphics modes. */
export function App() {
  const intl = useIntl();
  const [mode, setMode] = useState<"slides" | "graphics">("slides");
  const [gatewayStatus, setGatewayStatus] = useState<"online" | "simulated" | "offline" | "checking">("checking");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<{ message: string; tone: NoticeTone } | null>(null);
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null);
  const [pipelineId, setPipelineId] = useState("pipgm1");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string, tone: NoticeTone = "info", durationMs = 4000) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ message, tone });
    noticeTimer.current = setTimeout(() => setNotice(null), durationMs);
  }, []);

  const showProgress = useCallback((percent: number, label: string) => {
    setProgress({ percent: Math.min(100, Math.max(0, Math.round(percent))), label });
  }, []);
  const clearProgress = useCallback(() => setProgress(null), []);

  const checkGatewayHealth = useCallback(async () => {
    try {
      const res = await getGatewayStatus(pipelineId);
      setGatewayStatus(res.isSimulated ? "simulated" : "online");
    } catch {
      setGatewayStatus("offline");
    }
  }, [pipelineId]);

  useEffect(() => {
    if (settingsOpen) return undefined;
    checkGatewayHealth();
    const timer = setInterval(checkGatewayHealth, HEALTH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [checkGatewayHealth, settingsOpen]);

  const statusBadge = (
    {
    online: { tone: "positive", text: intl.formatMessage({ defaultMessage: "Gateway connected", description: "Badge when the church gateway answers" }) },
    simulated: { tone: "warn", text: intl.formatMessage({ defaultMessage: "Simulated", description: "Badge when the gateway runs in simulation mode" }) },
    offline: { tone: "critical", text: intl.formatMessage({ defaultMessage: "Gateway offline", description: "Badge when the church gateway cannot be reached" }) },
    checking: { tone: "info", text: intl.formatMessage({ defaultMessage: "Checking…", description: "Badge while the gateway status is being checked" }) },
  } as const
  )[gatewayStatus];

  const shared = { notify, showProgress, clearProgress, busy: Boolean(progress) };

  return (
    <Box padding="2u">
      <Rows spacing="2u">
        <Rows spacing="1u">
          <Columns spacing="1u" alignY="center">
            <Column>
              <Title size="small">{CONFIG.appName}</Title>
            </Column>
            <Column width="content">
              <Badge tone={statusBadge.tone} text={statusBadge.text} tooltipLabel={CONFIG.gatewayUrl} />
            </Column>
          </Columns>
          <Columns spacing="1u" alignY="center">
            <Column>
              <Text size="small" tone="secondary" lineClamp={1}>
                {CONFIG.gatewayUrl}
              </Text>
            </Column>
            <Column width="content">
              <Button
                variant="tertiary"
                icon={CogIcon}
                onClick={() => setSettingsOpen((open) => !open)}
                pressed={settingsOpen}
                ariaLabel={intl.formatMessage({ defaultMessage: "Gateway settings", description: "Button that opens the gateway address and access key form" })}
                tooltipLabel={intl.formatMessage({ defaultMessage: "Gateway settings", description: "Button that opens the gateway address and access key form" })}
              />
            </Column>
          </Columns>
        </Rows>

        {settingsOpen && (
          <SettingsForm
            onClose={() => setSettingsOpen(false)}
            onSaved={() => {
              setSettingsOpen(false);
              setGatewayStatus("checking");
            }}
          />
        )}

        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: "slides", label: intl.formatMessage({ defaultMessage: "Slides", description: "Mode for presenting slides on the projectors" }) },
            { value: "graphics", label: intl.formatMessage({ defaultMessage: "ATEM graphics", description: "Mode for flying graphics onto the ATEM stream" }) },
          ]}
        />

        {progress && (
          <Rows spacing="0.5u">
            <Text size="small">{progress.label}</Text>
            <ProgressBar value={progress.percent} ariaLabel={progress.label} />
          </Rows>
        )}

        {notice && (
          <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.message}
          </Alert>
        )}

        <Box>
          {/* Both modes stay mounted so a staged presentation or loaded deck survives switching. */}
          <Box display={mode === "slides" ? "block" : "none"}>
            <SlidesView {...shared} active={mode === "slides"} onPipelineChange={setPipelineId} />
          </Box>
          <Box display={mode === "graphics" ? "block" : "none"}>
            <GraphicsView {...shared} active={mode === "graphics"} />
          </Box>
        </Box>

        {gatewayStatus === "offline" && (
          <Button variant="tertiary" onClick={checkGatewayHealth} stretch>
            {intl.formatMessage({ defaultMessage: "Check the gateway again", description: "Button that re-checks the gateway connection" })}
          </Button>
        )}
      </Rows>
    </Box>
  );
}
