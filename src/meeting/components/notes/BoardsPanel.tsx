import { useEffect, useMemo, useRef, useState } from "react";
import { meetingApi } from "../../../api/meetingApi";

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function parseParticipants(input: string): string[] {
    return Array.from(new Set((input || "").split(/[,\s]+/g).map(s => s.trim()).filter(Boolean)));
}

type ColumnKey = "done" | "todo" | "note" | "good" | "learned";
type Item = { id: string; content: string; createdAt: number; };
type ColumnUser = { id: string; name: string; items: Item[] };
type Column = { id: string; key: ColumnKey; label: string; users: ColumnUser[]; badgeClass?: string };

const COLUMN_STYLE: Record<ColumnKey, { label: string; badgeClass: string }> = {
    done:    { label: "완료한 일",  badgeClass: "bg-[#FDEFC8] text-[#7A5B17]" },
    todo:    { label: "해야 할 일", badgeClass: "bg-[#DDEBFF] text-[#2E5AAC]" },
    note:    { label: "특이사항",   badgeClass: "bg-[#FAD7D8] text-[#9B1C1F]" },
    good:    { label: "좋았던 점",  badgeClass: "bg-[#E3F7D3] text-[#3A6B1E]" },
    learned: { label: "배운 점",    badgeClass: "bg-[#EAE7FF] text-[#4B3DB8]" },
};

// 색 팔레트
const COLOR_PALETTE = [
    { id: "gray",   label: "회색",   bg: "bg-[#ECEFF3]", text: "text-[#374151]" },
    { id: "orange", label: "주황색", bg: "bg-[#FFE1C7]", text: "text-[#9A4E10]" },
    { id: "yellow", label: "노란색", bg: "bg-[#FDEFC8]", text: "text-[#7A5B17]" },
    { id: "red",    label: "빨간색", bg: "bg-[#FAD7D8]", text: "text-[#9B1C1F]" },
    { id: "green",  label: "초록색", bg: "bg-[#E3F7D3]", text: "text-[#3A6B1E]" },
    { id: "blue",   label: "파란색", bg: "bg-[#DDEBFF]", text: "text-[#2E5AAC]" },
    { id: "pink",   label: "분홍색", bg: "bg-[#FDE6F3]", text: "text-[#9A1F60]" },
    { id: "lime",   label: "연두색", bg: "bg-[#EAFAD6]", text: "text-[#3A6B1E]" },
    { id: "brown",  label: "갈색",   bg: "bg-[#F0E2D6]", text: "text-[#7A4B2C]" },
] as const;

function pickPaletteForLabel(label: string) {
    const pool = COLOR_PALETTE.filter(p => p.id !== "gray");
    let h = 0;
    for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
    return pool[h % pool.length];
}

