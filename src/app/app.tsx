import { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import {
  Alert,
  Badge,
  Box,
  Button,
  Columns,
  Column,
  ProgressBar,
  Rows,
  SegmentedControl,
  Text,
  Title,
} from "@canva/app-ui-kit";
import { BUILD_VERSION } from "../build-version.mjs";
import { CONFIG } from "../config.mjs";
import { getGatewayStatus } from "../services/gateway-api.mjs";
import { loadAccount, signIn, signOut } from "../services/auth.mjs";
import type { Account } from "../services/auth.mjs";
import type { NoticeTone } from "./types";
import { SlidesView } from "./slides_view";
import { GraphicsView } from "./graphics_view";

const HEALTH_INTERVAL_MS = 15000;

/** The design panel: gateway status, settings, and the Slides / Graphics modes. */
export function App() {
  const intl = useIntl();
  const [mode, setMode] = useState<"slides" | "graphics">("slides");
  const [gatewayStatus, setGatewayStatus] = useState<"online" | "simulated" | "offline" | "checking">("checking");
  const [notice, setNotice] = useState<{ message: string; tone: NoticeTone } | null>(null);
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null);
  const [pipelineId, setPipelineId] = useState("pipgm1");
  const [account, setAccount] = useState<Account>({ state: "off", name: "", rights: [], canWrite: true, canOperate: true });
  const [signingIn, setSigningIn] = useState(false);
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
    checkGatewayHealth();
    const timer = setInterval(checkGatewayHealth, HEALTH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [checkGatewayHealth]);

  const refreshAccount = useCallback(async () => {
    setAccount(await loadAccount());
  }, []);
  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  const onSignIn = async () => {
    setSigningIn(true);
    try {
      const done = await signIn();
      if (!done) notify(intl.formatMessage({ defaultMessage: "Sign-in was cancelled.", description: "Notice when the person closes the sign-in window" }));
      await refreshAccount();
      await checkGatewayHealth();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical", 8000);
    } finally {
      setSigningIn(false);
    }
  };
  const onSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical", 8000);
    }
    await refreshAccount();
  };

  const statusBadge = (
    {
    online: { tone: "positive", text: intl.formatMessage({ defaultMessage: "Gateway connected", description: "Badge when the church gateway answers" }) },
    simulated: { tone: "warn", text: intl.formatMessage({ defaultMessage: "Simulated", description: "Badge when the gateway runs in simulation mode" }) },
    offline: { tone: "critical", text: intl.formatMessage({ defaultMessage: "Gateway offline", description: "Badge when the church gateway cannot be reached" }) },
    checking: { tone: "info", text: intl.formatMessage({ defaultMessage: "Checking…", description: "Badge while the gateway status is being checked" }) },
  } as const
  )[gatewayStatus];

  const shared = { notify, showProgress, clearProgress, busy: Boolean(progress), canWrite: account.canWrite, canOperate: account.canOperate };

  return (
    <Box padding="2u">
      <Rows spacing="2u">
        <Rows spacing="1u">
          <Text size="small" tone="tertiary">
            {intl.formatMessage({ defaultMessage: "Build v{version}", description: "Small developer build version label" }, { version: BUILD_VERSION })}
          </Text>
          <Columns spacing="1u" alignY="center">
            <Column>
              <Title size="small">{CONFIG.appName}</Title>
            </Column>
            <Column width="content">
              <Badge tone={statusBadge.tone} text={statusBadge.text} tooltipLabel={CONFIG.gatewayUrl} />
            </Column>
          </Columns>
          <Text size="small" tone="secondary" lineClamp={1}>
            {CONFIG.gatewayUrl}
          </Text>
        </Rows>

        {account.state !== "off" && (
          <Rows spacing="1u">
            {account.state === "signed-in" || account.state === "no-access" ? (
              <Columns spacing="1u" alignY="center">
                <Column>
                  <Text size="small">
                    {account.name
                      ? intl.formatMessage({ defaultMessage: "Signed in as {name}", description: "Shows the signed-in person" }, { name: account.name })
                      : intl.formatMessage({ defaultMessage: "Signed in", description: "Shows that a person is signed in" })}
                  </Text>
                </Column>
                <Column width="content">
                  <Button variant="tertiary" onClick={onSignOut}>
                    {intl.formatMessage({ defaultMessage: "Sign out", description: "Signs the person out of the church account" })}
                  </Button>
                </Column>
              </Columns>
            ) : (
              <Button variant="secondary" onClick={onSignIn} loading={signingIn} disabled={signingIn} stretch>
                {intl.formatMessage({ defaultMessage: "Sign in with the church account", description: "Opens the church sign-in window" })}
              </Button>
            )}
            {account.state === "no-access" && (
              <Alert tone="warn">
                {intl.formatMessage({ defaultMessage: "Your account has no access to this app. Ask the church admin to add you to a group.", description: "Shown when the signed-in person has no rights" })}
              </Alert>
            )}
            {account.state === "signed-in" && !account.canOperate && (
              <Text size="small" tone="secondary">
                {intl.formatMessage({ defaultMessage: "You can publish content. Going live and controlling the show need operator rights.", description: "Shown to a person who can only publish" })}
              </Text>
            )}
            {account.state === "signed-in" && !account.canWrite && account.canOperate && (
              <Text size="small" tone="secondary">
                {intl.formatMessage({ defaultMessage: "You can run the show but not publish content.", description: "Shown to a person who can only operate" })}
              </Text>
            )}
          </Rows>
        )}

        {notice && (
          <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.message}
          </Alert>
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
