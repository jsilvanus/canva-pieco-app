import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Box,
  Button,
  Checkbox,
  Columns,
  Column,
  FormField,
  Grid,
  ImageCard,
  RadioGroup,
  Rows,
  Select,
  Switch,
  Tab,
  TabList,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@canva/app-ui-kit";
import { exportDesignPages, isRunningInCanva, openExternalUrl } from "../services/canva-sdk.mjs";
import {
  controlSlide,
  createGoLiveList,
  describeTask,
  parseUseAt,
  pushContent,
  setProjectorPicMute,
  toggleFtb,
  waitForTask,
} from "../services/gateway-api.mjs";
import type { GoLiveList, Task } from "../services/gateway-api.mjs";
import type { Page, PanelProps } from "./types";

type Step = "push" | "setup" | "live";
type Staged = { presentationId: string; itemId: string; title: string; pages: Page[] };
/** The play options: which feed, which Pi output, which projector (left = 1, right = 2) and whether to start from black. */
type Setup = { pipelineId: string; piOutput: string; projector: string; ftb: boolean };
type Live = { pipelineId: string; currentSlide: number; totalSlides: number; ftb: boolean; picMute: boolean; pages: Page[] };
type NavAction = "next" | "prev" | "gotoPage";
const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "");

const INITIAL_SETUP: Setup = { pipelineId: "pipgm1", piOutput: "pi1", projector: "left", ftb: false };