export default function BoardsPanel({ publicId, participantsStr }: { publicId: string; participantsStr: string }) {
    const participants = useMemo(() => parseParticipants(participantsStr), [participantsStr]);

    const [templateTitle, setTemplateTitle] = useState<string>("");
    const [columns, setColumns] = useState<Column[]>([]);
    const [openUsers, setOpenUsers] = useState<Record<string, boolean>>({});

    // [NEW] 서버 템플릿 id 보존 (Content에서 boards:init detail.template로 전달됨)
    const templateIdRef = useRef<string | null>(null);

    // 팝오버/프리뷰
    const [addOpen, setAddOpen] = useState(false);
    const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
    const addBtnRef = useRef<HTMLButtonElement | null>(null);
    const [draftLabel, setDraftLabel] = useState<string>("");

    // [NEW] ETag/updatedAt 캐시 — 서버 응답 헤더/필드 재사용
    const [boardEtag, setBoardEtag] = useState<string | null>(null);
    const etagKey = `boardEtag:${publicId}`;

    // 템플릿 표시/숨김 이벤트
    useEffect(() => {
        try { window.dispatchEvent(new Event(columns.length > 0 ? "boards:nonempty" : "boards:empty")); } catch {}
    }, [columns]);

    // [NEW] 초기 로드: 서버 보드 스냅샷 GET (If-None-Match 지원)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const prev = localStorage.getItem(etagKey);
                const res = await meetingApi.getMeetingBoard(publicId, prev || undefined); // 200 or 304
                if (!alive) return;
                if (res?.status === 304) {
                    // 최신 그대로
                    setBoardEtag(prev ?? null);
                    return;
                }
                if (res?.status === 200 && res.data) {
                    const { boardSnapshot, updatedAt } = res.data as any;
                    // snapshot → local state 복원
                    if (boardSnapshot) {
                        // template/title
                        templateIdRef.current = boardSnapshot.template ?? null;
                        setTemplateTitle(boardSnapshot.title ?? "");

                        // columns
                        const cols: Column[] = (boardSnapshot.columns ?? []).map((c: any, i: number) => ({
                            id: c.id || `c${i + 1}`,
                            key: c.key,
                            label: c.label,
                            users: (c.users ?? []).map((u: any) => ({
                                id: u.id || genId(),
                                name: u.name,
                                items: (u.items ?? []).map((it: any) => ({
                                    id: it.id || genId(),
                                    content: it.content,
                                    createdAt: typeof it.createdAt === "number" ? it.createdAt : Number(it.createdAt) || Date.now(),
                                })),
                            })),
                            ...(c.badgeClass ? { badgeClass: c.badgeClass } : {}),
                        }));
                        setColumns(cols);
                        setOpenUsers({});
                    }

                    // ETag/updatedAt 캐시
                    const et = res.headers?.etag || updatedAt || null;
                    setBoardEtag(et);
                    if (et) localStorage.setItem(etagKey, et);

                    // 상태 이벤트
                    try { window.dispatchEvent(new Event(colsLength(boardSnapshot) > 0 ? "boards:nonempty" : "boards:empty")); } catch {}
                }
            } catch {
                // 실패 시 조용히 패스 (빈 보드로)
            }
        })();
        return () => { alive = false; };
        // publicId가 바뀌면 다시 로드
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicId]);

    // [NEW] Content → boards:init 이벤트로 템플릿 적용 시 서버 상태로 초기화
    useEffect(() => {
        function onInit(e: any) {
            const detail = e?.detail as {
                template?: string;
                title?: string;
                columns: Array<{ id?: string; key: ColumnKey; label?: string; badgeClass?: string; users?: any[] }>;
            };
            if (!detail) return;

            templateIdRef.current = detail.template ?? null; // [NEW] 서버 템플릿 id 보존
            setTemplateTitle(detail.title || "");

            const cols: Column[] = (detail.columns || []).map(({ id, key, label, badgeClass, users }, i) => ({
                id: id || `c${i + 1}`,
                key,
                label: (label ?? COLUMN_STYLE[key].label).trim(),
                users: (users ?? []).map((u: any) => ({
                    id: u.id || genId(),
                    name: u.name,
                    items: (u.items ?? []).map((it: any) => ({
                        id: it.id || genId(),
                        content: it.content,
                        createdAt: typeof it.createdAt === "number" ? it.createdAt : Number(it.createdAt) || Date.now(),
                    })),
                })),
                ...(badgeClass ? { badgeClass } : {}),
            }));

            setColumns(cols);
            setOpenUsers({});
            try { window.dispatchEvent(new Event("boards:cleared")); } catch {}
        }
        window.addEventListener("boards:init" as any, onInit);
        return () => window.removeEventListener("boards:init" as any, onInit);
    }, []);

    function markEdited() { try { window.dispatchEvent(new Event("boards:edited")); } catch {} }

    function handleAddColumn(key: ColumnKey, label?: string, badgeClass?: string) {
        const col: Column = {
            id: genId(),
            key,
            label: (label ?? COLUMN_STYLE[key].label).trim(),
            users: [],
            ...(badgeClass ? { badgeClass } : {}),
        };
        if (!col.label) return;
        setColumns(prev => [...prev, col]);
        markEdited();
    }

    function handleRemoveColumn(colId: string) {
        const col = columns.find(c => c.id === colId);
        const label = col?.label ?? "이 열";
        if (!window.confirm(`[${label}] 열을 삭제하시겠습니까?`)) return;
        setColumns(prev => prev.filter(c => c.id !== colId));
        markEdited();
    }

    function handleUpdateColumn(colId: string, patch: Partial<Column>) {
        setColumns(prev => prev.map(c => (c.id === colId ? { ...c, ...patch } : c)));
        markEdited();
    }

    function handleAddUserGlobal(name: string) {
        const userName = (name || "").trim();
        if (!userName) return;
        setOpenUsers(m => ({ ...m, [userName]: true }));
        setColumns(prev =>
            prev.map(col => {
                if (col.users.some(u => u.name === userName)) return col;
                const u: ColumnUser = { id: genId(), name: userName, items: [] };
                return { ...col, users: [...col.users, u] };
            }),
        );
        markEdited();
    }

    function toggleUserOpen(userName: string) {
        setOpenUsers(m => ({ ...m, [userName]: !(m[userName] ?? true) }));
    }

    function updateUserItems(colId: string, userName: string, nextItems: Item[]) {
        setColumns(prev =>
            prev.map(col => {
                if (col.id !== colId) return col;
                const users = col.users.map(u => (u.name === userName ? { ...u, items: nextItems } : u));
                return { ...col, users };
            }),
        );
        markEdited();
    }

    const hasBoards = columns.length > 0;

    // “+ 항목 추가”
    function openAddPopover() {
        setDraftLabel("");
        setAddOpen(true);
        const btn = addBtnRef.current;
        const PANEL_H = 360, GAP = 2, MARGIN = 10, WIDTH = 320;
        if (btn) {
            const r = btn.getBoundingClientRect();
            const wantY = r.bottom + GAP;
            const y = (wantY + PANEL_H > window.innerHeight) ? (r.top - GAP - PANEL_H) : wantY;
            const left = Math.min(Math.max(MARGIN, r.left), window.innerWidth - WIDTH - MARGIN);
            setAnchor({ x: left, y: Math.max(MARGIN, y) });
        } else {
            setAnchor({ x: 24, y: 120 });
        }
    }

    // [NEW] 서버 업서트: columns/template/title → snapshot PUT (디바운스)
    useEffect(() => {
        // 컬럼이 하나도 없고 템플릿도 없으면 업서트 안 함
        if (!publicId) return;

        // 디바운스 600ms — 기존 autosave 리듬과 동일화
        const t = window.setTimeout(async () => {
            try {
                const snapshot = {
                    template: templateIdRef.current,        // 서버 템플릿 id (없으면 null로 저장됨)
                    title: templateTitle || "",
                    columns: columns.map(c => ({
                        id: c.id,
                        key: c.key,
                        label: c.label,
                        badgeClass: c.badgeClass ?? null,
                        users: c.users.map(u => ({
                            id: u.id,
                            name: u.name,
                            items: u.items.map(it => ({
                                id: it.id,
                                content: it.content,
                                createdAt: it.createdAt,          // number(ms)
                            })),
                        })),
                    })),
                };

                // PUT /meeting/{publicId}/board
                const res = await meetingApi.putMeetingBoard(publicId, { snapshot });
                // 200 OK + ETag(or updatedAt)
                const { updatedAt } = res.data as any;
                const et = res.headers?.etag || updatedAt || null;
                if (et) {
                    setBoardEtag(et);
                    localStorage.setItem(etagKey, et);
                }
            } catch {
                // 조용히 무시 (다음 편집 시 재시도)
            }
        }, 600);

        return () => window.clearTimeout(t);
        // templateTitle/columns 변경 시 업서트
    }, [publicId, templateTitle, columns]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="mt-6">
            {hasBoards && templateTitle && (
                <div className="mb-2 text-[15px] font-semibold text-[#111827]">{templateTitle}</div>
            )}

            <div className="flex gap-3 overflow-x-auto rounded-xl bg-[#F7FAFF] p-3">
                {!hasBoards ? (
                    <>
                        {addOpen && <PreviewColumnCard label={draftLabel} />}
                        <AddColumnCard btnRef={addBtnRef} onOpen={openAddPopover} />
                    </>
                ) : (
                    <>
                        {columns.map(col => (
                            <ColumnCard
                                key={col.id}
                                data={col}
                                onRemove={() => handleRemoveColumn(col.id)}
                                onUpdate={(patch) => handleUpdateColumn(col.id, patch)}
                                participants={participants}
                                openUsers={openUsers}
                                onToggleUser={toggleUserOpen}
                                onUpdateUserItems={updateUserItems}
                            />
                        ))}
                        {addOpen && <PreviewColumnCard label={draftLabel} />}
                        <AddColumnCard btnRef={addBtnRef} onOpen={openAddPopover} />
                    </>
                )}
            </div>

            {hasBoards && (
                <div className="mt-3">
                    <AddUserRow participants={participants} onSelect={handleAddUserGlobal} />
                </div>
            )}

            {addOpen && anchor && (
                <AddColumnPopover
                    x={anchor.x}
                    y={anchor.y}
                    onClose={() => setAddOpen(false)}
                    onPick={(key) => { handleAddColumn(key); setAddOpen(false); }}
                    onCreateFromInput={(label) => {
                        const p = pickPaletteForLabel(label);
                        const badge = `${p.bg} ${p.text}`;
                        handleAddColumn("note", label, badge);
                        setAddOpen(false);
                    }}
                    onDraftChange={(v) => setDraftLabel(v)}
                />
            )}
        </div>
    );
}

