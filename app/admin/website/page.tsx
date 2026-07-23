"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  History,
  Rocket,
  Undo2,
  Plus,
  Trash2,
  ExternalLink,
  CircleDot,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { useAccount } from "@/components/account/account-provider";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { MediaField } from "@/components/admin/ui/media-field";
import {
  Badge,
  Button,
  Card,
  Modal,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/admin/ui/primitives";
import { formatDateTime } from "@/components/admin/ui/tokens";
import { ICON_NAMES } from "@/components/cms/icon-registry";
import { useStoreSettings } from "@/components/common/settings-provider";

/* ------------------------------------------------------------------ */
/* TYPES                                                              */
/* ------------------------------------------------------------------ */

interface PageSection {
  _id: string;
  page: string;
  key: string;
  label: string;
  type: string;
  enabled: boolean;
  sortOrder: number;
  draft: Record<string, unknown> | null;
  published: Record<string, unknown> | null;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  publishedBy: string;
  updatedBy: string;
}

interface Version {
  _id: string;
  version: number;
  action: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

const PAGE = "homepage";

/* ------------------------------------------------------------------ */
/* PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function WebsiteBuilderPage() {
  const { user } = useAccount();
  const isSuperAdmin = user?.role === "Super Admin";

  const [sections, setSections] = React.useState<PageSection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<PageSection | null>(null);
  const [historyFor, setHistoryFor] = React.useState<PageSection | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSections(await apiFetch<PageSection[]>(`/admin/content/${PAGE}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sections");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  /** Persist the whole layout (order + visibility) in one call. */
  const saveLayout = async (next: PageSection[]) => {
    setSections(next); // optimistic — the list should feel instant
    try {
      await apiFetch(`/admin/content/${PAGE}/reorder`, {
        method: "PUT",
        body: {
          sections: next.map((s, i) => ({ key: s.key, sortOrder: i, enabled: s.enabled })),
        },
      });
    } catch (err) {
      toast.error("Could not save layout", {
        description: err instanceof Error ? err.message : undefined,
      });
      load(); // reconcile with the server
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    saveLayout(next);
  };

  const toggleVisible = (section: PageSection) => {
    saveLayout(
      sections.map((s) => (s.key === section.key ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const publish = async (section: PageSection) => {
    setBusy(true);
    try {
      await apiFetch(`/admin/content/${PAGE}/${section.key}/publish`, { method: "POST" });

      /**
       * The storefront caches server-rendered content for 60s. Bust it now, or
       * the owner publishes and sees no change for a minute and assumes it
       * failed. Non-fatal: the cache would expire on its own anyway.
       */
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});

      toast.success(`"${section.label}" is live`, {
        description: "A version snapshot was saved to history.",
      });
      await load();
    } catch (err) {
      toast.error("Could not publish", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const discard = async (section: PageSection) => {
    setBusy(true);
    try {
      await apiFetch(`/admin/content/${PAGE}/${section.key}/revert`, { method: "POST" });
      toast.success("Draft discarded", { description: "Back to what's live." });
      await load();
    } catch (err) {
      toast.error("Could not discard draft", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const unpublishedCount = sections.filter((s) => s.hasUnpublishedChanges).length;

  return (
    <AdminShell
      title="Website Builder"
      description="Every section of the homepage, edited without touching code."
      actions={
        <>
          <Button
            variant="secondary"
            onClick={() => window.open("/?preview=1", "_blank")}
          >
            <ExternalLink className="size-3.5" />
            Preview drafts
          </Button>
        </>
      }
    >
      {unpublishedCount > 0 && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-semibold text-amber-800">
            {unpublishedCount} section{unpublishedCount === 1 ? " has" : "s have"} unpublished
            changes. They&apos;re saved, but not visible to customers yet.
          </p>
        </Card>
      )}

      {!isSuperAdmin && (
        <Card className="mb-4 border-blue-200 bg-blue-50/60 p-3">
          <p className="text-xs text-blue-800">
            You can edit and save drafts. Publishing to the live site is reserved for a Super
            Admin.
          </p>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : sections.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="No sections yet"
            description="Run `npm run seed:cms` to import the site's current content into the builder."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sections.map((section, i) => (
            <SectionRow
              key={section.key}
              section={section}
              index={i}
              total={sections.length}
              isSuperAdmin={isSuperAdmin}
              busy={busy}
              onMove={move}
              onToggle={toggleVisible}
              onEdit={() => setEditing(section)}
              onHistory={() => setHistoryFor(section)}
              onPublish={() => publish(section)}
              onDiscard={() => discard(section)}
            />
          ))}
        </div>
      )}

      {editing && (
        <SectionEditor
          section={editing}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}

      {historyFor && (
        <VersionHistory
          section={historyFor}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setHistoryFor(null)}
          onRestored={async () => {
            setHistoryFor(null);
            await load();
          }}
        />
      )}
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* SECTION ROW                                                        */
/* ------------------------------------------------------------------ */

function SectionRow({
  section,
  index,
  total,
  isSuperAdmin,
  busy,
  onMove,
  onToggle,
  onEdit,
  onHistory,
  onPublish,
  onDiscard,
}: {
  section: PageSection;
  index: number;
  total: number;
  isSuperAdmin: boolean;
  busy: boolean;
  onMove: (i: number, dir: -1 | 1) => void;
  onToggle: (s: PageSection) => void;
  onEdit: () => void;
  onHistory: () => void;
  onPublish: () => void;
  onDiscard: () => void;
}) {
  return (
    <Card
      className={cn(
        "flex flex-wrap items-center gap-3 p-3 transition-all duration-200",
        !section.enabled && "opacity-60"
      )}
    >
      {/* Reorder Controls */}
      <div className="flex flex-col gap-0.5 bg-gray-100/90 p-1 rounded-xl border border-gray-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          title="Move section up on live website"
          aria-label={`Move ${section.label} up`}
          className="grid size-6 place-items-center rounded-lg bg-white text-gray-700 shadow-2xs hover:bg-purple-50 hover:text-[#5B2C83] disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-700 transition-all cursor-pointer"
        >
          <ArrowUp className="size-3.5 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          title="Move section down on live website"
          aria-label={`Move ${section.label} down`}
          className="grid size-6 place-items-center rounded-lg bg-white text-gray-700 shadow-2xs hover:bg-purple-50 hover:text-[#5B2C83] disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-700 transition-all cursor-pointer"
        >
          <ArrowDown className="size-3.5 stroke-[2.5]" />
        </button>
      </div>

      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-purple-50 text-xs font-bold text-[#5B2C83]">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-900">{section.label}</p>
          <Badge tone="neutral">{section.type}</Badge>
          {section.hasUnpublishedChanges && (
            <Badge tone="warning">
              <CircleDot className="size-2.5" />
              Unpublished
            </Badge>
          )}
          {!section.enabled && <Badge tone="danger">Hidden</Badge>}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {section.publishedAt
            ? `Live since ${formatDateTime(section.publishedAt)}`
            : "Never published"}
          {section.updatedBy && ` · last edited by ${section.updatedBy}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggle(section)}
          title={section.enabled ? "Hide from site" : "Show on site"}
        >
          {section.enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </Button>

        <Button variant="ghost" size="sm" onClick={onHistory} title="Version history">
          <History className="size-3.5" />
        </Button>

        {section.hasUnpublishedChanges && (
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={busy} title="Discard draft">
            <Undo2 className="size-3.5" />
          </Button>
        )}

        <Button variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onPublish}
          disabled={busy || !section.hasUnpublishedChanges || !isSuperAdmin}
          title={
            !isSuperAdmin
              ? "Only a Super Admin can publish"
              : !section.hasUnpublishedChanges
                ? "Nothing new to publish"
                : "Publish to the live site"
          }
        >
          <Rocket className="size-3.5" />
          Publish
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* SECTION EDITOR                                                     */
/* ------------------------------------------------------------------ */

/**
 * Renders a real form per section type — not a JSON textarea.
 *
 * The editor works on a local copy of the draft and only PUTs on save, so a
 * half-typed heading never reaches the database.
 */
function SectionEditor({
  section,
  isSuperAdmin,
  onClose,
  onSaved,
}: {
  section: PageSection;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = React.useState<Record<string, any>>(
    () => structuredClone(section.draft ?? section.published ?? {})
  );
  const [saving, setSaving] = React.useState(false);

  const set = (key: string, value: unknown) =>
    setContent((c) => ({ ...c, [key]: value }));

  const dirty = React.useMemo(
    () =>
      JSON.stringify(content) !==
      JSON.stringify(section.draft ?? section.published ?? {}),
    [content, section.draft, section.published]
  );

  /** Persist the draft. Returns false so callers can abort on failure. */
  const saveDraft = async (): Promise<boolean> => {
    setSaving(true);
    try {
      await apiFetch(`/admin/content/${PAGE}/${section.key}/draft`, {
        method: "PUT",
        body: { content },
      });
      return true;
    } catch (err) {
      toast.error("Could not save draft", {
        description: err instanceof Error ? err.message : undefined,
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (await saveDraft()) {
      toast.success("Draft saved", { description: "Preview it, then publish when ready." });
      onSaved();
    }
  };

  /** Save first, so the preview shows exactly what's in the form. */
  const preview = async () => {
    if (dirty && !(await saveDraft())) return;
    window.open(`/?preview=1#${section.key}`, "_blank");
  };

  const publish = async () => {
    if (dirty && !(await saveDraft())) return;

    setSaving(true);
    try {
      await apiFetch(`/admin/content/${PAGE}/${section.key}/publish`, { method: "POST" });
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});
      toast.success(`"${section.label}" is live`, {
        description: "Customers can see it now.",
      });
      onSaved();
    } catch (err) {
      toast.error("Could not publish", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit — ${section.label}`}
      description="Changes are saved as a draft. Nothing goes live until you publish."
      width="max-w-3xl"
    >
      {section.type === "hero" && <HeroEditor content={content} set={set} />}
      {section.type === "announcement" && <AnnouncementEditor content={content} set={set} />}
      {section.type === "newsletter" && <NewsletterEditor content={content} set={set} />}
      {section.type === "feature-grid" && (
        <FeatureGridEditor content={content} set={set} sectionKey={section.key} />
      )}
      {section.type === "gallery" && <GalleryEditor content={content} set={set} />}
      {section.type === "faq" && <FaqEditor content={content} set={set} />}
      {!["hero", "announcement", "newsletter", "feature-grid", "gallery", "faq"].includes(
        section.type
      ) && <GenericEditor content={content} set={set} sectionKey={section.key} />}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={preview} disabled={saving}>
          <Eye className="size-3.5" />
          Preview
        </Button>
        <Button variant="secondary" onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save draft"}
        </Button>
        <Button
          variant="primary"
          onClick={publish}
          disabled={saving || !isSuperAdmin || (!dirty && !section.hasUnpublishedChanges)}
          title={isSuperAdmin ? undefined : "Only a Super Admin can publish"}
        >
          <Rocket className="size-3.5" />
          Publish
        </Button>
      </div>
    </Modal>
  );
}

/* ---------- field primitives ---------- */

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15 transition-all";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

function Text({
  label,
  value,
  onChange,
  hint,
  textarea,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  textarea?: boolean;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {textarea ? (
        <textarea
          rows={3}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(INPUT, "resize-y")}
        />
      ) : (
        <input
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
        />
      )}
    </Field>
  );
}

/* ---------- hero ---------- */

function HeroEditor({
  content,
  set,
}: {
  content: Record<string, any>;
  set: (k: string, v: unknown) => void;
}) {
  const slides: any[] = content.slides ?? [];
  const stats: any[] = content.stats ?? [];

  const updateSlide = (i: number, patch: Record<string, unknown>) =>
    set("slides", slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const addSlide = () =>
    set("slides", [
      ...slides,
      {
        id: `slide-${Date.now()}`,
        enabled: true,
        badge: "",
        badgeCount: 0,
        headingLine1: "",
        headingLine2: "",
        description: "",
        primaryCta: { label: "Shop Now", href: "/shop" },
        secondaryCta: { label: "", href: "" },
      },
    ]);

  return (
    <div className="flex flex-col gap-5">
      {slides.map((slide, i) => (
        <Card key={slide.id ?? i} className="p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">Slide {i + 1}</p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSlide(i, { enabled: slide.enabled === false })}
              >
                {slide.enabled === false ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </Button>
              {slides.length > 1 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => set("slides", slides.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Text
              label="Badge"
              value={slide.badge}
              onChange={(v) => updateSlide(i, { badge: v })}
              hint="{count} is replaced by the number below"
            />
            <Field label="Badge count">
              <input
                type="number"
                value={slide.badgeCount ?? 0}
                onChange={(e) => updateSlide(i, { badgeCount: Number(e.target.value) })}
                className={INPUT}
              />
            </Field>
            <Text
              label="Heading line 1"
              value={slide.headingLine1}
              onChange={(v) => updateSlide(i, { headingLine1: v })}
            />
            <Text
              label="Heading line 2 (gradient)"
              value={slide.headingLine2}
              onChange={(v) => updateSlide(i, { headingLine2: v })}
            />
          </div>

          <div className="mt-3">
            <Text
              label="Description"
              value={slide.description}
              onChange={(v) => updateSlide(i, { description: v })}
              textarea
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Text
              label="Primary button"
              value={slide.primaryCta?.label}
              onChange={(v) =>
                updateSlide(i, { primaryCta: { ...(slide.primaryCta ?? {}), label: v } })
              }
            />
            <Text
              label="Primary link"
              value={slide.primaryCta?.href}
              onChange={(v) =>
                updateSlide(i, { primaryCta: { ...(slide.primaryCta ?? {}), href: v } })
              }
            />
            <Text
              label="Secondary button"
              value={slide.secondaryCta?.label}
              onChange={(v) =>
                updateSlide(i, { secondaryCta: { ...(slide.secondaryCta ?? {}), label: v } })
              }
              hint="Leave blank to hide"
            />
            <Text
              label="Secondary link"
              value={slide.secondaryCta?.href}
              onChange={(v) =>
                updateSlide(i, { secondaryCta: { ...(slide.secondaryCta ?? {}), href: v } })
              }
            />
          </div>

          {/* Brand visual + price tag */}
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px]">
            <MediaField
              label="Hero image / video"
              value={slide.image}
              onChange={(url) => updateSlide(i, { image: url })}
              accept="image/*,video/*"
              hint="Your brand photo, animated GIF, or video (MP4/WebM). Fits the circle without cropping. Blank = the generated wafer."
            />
            <Field label="Price tag ₹" hint="Shown on the floating tag">
              <input
                type="number"
                min={0}
                value={slide.priceFrom ?? ""}
                onChange={(e) =>
                  updateSlide(i, {
                    priceFrom: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="99"
                className={INPUT}
              />
            </Field>
          </div>
        </Card>
      ))}

      <Button variant="secondary" onClick={addSlide} className="self-start">
        <Plus className="size-3.5" />
        Add slide
      </Button>

      {/* Stats */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Trust stats
          </p>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <input
              type="checkbox"
              checked={content.showStats !== false}
              onChange={(e) => set("showStats", e.target.checked)}
              className="size-3.5 accent-[#5B2C83]"
            />
            Show
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {stats.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_60px_60px_1fr] gap-2">
              <input
                type="number"
                step="0.1"
                value={s.value ?? 0}
                onChange={(e) =>
                  set(
                    "stats",
                    stats.map((x, idx) => (idx === i ? { ...x, value: Number(e.target.value) } : x))
                  )
                }
                className={INPUT}
                aria-label="Stat value"
              />
              <input
                value={s.suffix ?? ""}
                onChange={(e) =>
                  set("stats", stats.map((x, idx) => (idx === i ? { ...x, suffix: e.target.value } : x)))
                }
                placeholder="★"
                className={INPUT}
                aria-label="Suffix"
              />
              <input
                type="number"
                value={s.decimals ?? 0}
                onChange={(e) =>
                  set(
                    "stats",
                    stats.map((x, idx) => (idx === i ? { ...x, decimals: Number(e.target.value) } : x))
                  )
                }
                className={INPUT}
                aria-label="Decimals"
              />
              <input
                value={s.label ?? ""}
                onChange={(e) =>
                  set("stats", stats.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                }
                className={INPUT}
                aria-label="Stat label"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- announcement ---------- */

function AnnouncementEditor({
  content,
  set,
}: {
  content: Record<string, any>;
  set: (k: string, v: unknown) => void;
}) {
  const items: any[] = content.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Background colour">
          <input
            type="color"
            value={content.backgroundColor ?? "#F59E0B"}
            onChange={(e) => set("backgroundColor", e.target.value)}
            className="h-8 w-full cursor-pointer rounded-lg border border-[#E5E7EB]"
          />
        </Field>
        <Field label="Text colour">
          <input
            type="color"
            value={content.textColor ?? "#FFFFFF"}
            onChange={(e) => set("textColor", e.target.value)}
            className="h-8 w-full cursor-pointer rounded-lg border border-[#E5E7EB]"
          />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          Messages
        </p>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={item.text ?? ""}
                onChange={(e) =>
                  set("items", items.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))
                }
                className={INPUT}
                aria-label={`Message ${i + 1}`}
              />
              <Button
                variant="danger"
                size="sm"
                onClick={() => set("items", items.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() => set("items", [...items, { text: "", icon: "", link: "" }])}
        >
          <Plus className="size-3.5" />
          Add message
        </Button>
      </div>
    </div>
  );
}

/* ---------- newsletter ---------- */

function NewsletterEditor({
  content,
  set,
}: {
  content: Record<string, any>;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Text label="Title" value={content.title} onChange={(v) => set("title", v)} />
      <Text label="Button label" value={content.buttonLabel} onChange={(v) => set("buttonLabel", v)} />
      <div className="sm:col-span-2">
        <Text
          label="Description"
          value={content.description}
          onChange={(v) => set("description", v)}
          textarea
        />
      </div>
      <Text label="Placeholder" value={content.placeholder} onChange={(v) => set("placeholder", v)} />
      <Text
        label="Success message"
        value={content.successMessage}
        onChange={(v) => set("successMessage", v)}
      />
      <div className="sm:col-span-2">
        <Text label="Terms text" value={content.terms} onChange={(v) => set("terms", v)} />
      </div>
      <div className="sm:col-span-2">
        <MediaField
          label="Background image"
          value={content.backgroundImage}
          onChange={(url) => set("backgroundImage", url)}
          accept="image/*"
          hint="Sits behind the newsletter block. Leave blank for the plain gradient."
        />
      </div>
    </div>
  );
}

/* ---------- feature grid (why-choose-us, how-its-made, farm-fresh, about) ---------- */

function FeatureGridEditor({
  content,
  set,
  sectionKey,
}: {
  content: Record<string, any>;
  set: (k: string, v: unknown) => void;
  sectionKey: string;
}) {
  const { settings } = useStoreSettings();
  const features: any[] = content.features ?? [];
  const stats: any[] = content.stats ?? [];

  // Only the About / Our Story section renders a side visual.
  const isAbout = sectionKey === "about";
  const isFarmFresh = sectionKey === "farm-fresh";

  const panel: Record<string, any> = content.panel ?? {};
  const setPanel = (patch: Record<string, unknown>) => set("panel", { ...panel, ...patch });

  const updateFeature = (i: number, patch: Record<string, unknown>) =>
    set("features", features.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const getFallbacks = () => {
    switch (sectionKey) {
      case "about":
        return {
          eyebrow: "Our Story",
          title: settings?.ourStoryTitle || "A humble yam, reimagined.",
          titleHighlight: "",
          description: settings?.ourStoryMainText || "Ratalu — the purple yam — has been a monsoon favourite in Gujarati kitchens for generations. We grew up on it. So we set out to do one thing exceptionally well: turn this humble root into the crispiest, most flavourful wafer you've ever tasted.\n\nNo shortcuts. No factory line churning out millions. Just carefully chosen yam, thin-sliced, kettle-cooked in small batches, and seasoned by hand with spices we'd proudly serve our own family.",
        };
      case "why-choose-us":
        return {
          eyebrow: "Why Ratalu",
          title: "Why Choose Ratalu Chips",
          titleHighlight: "",
          description: "We don't do boring. We don't do average. Every bag of Ratalu is a promise of crunch, character, and spices that make you smile.",
        };
      case "how-its-made":
        return {
          eyebrow: "How we make it",
          title: "Five steps to the",
          titleHighlight: "perfect crunch",
          description: "No factory shortcuts — just a careful, small-batch craft we're proud of.",
        };
      case "farm-fresh":
        return {
          eyebrow: "Farm fresh",
          title: "Real ingredients you can",
          titleHighlight: "actually pronounce",
          description: "Great chips start long before the kettle. Ours begin at the farm, with purple yam chosen by hand and a promise to keep everything honest and clean.",
        };
      default:
        return { eyebrow: "", title: "", titleHighlight: "", description: "" };
    }
  };

  const fallbacks = getFallbacks();

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Text
          label="Eyebrow"
          value={content.eyebrow}
          placeholder={fallbacks.eyebrow}
          onChange={(v) => set("eyebrow", v)}
        />
        <Text
          label="Title"
          value={content.title}
          placeholder={fallbacks.title}
          onChange={(v) => set("title", v)}
        />
      </div>
      <Text
        label="Title highlight"
        value={content.titleHighlight}
        placeholder={fallbacks.titleHighlight}
        onChange={(v) => set("titleHighlight", v)}
        hint="Trailing words shown in the warm gradient. Leave blank for a plain title."
      />
      <Text
        label="Description"
        value={content.description}
        placeholder={fallbacks.description}
        onChange={(v) => set("description", v)}
        textarea
      />

      {/* ── Our Story visual (About only) ──────────────────────────── */}
      {isAbout && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Story visual
          </p>

          <label className="mb-3 flex items-start gap-2">
            <input
              type="checkbox"
              checked={content.hideVisual === true}
              onChange={(e) => set("hideVisual", e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[#5B2C83]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-800">Hide the visual</span>
              <span className="block text-xs text-gray-500">
                Remove the tile collage entirely — the story text goes full width.
              </span>
            </span>
          </label>

          {content.hideVisual !== true && (
            <MediaField
              label="Photo or video"
              value={content.media}
              onChange={(url) => set("media", url)}
              accept="image/*,video/*"
              aspect="aspect-square"
              hint="Show how the yam is grown or the chips are made. Replaces the four wafer tiles. Blank = the tile collage."
            />
          )}
        </div>
      )}

      {/* ── Side panel (Farm Fresh only) ───────────────────────────── */}
      {isFarmFresh && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Side panel
          </p>

          <label className="mb-3 flex items-start gap-2">
            <input
              type="checkbox"
              checked={panel.hidden === true}
              onChange={(e) => setPanel({ hidden: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 accent-[#5B2C83]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-800">Hide the panel</span>
              <span className="block text-xs text-gray-500">
                Remove the green stat card — the copy goes full width.
              </span>
            </span>
          </label>

          {panel.hidden !== true && (
            <div className="flex flex-col gap-3">
              <MediaField
                label="Panel photo or video"
                value={panel.media}
                onChange={(url) => setPanel({ media: url })}
                accept="image/*,video/*"
                hint="Footage of the farm or the kettle. Replaces the green stat card. Blank = the default card."
              />
              {!panel.media && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Text label="Panel badge" value={panel.badge} onChange={(v) => setPanel({ badge: v })} />
                  <Text label="Panel headline" value={panel.headline} onChange={(v) => setPanel({ headline: v })} />
                  <Text
                    label="Headline body"
                    value={panel.body}
                    onChange={(v) => setPanel({ body: v })}
                    textarea
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Brand Video Showcase (Why Choose Us & How It's Made only) ── */}
      {(sectionKey === "why-choose-us" || sectionKey === "how-its-made") && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Section Video Showcase
          </p>
          <MediaField
            label="Video Showcase URL"
            value={content.video}
            onChange={(url) => set("video", url)}
            accept="video/*"
            hint="An optional video showcasing the brand values or the cooking/manufacturing process."
          />
          {content.video && (
            <div className="grid gap-3 sm:grid-cols-3 mt-1.5 pt-2 border-t border-gray-200">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={content.autoplay !== false}
                  onChange={(e) => set("autoplay", e.target.checked)}
                  className="size-3.5 rounded border-gray-300 accent-purple-650"
                />
                <span>Autoplay</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={content.muted !== false}
                  onChange={(e) => set("muted", e.target.checked)}
                  className="size-3.5 rounded border-gray-300 accent-purple-650"
                />
                <span>Muted</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={content.loop !== false}
                  onChange={(e) => set("loop", e.target.checked)}
                  className="size-3.5 rounded border-gray-300 accent-purple-650"
                />
                <span>Infinite Loop</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Features */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          Cards
        </p>
        <div className="flex flex-col gap-2">
          {features.map((f, i) => (
            <Card key={i} className="p-2.5">
              <div className="flex gap-2">
                <select
                  value={f.icon ?? ""}
                  onChange={(e) => updateFeature(i, { icon: e.target.value })}
                  className={cn(INPUT, "w-36 shrink-0")}
                  aria-label="Icon"
                >
                  {ICON_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <input
                  value={f.title ?? ""}
                  onChange={(e) => updateFeature(i, { title: e.target.value })}
                  placeholder="Title"
                  className={INPUT}
                  aria-label="Card title"
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => set("features", features.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <textarea
                rows={2}
                value={f.body ?? ""}
                onChange={(e) => updateFeature(i, { body: e.target.value })}
                placeholder="Body"
                className={cn(INPUT, "mt-2 resize-y")}
                aria-label="Card body"
              />
            </Card>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() =>
            set("features", [...features, { icon: "Sparkles", title: "", body: "" }])
          }
        >
          <Plus className="size-3.5" />
          Add card
        </Button>
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Stat band
          </p>
          <div className="flex flex-col gap-2">
            {stats.map((s, i) => (
              <div key={i} className="grid grid-cols-[80px_60px_1fr_auto] gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={s.value ?? 0}
                  onChange={(e) =>
                    set(
                      "stats",
                      stats.map((x, idx) =>
                        idx === i ? { ...x, value: Number(e.target.value) } : x
                      )
                    )
                  }
                  className={INPUT}
                  aria-label="Value"
                />
                <input
                  value={s.suffix ?? ""}
                  onChange={(e) =>
                    set(
                      "stats",
                      stats.map((x, idx) => (idx === i ? { ...x, suffix: e.target.value } : x))
                    )
                  }
                  placeholder="%"
                  className={INPUT}
                  aria-label="Suffix"
                />
                <input
                  value={s.label ?? ""}
                  onChange={(e) =>
                    set(
                      "stats",
                      stats.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x))
                    )
                  }
                  className={INPUT}
                  aria-label="Label"
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => set("stats", stats.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- gallery (instagram) ---------- */

/**
 * Instagram gallery editor.
 *
 * Previously this asked for a "flavour index" (a number picking a generated
 * gradient) and a "likes" count that was published to customers as real
 * engagement. There was no way to put an actual photo in the section at all.
 *
 * Now: upload the real post image, link it to the real post, and choose how many
 * tiles appear. The likes field is gone — we don't have that data, so we don't
 * show it.
 */
function GalleryEditor({
  content,
  set,
}: {
  content: Record<string, any>;
  set: (k: string, v: unknown) => void;
}) {
  const posts: any[] = content.posts ?? [];

  const setPost = (i: number, patch: Record<string, unknown>) =>
    set(
      "posts",
      posts.map((x, idx) => (idx === i ? { ...x, ...patch } : x))
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Text label="Eyebrow" value={content.eyebrow} onChange={(v) => set("eyebrow", v)} />
        <Text
          label="Handle"
          value={content.handle}
          onChange={(v) => set("handle", v)}
          hint="The follow button uses the Instagram URL from Social Media Channels."
        />
        <Text label="Title" value={content.title} onChange={(v) => set("title", v)} />
        <Text
          label="Title highlight"
          value={content.titleHighlight}
          onChange={(v) => set("titleHighlight", v)}
        />
      </div>

      <Text
        label="Description"
        value={content.description}
        onChange={(v) => set("description", v)}
        hint="{handle} is replaced with the handle above."
      />

      <label className="flex max-w-48 flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Posts to show
        </span>
        <input
          type="number"
          min={0}
          max={12}
          value={content.postLimit ?? 6}
          onChange={(e) => set("postLimit", Number(e.target.value))}
          className={INPUT}
        />
        <span className="text-xs text-gray-400">
          The grid adapts — it no longer leaves a half-empty row.
        </span>
      </label>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          Posts
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <div
              key={i}
              className="flex flex-col gap-2.5 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-2.5"
            >
              <MediaField
                label={`Post ${i + 1} image`}
                value={p.image}
                onChange={(url) => setPost(i, { image: url })}
                aspect="aspect-square"
                hint={p.image ? undefined : "No image yet — a flavour visual stands in."}
              />

              <input
                value={p.caption ?? ""}
                onChange={(e) => setPost(i, { caption: e.target.value })}
                placeholder="Caption"
                className={INPUT}
                aria-label="Caption"
              />

              <input
                value={p.link ?? ""}
                onChange={(e) => setPost(i, { link: e.target.value })}
                placeholder="https://instagram.com/p/…"
                className={INPUT}
                aria-label="Link to the post"
              />

              <Button
                variant="danger"
                size="sm"
                onClick={() => set("posts", posts.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => set("posts", [...posts, { image: "", caption: "", link: "", flavorIndex: posts.length }])}
        >
          <Plus className="size-3.5" />
          Add post
        </Button>
      </div>
    </div>
  );
}

/* ---------- faq (accordion questions) ---------- */

/**
 * FAQ editor — the questions themselves, not just the heading.
 *
 * The items live inside this section's draft/published content (like the
 * announcement messages), so they ride the same draft → preview → publish flow
 * as every other section. Adding, editing, reordering or removing a question
 * here is exactly what the storefront accordion renders.
 */
function FaqEditor({
  content,
  set,
}: {
  content: Record<string, any>;
  set: (k: string, v: unknown) => void;
}) {
  const items: any[] = content.items ?? [];

  const update = (i: number, patch: Record<string, unknown>) =>
    set("items", items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const move = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[i], next[target]] = [next[target], next[i]];
    set("items", next);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Heading */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Text
          label="Eyebrow"
          value={content.eyebrow}
          placeholder="Questions"
          onChange={(v) => set("eyebrow", v)}
        />
        <Text
          label="Title"
          value={content.title}
          placeholder="Frequently asked"
          onChange={(v) => set("title", v)}
        />
      </div>
      <Text
        label="Title highlight"
        value={content.titleHighlight}
        placeholder="questions"
        onChange={(v) => set("titleHighlight", v)}
        hint="Trailing words shown in the warm gradient, on their own line."
      />
      <Text
        label="Description"
        value={content.description}
        placeholder=""
        onChange={(v) => set("description", v)}
        textarea
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Text
          label="Help card title"
          value={content.helpTitle}
          onChange={(v) => set("helpTitle", v)}
          hint="The little 'Still curious?' card beside the questions."
        />
        <Text label="Help card text" value={content.helpText} onChange={(v) => set("helpText", v)} />
      </div>

      {/* Questions */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          Questions
        </p>
        <div className="flex flex-col gap-3">
          {items.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
              No questions yet. Add the first one below.
            </p>
          )}
          {items.map((item, i) => (
            <Card key={item.id ?? i} className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Question {i + 1}</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 bg-gray-100/90 p-0.5 rounded-lg border border-gray-200/80">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      title="Move question up"
                      aria-label="Move question up"
                      className="grid size-6 place-items-center rounded bg-white text-gray-700 hover:bg-purple-50 hover:text-[#5B2C83] disabled:opacity-30 transition-all cursor-pointer"
                    >
                      <ArrowUp className="size-3.5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1}
                      title="Move question down"
                      aria-label="Move question down"
                      className="grid size-6 place-items-center rounded bg-white text-gray-700 hover:bg-purple-50 hover:text-[#5B2C83] disabled:opacity-30 transition-all cursor-pointer"
                    >
                      <ArrowDown className="size-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => set("items", items.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2.5">
                <input
                  value={item.category ?? ""}
                  onChange={(e) => update(i, { category: e.target.value })}
                  placeholder="Category — e.g. Shipping"
                  className={INPUT}
                  aria-label="Category"
                />
                <input
                  value={item.question ?? ""}
                  onChange={(e) => update(i, { question: e.target.value })}
                  placeholder="Question"
                  className={INPUT}
                  aria-label="Question"
                />
                <textarea
                  rows={3}
                  value={item.answer ?? ""}
                  onChange={(e) => update(i, { answer: e.target.value })}
                  placeholder="Answer"
                  className={cn(INPUT, "resize-y")}
                  aria-label="Answer"
                />
              </div>
            </Card>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() =>
            set("items", [
              ...items,
              { id: `faq-${Date.now()}`, category: "", question: "", answer: "" },
            ])
          }
        >
          <Plus className="size-3.5" />
          Add question
        </Button>
      </div>
    </div>
  );
}

/* ---------- generic (title/eyebrow/description sections) ---------- */

function GenericEditor({
  content,
  set,
  sectionKey,
}: {
  content: Record<string, any>;
  set: (k: string, v: unknown) => void;
  sectionKey?: string;
}) {
  const isTestimonials = sectionKey === "testimonials";

  const getFallbacks = () => {
    if (sectionKey === "testimonials") {
      return {
        eyebrow: "Loved across India",
        title: "Don't take our word.",
        titleHighlight: "Take theirs.",
        description: "",
      };
    } else if (sectionKey === "best-sellers") {
      return {
        eyebrow: "Fan favourites",
        title: "This week's",
        titleHighlight: "best sellers",
        description: "The three packs flying off our shelves — loved by thousands across India.",
      };
    } else if (sectionKey === "offers") {
      return {
        eyebrow: "Today's Offers",
        title: "Save more on every",
        titleHighlight: "crunch",
        description: "Grab a code below — it's copied to your clipboard, ready to paste at checkout.",
      };
    }
    return { eyebrow: "", title: "", titleHighlight: "", description: "" };
  };

  const fallbacks = getFallbacks();

  return (
    <div className="flex flex-col gap-3">
      <Text
        label="Eyebrow"
        value={content.eyebrow}
        placeholder={fallbacks.eyebrow}
        onChange={(v) => set("eyebrow", v)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Text
          label="Title"
          value={content.title}
          placeholder={fallbacks.title}
          onChange={(v) => set("title", v)}
        />
        <Text
          label="Title highlight"
          value={content.titleHighlight}
          placeholder={fallbacks.titleHighlight}
          onChange={(v) => set("titleHighlight", v)}
          hint="Trailing words in the warm gradient. Blank for a plain title."
        />
      </div>
      <Text
        label="Description"
        value={content.description}
        placeholder={fallbacks.description}
        onChange={(v) => set("description", v)}
        textarea
      />

      {isTestimonials && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Customer Testimonials Video Showcase
          </p>
          <MediaField
            label="Video Showcase URL"
            value={content.video}
            onChange={(url) => set("video", url)}
            accept="video/*"
            hint="An optional video showing customer testimonials or taste tests."
          />
          {content.video && (
            <div className="grid gap-3 sm:grid-cols-3 mt-1.5 pt-2 border-t border-gray-200">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={content.autoplay !== false}
                  onChange={(e) => set("autoplay", e.target.checked)}
                  className="size-3.5 rounded border-gray-300 accent-purple-650"
                />
                <span>Autoplay</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={content.muted !== false}
                  onChange={(e) => set("muted", e.target.checked)}
                  className="size-3.5 rounded border-gray-300 accent-purple-650"
                />
                <span>Muted</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={content.loop !== false}
                  onChange={(e) => set("loop", e.target.checked)}
                  className="size-3.5 rounded border-gray-300 accent-purple-650"
                />
                <span>Infinite Loop</span>
              </label>
            </div>
          )}
        </div>
      )}

      {content.limit !== undefined && (
        <Field label="Number of items">
          <input
            type="number"
            min={1}
            max={24}
            value={content.limit ?? 4}
            onChange={(e) => set("limit", Number(e.target.value))}
            className={INPUT}
          />
        </Field>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* VERSION HISTORY                                                    */
/* ------------------------------------------------------------------ */

function VersionHistory({
  section,
  isSuperAdmin,
  onClose,
  onRestored,
}: {
  section: PageSection;
  isSuperAdmin: boolean;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [versions, setVersions] = React.useState<Version[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [confirm, setConfirm] = React.useState<Version | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    apiFetch<Version[]>(`/admin/content/${PAGE}/${section.key}/versions`)
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [section.key]);

  const restore = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/content/${PAGE}/${section.key}/restore/${confirm._id}`, {
        method: "POST",
      });
      toast.success(`Restored v${confirm.version}`, {
        description: "It's in your draft — review it, then publish.",
      });
      onRestored();
    } catch (err) {
      toast.error("Could not restore", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`History — ${section.label}`}
        description="Every publish is snapshotted. Restoring loads it into your draft, so it's never instantly live."
      >
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <EmptyState
            icon={History}
            title="No versions yet"
            description="A snapshot is saved every time you publish this section."
          />
        ) : (
          <ol className="flex flex-col gap-2">
            {versions.map((v, i) => (
              <li
                key={v._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] p-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#5B2C83]">v{v.version}</span>
                    {i === 0 && <Badge tone="success">Current</Badge>}
                    {v.action === "restore" && <Badge tone="info">Restore</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatDateTime(v.createdAt)} · {v.createdBy || "—"}
                  </p>
                </div>
                {i !== 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!isSuperAdmin}
                    onClick={() => setConfirm(v)}
                    title={isSuperAdmin ? undefined : "Only a Super Admin can restore"}
                  >
                    <Undo2 className="size-3.5" />
                    Restore
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={restore}
        busy={busy}
        tone="primary"
        title={`Restore v${confirm?.version}?`}
        description="This loads that version into your draft. The live site does not change until you publish, and your current draft will be replaced."
        confirmLabel="Restore into draft"
      />
    </>
  );
}