/** Slides: 1. push the design to church storage, 2. play options and Go live, 3. drive the slides live. */
export function SlidesView({ notify, showProgress, clearProgress, busy, active, onPipelineChange }: PanelProps & { onPipelineChange: (pipelineId: string) => void }) {
  const intl = useIntl();
  const [step, setStep] = useState<Step>("push");
  const [serviceDate, setServiceDate] = useState("");
  const [staged, setStaged] = useState<Staged | null>(null);
  const [setup, setSetup] = useState<Setup>(INITIAL_SETUP);
  const [settingUp, setSettingUp] = useState(false);
  const [live, setLive] = useState<Live | null>(null);
  const [golive, setGolive] = useState<GoLiveList | null>(null);

  const handlePush = async () => {
    let useAt = null;
    try {
      useAt = parseUseAt(serviceDate);
    } catch (err) {
      notify(errorMessage(err), "critical");
      return;
    }
    const showTask = (task: Task) => {
      const { percent, label } = describeTask(task);
      showProgress(percent, label);
    };
    try {
      showProgress(15, intl.formatMessage({ defaultMessage: "Exporting slides from Canva…", description: "Progress while Canva exports the design" }));
      const exported = await exportDesignPages();
      if (exported.status === "aborted") {
        clearProgress();
        notify(intl.formatMessage({ defaultMessage: "Export was cancelled.", description: "Notice when the user cancels the export" }));
        return;
      }
      const pages: Page[] = exported.exportBlobs || [];
      if (pages.length === 0) {
        clearProgress();
        notify(intl.formatMessage({ defaultMessage: "No pages were exported from Canva.", description: "Error when the export has no pages" }), "critical");
        return;
      }
      showProgress(30, intl.formatMessage({ defaultMessage: "Sending {count, plural, one {# slide} other {# slides}} to the church…", description: "Progress while slides are uploaded" }, { count: pages.length }));
      const task = await pushContent({ title: exported.title || "Canva Slides", pages, useAt });
      showTask(task);
      // The gateway downloads the pages, Pi Program unpacks them and makes the thumbnails.
      const finished = await waitForTask(task.taskId, { onUpdate: showTask });
      setStaged({ presentationId: finished.presentationId || task.presentationId || "", itemId: finished.itemId || task.itemId || "", title: exported.title || "Canva Presentation", pages });
      clearProgress();
      setStep("setup");
      notify(intl.formatMessage({ defaultMessage: "Sent {count, plural, one {# slide} other {# slides}} to church storage.", description: "Success after the upload" }, { count: pages.length }), "positive");
    } catch (err) {
      clearProgress();
      notify(errorMessage(err) || intl.formatMessage({ defaultMessage: "Failed to send slides.", description: "Generic upload error" }), "critical");
    }
  };

  const handleGoLive = async () => {
    if (!staged) return;
    setSettingUp(true);
    try {
      // The plugin only saves the list. The link opens picontrol on the church network, which runs it once.
      const list = await createGoLiveList({ itemId: staged.itemId, title: staged.title, feed: setup.pipelineId, piOutput: setup.piOutput, projector: setup.projector, ftb: setup.ftb });
      setGolive(list);
      setLive({
        pipelineId: setup.pipelineId,
        currentSlide: 1,
        totalSlides: staged.pages.length || 1,
        ftb: setup.ftb,
        picMute: false,
        pages: staged.pages,
      });
      onPipelineChange(setup.pipelineId);
      setStep("live");
      if (list.link) {
        const opened = await openExternalUrl(list.link);
        notify(
          opened
            ? intl.formatMessage({ defaultMessage: "Opening the control page. It puts the slides on the displays.", description: "Success after Go live saved the list and opened picontrol" })
            : intl.formatMessage({ defaultMessage: "Ready. Open the link below to put the slides on the displays.", description: "Notice when the control page could not be opened automatically" }),
          opened ? "positive" : "info",
        );
      } else {
        notify(
          intl.formatMessage({ defaultMessage: "The list is saved, but the gateway did not give a link to the control page.", description: "Warning when Go live has no link to open" }),
          "warn",
          8000,
        );
      }
    } catch (err) {
      notify(errorMessage(err) || intl.formatMessage({ defaultMessage: "Failed to save the Go live list.", description: "Generic Go live error" }), "critical");
    } finally {
      setSettingUp(false);
    }
  };

  // Setup needs pushed slides and Live needs a set-up pipeline; Tab has no disabled state.
  const available: Record<Step, boolean> = { push: true, setup: Boolean(staged), live: Boolean(live) };
  const tabLabel = {
    push: intl.formatMessage({ defaultMessage: "1. Push", description: "Tab for sending the design to the church" }),
    setup: intl.formatMessage({ defaultMessage: "2. Play", description: "Tab for the play options and Go live" }),
    live: intl.formatMessage({ defaultMessage: "3. Live", description: "Tab for live slide control" }),
  };

  return (
    <Rows spacing="2u">
      <Tabs activeId={step} onSelect={(id) => available[id as Step] && setStep(id as Step)}>
        <TabList>
          <Tab id="push">{tabLabel.push}</Tab>
          <Tab id="setup">{tabLabel.setup}</Tab>
          <Tab id="live">{tabLabel.live}</Tab>
        </TabList>
      </Tabs>

      {step === "push" && (
        <PushStep serviceDate={serviceDate} onServiceDateChange={setServiceDate} staged={staged} busy={busy} onPush={handlePush} onNext={() => setStep("setup")} />
      )}
      {step === "setup" && staged && <SetupStep staged={staged} setup={setup} onChange={setSetup} busy={settingUp} onApply={handleGoLive} />}
      {step === "live" && live && <LiveStep live={live} active={active} onChange={setLive} notify={notify} onReconfigure={() => setStep("setup")} golive={golive} />}
    </Rows>
  );
}