/* ================= 하위 컴포넌트 (그대로) ================= */

function ColumnCard({
                        data, onRemove, onUpdate, openUsers, onToggleUser, onUpdateUserItems,
                    }: {
    data: Column;
    onRemove: () => void;
    onUpdate: (patch: Partial<Column>) => void;
    participants: string[];
    openUsers: Record<string, boolean>;
    onToggleUser: (userName: string) => void;
    onUpdateUserItems: (colId: string, userName: string, next: Item[]) => void;
}) {
    const fallback = COLUMN_STYLE[data.key];
    const badgeClass = data.badgeClass ?? fallback.badgeClass;
    const total = data.users.reduce((acc, u) => acc + u.items.length, 0);

    // 라벨/색 편집 팝오버
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuX, setMenuX] = useState(0);
    const [menuY, setMenuY] = useState(0);
    const [draft, setDraft] = useState(data.label);

    function openMenu(e: React.MouseEvent) {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setMenuX(r.left);
        setMenuY(r.bottom + 6);
        setDraft(data.label);
        setMenuOpen(true);
    }

    return (
        <div className="w-[360px] flex-none rounded-2xl border border-[#E6ECF4] bg-white">
            <div className="flex items-center justify-between rounded-t-2xl border-b border-[#EEF2F7] bg-[#F8FAFC] px-3 py-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={openMenu}
                        className={`rounded px-2 py-[2px] text-[12px] ${badgeClass}`}
                        title="클릭해서 라벨/색 편집"
                    >
                        {data.label}
                    </button>
                    <span className="text-[12px] text-[#94A3B8]">{total}</span>
                </div>

                <button
                    type="button"
                    onClick={onRemove}
                    className="rounded-md px-2 py-1 text-[#9CA3AF] hover:bg-[#F0F4F9] hover:text-[#6B7280]"
                    title="항목 삭제"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 7h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            <div className="space-y-3 p-3">
                {data.users.map((u) => {
                    const isOpen = openUsers[u.name] ?? true;
                    const onAddItem = (content: string) => {
                        onUpdateUserItems(data.id, u.name, [...u.items, { id: genId(), content, createdAt: Date.now() }]);
                    };
                    const onRemoveItem = (itemId: string) => {
                        onUpdateUserItems(data.id, u.name, u.items.filter((it) => it.id !== itemId));
                    };

                    return (
                        <UserSection
                            key={u.id}
                            data={u}
                            isOpen={isOpen}
                            onToggle={() => onToggleUser(u.name)}
                            onRemove={() => onUpdate({ users: data.users.filter(x => x.id !== u.id) })}
                            onAddItem={onAddItem}
                            onRemoveItem={onRemoveItem}
                        />
                    );
                })}
            </div>

            {menuOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div
                        className="fixed z-50 w-[260px] rounded-xl border border-[#E6EAF2] bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
                        style={{ left: Math.min(menuX, window.innerWidth - 272), top: Math.min(menuY, window.innerHeight - 280) }}
                    >
                        <input
                            autoFocus
                            value={draft}
                            onChange={(e) => { setDraft(e.target.value); }}
                            className="mb-2 w-full rounded-md border border-[#D1D5DB] px-2 py-1.5 text-[13px] outline-none focus:border-[#9DB8FF] focus:ring-2 focus:ring-[#E4EEFF]"
                        />
                        <button
                            type="button"
                            onClick={() => { const v = draft.trim(); if (!v) return; onUpdate({ label: v }); setMenuOpen(false); }}
                            className="mb-2 w-full rounded-md bg-[#EEF2FF] px-2 py-1.5 text-[12px] text-[#3F5BD9]"
                        >
                            이름 적용
                        </button>

                        <div className="mb-1 px-1 text-[11px] text-[#6B7280]">색</div>
                        <div className="max-h:[200px] overflow-auto pr-1">
                            {COLOR_PALETTE.map(p => {
                                const selected = (`${p.bg} ${p.text}`) === (data.badgeClass ?? "");
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => { onUpdate({ badgeClass: `${p.bg} ${p.text}` }); setMenuOpen(false); }}
                                        className={`flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-[#F8FAFC] ${selected ? "bg-[#F5F7FF]" : ""}`}
                                    >
                    <span className="flex items-center gap-2">
                      <span className={`inline-block h-3 w-3 rounded-sm ${p.bg}`} />
                      <span className={`rounded px-2 py-[2px] text-[12px] ${p.bg} ${p.text}`}>{p.label}</span>
                    </span>
                                        {selected && <span className="text-[12px] text-[#64748B]">✓</span>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="my-2 border-t border-[#EEF2F7]" />

                        <button
                            type="button"
                            onClick={() => { setMenuOpen(false); onRemove(); }}
                            className="w-full rounded-md border border-[#F2D6D9] bg-[#FFF8F8] px-2 py-1.5 text-[12px] text-[#DC2626] hover:bg-[#FFF1F2]"
                        >
                            삭제
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function PreviewColumnCard({ label }: { label: string }) {
    return (
        <div className="w-[360px] flex-none rounded-2xl border border-[#E6ECF4] bg-white">
            <div className="flex items-center justify-between rounded-t-2xl border-b border-[#EEF2F7] bg-[#F8FAFC] px-3 py-2">
                <div className="flex items-center gap-2">
                    {label.trim() ? (
                        <span className="rounded bg-[#EEF2FF] px-2 py-[2px] text-[12px] text-[#4959c6]">{label}</span>
                    ) : (
                        <span className="h-[18px] w-[72px] rounded bg-[#EAEFF7]" />
                    )}
                    <span className="text-[12px] text-[#94A3B8]">0</span>
                </div>
                <span className="h-[22px] w-[24px] rounded bg-[#EFF3F8]" />
            </div>

            <div className="space-y-3 p-3">
                <div className="rounded-lg bg-[#F3F6FB] p-2 text-[13px] text-[#A0AEC0]">내용을 입력해 주세요.</div>
                <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-md border-2 border-dashed border-[#D9E2F2] px-3 py-2 text-left text-[13px] text-[#B6C2E1]"
                >
                    + 내용 추가
                </button>
            </div>
        </div>
    );
}

function AddColumnCard({ onOpen, btnRef }: { onOpen: () => void; btnRef: React.RefObject<HTMLButtonElement> }) {
    return (
        <div className="w-[220px] flex-none rounded-2xl border-2 border-dashed border-[#D9E2F2] bg:white p-3">
            <button ref={btnRef} type="button" onClick={onOpen} className="w-full text-left text-[13px] text-[#6482C0]">
                + 항목 추가
            </button>
        </div>
    );
}

function AddColumnPopover({
                              x, y, onClose, onPick, onCreateFromInput, onDraftChange,
                          }: {
    x: number; y: number;
    onClose: () => void;
    onPick: (key: ColumnKey) => void;
    onCreateFromInput: (label: string) => void;
    onDraftChange: (label: string) => void;
}) {
    const [label, setLabel] = useState("");
    const WIDTH = 320, MARGIN = 12;
    const left = Math.min(Math.max(MARGIN, x), window.innerWidth - WIDTH - MARGIN);

    const preview = label.trim() ? pickPaletteForLabel(label.trim()) : COLOR_PALETTE[2];

    return (
        <>
            <div className="fixed inset-0 z-40" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} />
            <div
                className="fixed z-50 w-[320px] max-w-[96vw] rounded-xl border border-[#E6EAF2] bg-white p-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
                style={{ left, top: y }}
                onMouseDown={(e) => { e.stopPropagation(); }}
            >
                <div className="p-2">
                    <input
                        autoFocus
                        value={label}
                        onChange={(e) => { setLabel(e.target.value); onDraftChange(e.target.value); }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (label.trim()) onCreateFromInput(label.trim()); }
                        }}
                        placeholder="예: 참고사항, 추가할 일 등"
                        className="w-full rounded-md border border-[#D1D5DB] px-3 py-2 text-[13px] outline-none focus:border-[#9DB8FF] focus:ring-2 focus:ring-[#E4EEFF]"
                    />
                </div>

                {label.trim() && (
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCreateFromInput(label.trim()); }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[#F8FAFC]"
                    >
                        <span className="text-[12px] text-[#6B7280]">생성</span>
                        <span className={`rounded px-2 py-[2px] text-[12px] ${preview.bg} ${preview.text}`}>{label.trim()}</span>
                    </button>
                )}

                <div className="my-1 border-t border-[#EEF2F7]" />
                <div className="px-3 py-2 text-[12px] text-[#6B7280]">옵션 선택</div>

                <div className="max-h-[220px] overflow-auto p-2 pt-0">
                    {([
                        { k: "done" as ColumnKey,    label: COLUMN_STYLE.done.label,    badge: COLUMN_STYLE.done.badgeClass },
                        { k: "todo" as ColumnKey,    label: COLUMN_STYLE.todo.label,    badge: COLUMN_STYLE.todo.badgeClass },
                        { k: "note" as ColumnKey,    label: COLUMN_STYLE.note.label,    badge: COLUMN_STYLE.note.badgeClass },
                        { k: "good" as ColumnKey,    label: COLUMN_STYLE.good.label,    badge: COLUMN_STYLE.good.badgeClass },
                        { k: "learned" as ColumnKey, label: COLUMN_STYLE.learned.label, badge: COLUMN_STYLE.learned.badgeClass },
                    ]).map(opt => (
                        <button
                            key={opt.k}
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPick(opt.k); }}
                            className="mb-2 flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-[#F8FAFC]"
                        >
                            <span className={`rounded px-2 py-[2px] text-[12px] ${opt.badge}`}>{opt.label}</span>
                            <span className="text-[12px] text-[#9CA3AF]">추가</span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

function UserSection({
                         data, isOpen, onRemove, onToggle, onAddItem, onRemoveItem,
                     }: {
    data: ColumnUser;
    isOpen: boolean;
    onRemove: () => void;
    onToggle: () => void;
    onAddItem: (content: string) => void;
    onRemoveItem: (itemId: string) => void;
}) {
    const [adding, setAdding] = useState(false);
    const [text, setText] = useState("");
    const add = () => { const v = text.trim(); if (!v) return; onAddItem(v); setText(""); };

    const count = data.items.length;

    return (
        <div className="rounded-xl border border-[#EEF2F7]">
            <div className="flex items-center justify-between rounded-t-xl bg-[#F6F9FD] px-3 py-2">
                <button type="button" onClick={onToggle} className="flex items-center gap-2">
                    <span className="text-[12px] text-[#64748B]">{isOpen ? "▾" : "▸"}</span>
                    <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[12px] text-[#6B7280]">
              {data.name[0]}
            </span>
            <span className="text-[13px] text-[#111827]">{data.name}</span>
            <span className="text-[12px] text-[#9CA3AF]">{count}</span>
          </span>
                </button>
                <button type="button" onClick={onRemove} className="rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-[12px] text-[#DC2626] hover:bg-[#FFF1F2]">삭제</button>
            </div>

            {isOpen && (
                <div className="space-y-2 p-3">
                    {data.items.map(it => (
                        <div key={it.id} className="rounded-lg bg-[#F8FAFF] p-2">
                            <div className="whitespace-pre-wrap text-[13px] text-[#111827]">{it.content}</div>
                            <div className="mt-1 flex items-center justify-between">
                                <div className="text-[11px] text-[#94A3B8]">{new Date(it.createdAt).toLocaleString()}</div>
                                <button type="button" onClick={() => onRemoveItem(it.id)} className="rounded-md border border-[#EEF2F7] bg-white px-2 py-1 text-[11px] text-[#DC2626] hover:bg-[#FFF1F2]">삭제</button>
                            </div>
                        </div>
                    ))}

                    {!adding && (
                        <button type="button" onClick={() => setAdding(true)} className="w-full rounded-md border-2 border-dashed border-[#D9E2F2] px-3 py-2 text-left text-[13px] text-[#7B91F8]">
                            + 내용 추가
                        </button>
                    )}
                    {adding && (
                        <div className="space-y-2">
                            <div className="rounded-lg bg-[#F3F6FB] p-2 text-[13px] text-[#94A3B8]">내용을 입력해 주세요.</div>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border border-[#CFDAE8] px-3 py-2 text-[13px] outline-none placeholder:text-[#9CA3AF] focus:border-[#9DB8FF] focus:ring-2 focus:ring-[#E4EEFF]"
                                placeholder="내용 입력"
                                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); add(); } }}
                            />
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={add} className="rounded-md bg-[#7B91F8] px-3 py-2 text-[13px] text-white">추가</button>
                                <button type="button" onClick={() => { setAdding(false); setText(""); }} className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] hover:bg-[#F8FAFC]">취소</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* 참가자 드롭다운 */
function AddUserRow({
                        participants = [],
                        onSelect,
                    }: {
    participants?: string[];
    onSelect: (name: string) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
                className="text-[13px] text-[#7B91F8]"
            >
                + 사용자 추가
            </button>

            {open && (
                <div
                    className="mt-2 w-full max-w-[240px] rounded-md border border-[#E5E7EB] bg-white p-2 shadow"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                    {participants.length === 0 && (
                        <div className="p-2 text-[12px] text-[#94A3B8]">참석자를 먼저 입력하세요.</div>
                    )}
                    {participants.map((name) => (
                        <button
                            key={name}
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(name); setOpen(false); }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1 hover:bg-[#F8FAFC]"
                            title={name}
                        >
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#E5E7EB] bg:white text-[12px] text-[#6B7280]">
                                {name[0]}
                            </div>
                            <div className="text-[13px] text-[#111827]">{name}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ───────────────────────────────────────────────────────────
   [WHY] 서버 응답 스냅샷에 columns가 없거나 빈 배열일 수 있어 length 안전 체크
─────────────────────────────────────────────────────────── */
function colsLength(boardSnapshot: any): number {
    return Array.isArray(boardSnapshot?.columns) ? boardSnapshot.columns.length : 0;
}