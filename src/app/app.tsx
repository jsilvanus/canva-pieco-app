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
import { readDesignPageText } from "../services/canva-sdk.mjs";
import { loadAccount, signIn, signOut } from "../services/auth.mjs";
import type { Account } from "../services/auth.mjs";
import type { NoticeTone } from "./types";
import { ChurchYearView } from "./church_year_view";
import { PiProgramLibraryView } from "./piprogram_library_view";
import { ValopankkiView } from "./valopankki_view";
import { SettingsForm } from "./settings_form";

const HEALTH_INTERVAL_MS = 15000;

export type AppCollectionMode = "kirkkovuosi" | "piprogram" | "valopankki";

/** The design panel: 3 church collections (Kirkkovuosi, PiProgram, Valopankki). */
export function App() {
  const intl = useIntl();
  const [collection, setCollection] = useState<AppCollectionMode>("kirkkovuosi");
  const [gatewayStatus, setGatewayStatus] = useState<"online" | "simulated" | "offline" | "checking">("checking");
  const [notice, setNotice] = useState<{ message: string; tone: NoticeTone } | null>(null);
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null);
  const [account, setAccount] = useState<Account>({ state: "off", name: "", rights: [], canWrite: true, canOperate: true });
  const [signingIn, setSigningIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
      const res = await getGatewayStatus("pipgm1");
      setGatewayStatus(res.isSimulated ? "simulated" : "online");
    } catch {
      setGatewayStatus("offline");
    }
  }, []);

  useEffect(() => {
    void checkGatewayHealth();
    const timer = setInterval(checkGatewayHealth, HEALTH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [checkGatewayHealth]);

  const refreshAccount = useCallback(async () => {
    setAccount(await loadAccount());
  }, []);
  useEffect(() => {
    void refreshAccount();
  }, [refreshAccount]);

  useEffect(() => {
    void readDesignPageText().catch(() => {});
  }, []);

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
      online: { tone: "positive", text: intl.formatMessage({ defaultMessage: "Connected", description: "Badge when the church gateway answers" }) },
      simulated: { tone: "warn", text: intl.formatMessage({ defaultMessage: "Simulated", description: "Badge when the gateway runs in simulation mode" }) },
      offline: { tone: "critical", text: intl.formatMessage({ defaultMessage: "Offline", description: "Badge when the church gateway cannot be reached" }) },
      checking: { tone: "info", text: intl.formatMessage({ defaultMessage: "Checking…", description: "Badge while the gateway status is being checked" }) },
    } as const
  )[gatewayStatus];

  const shared = {
    notify,
    showProgress,
    clearProgress,
    busy: Boolean(progress),
    canWrite: account.canWrite,
    canOperate: account.canOperate,
  };

  return (
    <Box padding="2u">
      <Rows spacing="2u">
        <Rows spacing="1u">
          <Columns spacing="1u" alignY="center">
            <Column>
              <Text size="small" tone="tertiary">
                {intl.formatMessage({ defaultMessage: "Build v{version}", description: "Small developer build version label" }, { version: BUILD_VERSION })}
              </Text>
            </Column>
            <Column width="content">
              <Button variant="tertiary" size="small" onClick={() => setShowSettings(!showSettings)}>
                {showSettings
                  ? intl.formatMessage({ defaultMessage: "Close", description: "Close settings" })
                  : intl.formatMessage({ defaultMessage: "Settings", description: "Open settings" })}
              </Button>
            </Column>
          </Columns>

          <Columns spacing="1u" alignY="center">
            <Column>
              <Title size="small">{CONFIG.appName}</Title>
            </Column>
            <Column width="content">
              <Badge tone={statusBadge.tone} text={statusBadge.text} tooltipLabel={CONFIG.gatewayUrl} />
            </Column>
          </Columns>
        </Rows>

        {showSettings ? (
          <Box padding="1.5u" background="neutralSubtle">
            <SettingsForm
              onClose={() => setShowSettings(false)}
              onSaved={() => {
                setShowSettings(false);
                void checkGatewayHealth();
                notify(intl.formatMessage({ defaultMessage: "Settings saved.", description: "Settings saved confirmation" }), "positive");
              }}
            />
          </Box>
        ) : (
          <>
            {account.state !== "off" && (
              <Rows spacing="1u">
                {account.state !== "signed-out" ? (
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
              </Rows>
            )}

            {notice && (
              <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
                {notice.message}
              </Alert>
            )}

            <SegmentedControl
              value={collection}
              onChange={setCollection}
              options={[
                {
                  value: "kirkkovuosi",
                  label: intl.formatMessage({ defaultMessage: "Kirkkovuosi", description: "Church year lectionary collection" }),
                },
                {
                  value: "piprogram",
                  label: intl.formatMessage({ defaultMessage: "Pi Ecosystem", description: "Pi Ecosystem items, decks, and venues collection" }),
                },
                {
                  value: "valopankki",
                  label: intl.formatMessage({ defaultMessage: "Valopankki", description: "Valopankki media and branding collection" }),
                },
              ]}
            />

            {progress && (
              <Rows spacing="0.5u">
                <Text size="small">{progress.label}</Text>
                <ProgressBar value={progress.percent} ariaLabel={progress.label} />
              </Rows>
            )}

            <Box>
              <Box display={collection === "kirkkovuosi" ? "block" : "none"}>
                <ChurchYearView notify={notify} />
              </Box>
              <Box display={collection === "piprogram" ? "block" : "none"}>
                <PiProgramLibraryView {...shared} />
              </Box>
              <Box display={collection === "valopankki" ? "block" : "none"}>
                <ValopankkiView notify={notify} />
              </Box>
            </Box>
          </>
        )}
      </Rows>
    </Box>
  );
}