function PushStep({
  serviceDate,
  onServiceDateChange,
  staged,
  busy,
  onPush,
  onNext,
}: {
  serviceDate: string;
  onServiceDateChange: (value: string) => void;
  staged: Staged | null;
  busy: boolean;
  onPush: () => void;
  onNext: () => void;
}) {
  const intl = useIntl();
  const pushLabel = intl.formatMessage({ defaultMessage: "Push content to church", description: "Exports the design and uploads it to church storage" });

  return (
    <Rows spacing="2u">
      <Text>
        {intl.formatMessage({
          defaultMessage: "Export the slides of this design into Pi Program's church storage. Pushing stores the content without changing the live screens.",
          description: "Explains the push step",
        })}
      </Text>
      <FormField
        label={intl.formatMessage({ defaultMessage: "Service date", description: "Label of the service date field" })}
        labelMarker="optional"
        description={intl.formatMessage({
          defaultMessage: "For example 2026-11-08 or 2026-11-08T10. Several dates separated by commas; a range as 2026-11-08/2026-11-09.",
          description: "Help text under the service date field",
        })}
        value={serviceDate}
        control={(props) => <TextInput {...props} onChange={onServiceDateChange} />}
      />
      <Button variant="primary" onClick={onPush} loading={busy} disabled={busy} stretch>
        {pushLabel}
      </Button>
      {!isRunningInCanva() && (
        <Text size="small" tone="secondary">
          {intl.formatMessage({ defaultMessage: "Running outside Canva: the export is simulated.", description: "Shown when the app runs outside Canva" })}
        </Text>
      )}
      {staged && (
        <Rows spacing="1u">
          <Title size="xsmall">{staged.title}</Title>
          <Text size="small" tone="secondary">
            {intl.formatMessage({ defaultMessage: "{count, plural, one {# slide} other {# slides}} in church storage", description: "Number of slides already pushed" }, { count: staged.pages.length })}
          </Text>
          <Thumbnails pages={staged.pages} />
          <Button variant="secondary" onClick={onNext} stretch>
            {intl.formatMessage({ defaultMessage: "Continue to play options", description: "Moves to the play options step" })}
          </Button>
        </Rows>
      )}
    </Rows>
  );
}

function SetupStep({
  staged,
  setup,
  onChange,
  busy,
  onApply,
}: {
  staged: Staged;
  setup: Setup;
  onChange: React.Dispatch<React.SetStateAction<Setup>>;
  busy: boolean;
  onApply: () => void;
}) {
  const intl = useIntl();
  const update = (patch: Partial<Setup>) => onChange((prev) => ({ ...prev, ...patch }));
  const noItem = !staged.itemId;

  return (
    <Rows spacing="2u">
      <Text>
        {intl.formatMessage(
          {
            defaultMessage: "Choose where the {count, plural, one {# slide} other {# slides}} should be shown. Go live saves these choices; the control page at the church then puts the slides on the displays.",
            description: "Explains the play options step",
          },
          { count: staged.pages.length },
        )}
      </Text>
      <FormField
        label={intl.formatMessage({ defaultMessage: "Feed", description: "Label of the Pi Program feed choice" })}
        value={setup.pipelineId}
        control={(props) => (
          <RadioGroup
            {...props}
            onChange={(pipelineId) => update({ pipelineId })}
            options={[
              { value: "pipgm1", label: intl.formatMessage({ defaultMessage: "Pi Program 1", description: "First feed" }) },
              { value: "pipgm2", label: intl.formatMessage({ defaultMessage: "Pi Program 2", description: "Second feed" }) },
              { value: "pipgm3", label: intl.formatMessage({ defaultMessage: "Pi Program 3", description: "Third feed" }) },
            ]}
          />
        )}
      />
      <FormField
        label={intl.formatMessage({ defaultMessage: "Pi output", description: "Label of the Pi output choice" })}
        value={setup.piOutput}
        control={(props) => (
          <Select
            {...props}
            stretch
            onChange={(piOutput) => update({ piOutput })}
            options={[
              { value: "pi1", label: intl.formatMessage({ defaultMessage: "Pi 1 (Atlona input 3)", description: "First Pi output" }) },
              { value: "pi2", label: intl.formatMessage({ defaultMessage: "Pi 2 (Atlona input 4)", description: "Second Pi output" }) },
            ]}
          />
        )}
      />
      <FormField
        label={intl.formatMessage({ defaultMessage: "Projector", description: "Label of the projector choice" })}
        value={setup.projector}
        control={(props) => (
          <RadioGroup
            {...props}
            onChange={(projector) => update({ projector })}
            options={[
              { value: "left", label: intl.formatMessage({ defaultMessage: "Left projector", description: "Projector 1" }) },
              { value: "right", label: intl.formatMessage({ defaultMessage: "Right projector", description: "Projector 2" }) },
              { value: "none", label: intl.formatMessage({ defaultMessage: "Not to a projector", description: "Leave the projectors as they are" }) },
            ]}
          />
        )}
      />
      <Checkbox
        checked={setup.ftb}
        onChange={(_value: unknown, checked: boolean) => update({ ftb: checked })}
        label={intl.formatMessage({ defaultMessage: "Start with fade to black", description: "The feed stays black until it is faded in" })}
        description={intl.formatMessage({ defaultMessage: "The slides are ready behind black. Fade in from the control page.", description: "Explains starting with fade to black" })}
      />
      {noItem && (
        <Text size="small" tone="critical">
          {intl.formatMessage({ defaultMessage: "These slides are not in the church library yet. Push them again first.", description: "Shown when the push gave no library item" })}
        </Text>
      )}
      <Button variant="primary" onClick={onApply} loading={busy} disabled={busy || noItem} stretch>
        {intl.formatMessage({ defaultMessage: "Go live", description: "Saves the play options and opens the control page" })}
      </Button>
    </Rows>
  );
}

