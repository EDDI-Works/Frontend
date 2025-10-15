// MeetingPage.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import MeetingEditorBody, { type MeetingCore, type MeetingMeta } from "../components/MeetingEditorBody";
import { useMeeting } from "../hooks/useMeeting.ts";
import { meetingApi, type ReadMeetingResponse } from "../../api/meetingApi";

const notesKey = (id: string) => `meeting:notes:${id}`;
const metaKey  = (id: string) => `meeting:meta:${id}`;
const titleKey = (id: string) => `meeting:title:${id}`;

function toLocalISOSeconds(v?: Date | string): string | undefined {
    if (!v) return undefined;
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return undefined;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeMetaFromServer(d: ReadMeetingResponse): MeetingMeta {
    const participants =
        (d.participantList ?? [])
            .map((m) => (m.nickname ?? m.name ?? m.displayName ?? "").toString().trim())
            .filter(Boolean)
            .join(", ");
    return { location: "", participants, links: [], notes: d.noteContent ?? "" };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function MeetingPage() {
    const navigate = useNavigate();
    const { id = "" } = useParams();
    const { meetings } = useMeeting();

    const isInvalidId = id && id !== "new" && !UUID_RE.test(id);
    React.useEffect(() => { if (isInvalidId) navigate("/meeting/new", { replace: true }); }, [isInvalidId, navigate]);

    const [serverDetail, setServerDetail] = React.useState<ReadMeetingResponse | null>(null);
    const [editorResetKey, setEditorResetKey] = React.useState(0);
    const creatingRef = React.useRef(false);

    const meeting = React.useMemo(
        () => (meetings ?? []).find((m: any) => String(m?.id) === String(id)) || null,
        [meetings, id]
    );

    const baseMeta: MeetingMeta = { location: "", participants: "", links: [], notes: "" };
    let loadedMeta = baseMeta;
    let loadedTitle = "";
    try {
        const raw = localStorage.getItem(metaKey(id));
        if (raw) loadedMeta = { ...loadedMeta, ...JSON.parse(raw) };
        const n = localStorage.getItem(notesKey(id));
        if (n) loadedMeta.notes = n;
        const t = localStorage.getItem(titleKey(String(id)));
        if (t) loadedTitle = t;
    } catch {}

    React.useEffect(() => {
        let alive = true;
        if (!id || id === "new" || !UUID_RE.test(id)) return;
        (async () => {
            try {
                const data = await meetingApi.getMeetingDetail(id);
                if (!alive || !data) return;
                setServerDetail(data);
                if (data.title) localStorage.setItem(titleKey(id), data.title);
                localStorage.setItem(notesKey(id), data.noteContent ?? "");
                localStorage.setItem(metaKey(id), JSON.stringify({ ...loadedMeta, ...normalizeMetaFromServer(data) }));
            } catch { setServerDetail(null); }
        })();
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const now = React.useMemo(() => new Date(), []);
    const initial = React.useMemo(() => {
        const src = serverDetail ?? meeting;
        const title = loadedTitle || (src?.title ?? "");
        const start = src?.start ? new Date(src.start) : now;
        const end   = src?.end   ? new Date(src.end)   : new Date(now.getTime() + 60 * 60 * 1000);
        const team =
            serverDetail
                ? (serverDetail.teamList?.map((t) => (t.name ?? t.teamName ?? "")).filter(Boolean).join(", ") || undefined)
                : (meeting?.team ?? undefined);
        const meta = serverDetail ? normalizeMetaFromServer(serverDetail) : loadedMeta;

        return {
            meeting: src ? ({ id, title, start, end, allDay: !!src.allDay, team }) : ({ id, title: title || "", start, end, allDay: false } as MeetingCore),
            meta,
        };
    }, [serverDetail, meeting, id, loadedMeta, loadedTitle, now]);

    const handleSave = React.useCallback(
        async ({ meeting: next, meta: nextMeta }: { meeting: MeetingCore; meta: MeetingMeta }) => {
            const isUuid = UUID_RE.test(String(next.id ?? ""));
            const canPatch = isUuid && !!serverDetail && String(serverDetail.publicId) === String(next.id);

            const buildUpdatePayload = (version?: number) => ({
                title: next.title,
                start: toLocalISOSeconds(next.start),
                end:   toLocalISOSeconds(next.end),
                allDay: !!next.allDay,
                meetingVersion: typeof version === "number" ? version : Number(version),
                content: nextMeta.notes,
            });

            try {
                if (canPatch) {
                    try {
                        await meetingApi.updateMeeting(String(next.id), buildUpdatePayload(
                            typeof serverDetail?.meetingVersion === "number" ? serverDetail?.meetingVersion : Number(serverDetail?.meetingVersion)
                        ));
                    } catch (e: any) {
                        if (e?.response?.status === 409) {
                            const latest = await meetingApi.getMeetingDetail(String(next.id));
                            setServerDetail(latest);
                            if (latest.title) localStorage.setItem(titleKey(String(next.id)), latest.title);
                            localStorage.setItem(notesKey(String(next.id)), latest.noteContent ?? "");
                            localStorage.setItem(metaKey(String(next.id)), JSON.stringify({ ...normalizeMetaFromServer(latest) }));
                            setEditorResetKey(k => k + 1);
                            return;
                        } else {
                            throw e;
                        }
                    }
                } else {
                    if (creatingRef.current) return;
                    creatingRef.current = true;
                    const payload = {
                        title: next.title || "제목 없음",
                        allDay: !!next.allDay,
                        start: toLocalISOSeconds(next.start)!,
                        end:   toLocalISOSeconds(next.end)!,
                    };
                    try {
                        const created = await meetingApi.createMeeting(payload as any);
                        const newPublicId = created.publicId;
                        localStorage.setItem(titleKey(newPublicId), next.title ?? "");
                        if (nextMeta.notes != null) localStorage.setItem(notesKey(newPublicId), nextMeta.notes);
                        localStorage.setItem(metaKey(newPublicId), JSON.stringify(nextMeta));
                        navigate(`/meeting/${newPublicId}`, { replace: true });
                        return;
                    } finally {
                        creatingRef.current = false;
                    }
                }
            } catch (e: any) {
                console.warn("[MeetingPage] save failed", e);
            } finally {
                localStorage.setItem(titleKey(String(id)), next.title ?? "");
                if (nextMeta.notes != null) localStorage.setItem(notesKey(String(id)), nextMeta.notes);
                localStorage.setItem(metaKey(String(id)), JSON.stringify(nextMeta));
            }
        },
        [id, navigate, serverDetail]
    );

    const canPersistBoards = !!serverDetail;

    if (isInvalidId) return null;

    return (
        <div className="min-h-[100dvh] w-full bg-[#F5F6F8] px-8 py-6 flex flex-col">
            <div className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1920px] px-6 pb-4 flex-1 flex">
                <MeetingEditorBody
                    mode="detail"
                    initial={initial}
                    onCancel={() => navigate(-1)}
                    onSave={handleSave}
                    canPersistBoards={canPersistBoards}
                    resetKey={editorResetKey}
                    // 🔁 싱크 맞추기: 서버 재조회 → 로컬/에디터 동기화
                    onSync={async () => {
                        if (!id || id === "new" || !UUID_RE.test(id)) return;
                        const latest = await meetingApi.getMeetingDetail(String(id));
                        setServerDetail(latest);
                        if (latest.title) localStorage.setItem(titleKey(String(id)), latest.title);
                        localStorage.setItem(notesKey(String(id)), latest.noteContent ?? "");
                        localStorage.setItem(metaKey(String(id)), JSON.stringify({ ...normalizeMetaFromServer(latest) }));
                        setEditorResetKey(k => k + 1);
                    }}
                />
            </div>
        </div>
    );
}