function LiveStep({
  live,
  active,
  onChange,
  notify,
  onReconfigure,
  golive,
}: {
  live: Live;
  active: boolean;
  onChange: React.Dispatch<React.SetStateAction<Live | null>>;
  notify: PanelProps["notify"];
  onReconfigure: () => void;
  golive: GoLiveList | null;
}) {
  const intl = useIntl();
  const [controlling, setControlling] = useState(false);
  const { currentSlide, totalSlides } = live;

  const goTo = async (action: NavAction, targetPage: number | null = null) => {
    if (controlling) return;
    let next = currentSlide;
    if (action === "next") {
      if (currentSlide >= totalSlides) return;
      next = currentSlide + 1;
    } else if (action === "prev") {
      if (currentSlide <= 1) return;
      next = currentSlide - 1;
    } else if (action === "gotoPage" && targetPage) {
      next = Math.max(1, Math.min(totalSlides, targetPage));
    }
    onChange((prev) => prev && { ...prev, currentSlide: next }); // optimistic
    setControlling(true);
    try {
      const res = await controlSlide({ pipelineId: live.pipelineId, action, page: action === "gotoPage" ? next : undefined });
      const confirmed = res?.currentPage;
      if (typeof confirmed === "number") onChange((prev) => prev && { ...prev, currentSlide: confirmed });
    } catch (err) {
      notify(errorMessage(err) || intl.formatMessage({ defaultMessage: "Failed to change the slide.", description: "Slide navigation error" }), "critical");
    } finally {
      setControlling(false);
    }
  };

  const setFtb = async (enabled: boolean) => {
    onChange((prev) => prev && { ...prev, ftb: enabled });
    try {
      await toggleFtb({ pipelineId: live.pipelineId, enabled });
    } catch (err) {
      onChange((prev) => prev && { ...prev, ftb: !enabled });
      notify(errorMessage(err) || intl.formatMessage({ defaultMessage: "Failed to fade to black.", description: "FTB error" }), "critical");
    }
  };

  const setPicMute = async (muted: boolean) => {
    onChange((prev) => prev && { ...prev, picMute: muted });
    try {
      await setProjectorPicMute({ muted, pipelineId: live.pipelineId });
    } catch (err) {
      onChange((prev) => prev && { ...prev, picMute: !muted });
      notify(errorMessage(err) || intl.formatMessage({ defaultMessage: "Failed to mute the projectors.", description: "Picture mute error" }), "critical");
    }
  };

  // Keyboard: arrows/PageUp/PageDown/space change slides, B = fade to black, M = picture mute.
  const keys = useRef({ goTo, setFtb, setPicMute, live, active });
  keys.current = { goTo, setFtb, setPicMute, live, active };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      const k = keys.current;
      if (!k.active) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") k.goTo("next");
      else if (e.key === "ArrowLeft" || e.key === "PageUp") k.goTo("prev");
      else if (e.key === "b" || e.key === "B") k.setFtb(!k.live.ftb);
      else if (e.key === "m" || e.key === "M") k.setPicMute(!k.live.picMute);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Rows spacing="2u">
      <Text size="small" tone="secondary">
        {intl.formatMessage({ defaultMessage: "Live on {pipeline}", description: "Which pipeline is live" }, { pipeline: live.pipelineId.toUpperCase() })}
      </Text>
      {golive?.link && (
        <Button variant="secondary" onClick={() => openExternalUrl(golive.link as string)} stretch>
          {intl.formatMessage({ defaultMessage: "Open the control page", description: "Opens picontrol again from the live step" })}
        </Button>
      )}
      <Box background="neutralSubtle" borderRadius="large" padding="2u">
        <Rows spacing="0.5u" align="center">
          <Text size="small" tone="secondary">
            {intl.formatMessage({ defaultMessage: "Current slide", description: "Label above the slide number" })}
          </Text>
          <Title size="large">
            {intl.formatMessage({ defaultMessage: "{current} / {total}", description: "Current slide number out of the slide count" }, { current: currentSlide, total: totalSlides })}
          </Title>
        </Rows>
      </Box>
      <Columns spacing="1u">
        <Column>
          <Button variant="secondary" icon={ArrowLeftIcon} onClick={() => goTo("prev")} disabled={currentSlide <= 1} stretch>
            {intl.formatMessage({ defaultMessage: "Previous", description: "Previous slide button" })}
          </Button>
        </Column>
        <Column>
          <Button variant="primary" icon={ArrowRightIcon} iconPosition="end" onClick={() => goTo("next")} disabled={currentSlide >= totalSlides} stretch>
            {intl.formatMessage({ defaultMessage: "Next", description: "Next slide button" })}
          </Button>
        </Column>
      </Columns>
      {live.pages?.length > 0 && <Thumbnails pages={live.pages} selected={currentSlide} onSelect={(n) => goTo("gotoPage", n)} />}
      <Switch
        value={live.ftb}
        onChange={setFtb}
        label={intl.formatMessage({ defaultMessage: "Fade to black (B)", description: "Switch for fade to black" })}
      />
      <Switch
        value={live.picMute}
        onChange={setPicMute}
        label={intl.formatMessage({ defaultMessage: "Projector picture mute (M)", description: "Switch that blanks the projector beams" })}
      />
      <Columns spacing="1u">
        <Column>
          <Button variant="tertiary" onClick={() => goTo("gotoPage", 1)} stretch>
            {intl.formatMessage({ defaultMessage: "Back to slide 1", description: "Jumps to the first slide" })}
          </Button>
        </Column>
        <Column>
          <Button variant="tertiary" onClick={onReconfigure} stretch>
            {intl.formatMessage({ defaultMessage: "Play options", description: "Returns to the play options step" })}
          </Button>
        </Column>
      </Columns>
    </Rows>
  );
}

/** Slide thumbnails; clicking one selects it when onSelect is given. */
export function Thumbnails({ pages, selected, onSelect }: { pages: Page[]; selected?: number; onSelect?: (n: number) => void }) {
  const intl = useIntl();
  return (
    <Grid columns={4} spacing="1u">
      {pages.map((page, index) => {
        const n = index + 1;
        const alt = page.name || intl.formatMessage({ defaultMessage: "Slide {n}", description: "Alt text of a slide thumbnail" }, { n });
        return (
          <ImageCard
            key={page.url || n}
            thumbnailUrl={page.url}
            alt={alt}
            ariaLabel={alt}
            borderRadius="standard"
            selectable={Boolean(onSelect)}
            selected={selected === n}
            onClick={onSelect ? () => onSelect(n) : () => {}}
          />
        );
      })}
    </Grid>
  );
}
