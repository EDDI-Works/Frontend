import React from "react";

// 유틸
function formatKRDateTime(input?: string | number | Date) {
    if (!input) return "—";
    const d = typeof input === "string" || typeof input === "number" ? new Date(input) : input;
    if (Number.isNaN(d.getTime())) return "—";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    let h = d.getHours();
    const min = String(d.getMinutes()).padStart(2, "0");
    const ampm = h < 12 ? "오전" : "오후";
    h = h % 12 || 12;
    return `${y}. ${m}. ${day} ${ampm} ${h}:${min}`;
}

type Props = {
    meetingId: string;
    ownerId: string;
    allDay: boolean; setAllDay: (v: boolean) => void;
    start: Date; setStart: (d: Date) => void;
    end: Date; setEnd: (d: Date) => void;
    team: string; setTeam: (v: string) => void;          // 호환용 (UI 미노출)
    teamOptions: readonly string[];
    location: string; setLocation: (v: string) => void;
    participants: string; setParticipants: (v: string) => void;

    lastEditorName?: string; lastEditedAt?: string | number | Date;
    createdByName?: string; createdAt?: string | number | Date;

    currentUserId?: string;
    currentUserName?: string;

    // 후보자 디렉터리(선택). key: 팀명, value: 멤버 이름 배열
    teamDirectory?: Record<string, string[]>;
};

export default function Details({
                                    meetingId, ownerId,
                                    allDay, setAllDay,
                                    start, setStart, end, setEnd,
                                    team, setTeam, teamOptions,
                                    location, setLocation,
                                    participants, setParticipants,
                                    lastEditorName, lastEditedAt, createdByName, createdAt,
                                    currentUserId, currentUserName,
                                    teamDirectory,
                                }: Props) {
    // 날짜/시간 포맷
    const fmtDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const fmtTime = (d: Date) =>
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const parseLocal = (date: string, time: string) => new Date(`${date}T${time || "00:00"}`);

    // 권한
    const participantList = React.useMemo(
        () => participants.split(",").map((s) => s.trim()).filter(Boolean),
        [participants]
    );
    const myName = currentUserName?.trim() || "";
    const isOwner = !!currentUserId && currentUserId === ownerId;
    const isParticipant = !!myName && participantList.includes(myName);
    const canManageAttendees = isOwner;
    const canEditDetails = isOwner || isParticipant;

    // 팀 필터 상태(멀티)
    const [filterTeams, setFilterTeams] = React.useState<string[]>([]);

    const initial = (name?: string) => (name?.trim()?.charAt(0) ?? "—");

    return (
        // [UI-ONLY] 패널 배경/보더 톤 유지
        <div className="rounded-xl bg-[#F9FBFF] border border-[#E6EBF2] p-4 w-[340px] max-w-full text-[#111827]">
            {/* 종일 */}
            <Row label="종일">
                <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    disabled={!canEditDetails}
                    className="h-4 w-4 accent-[#3B82F6] disabled:opacity-50"
                />
            </Row>

            {/* 시작 */}
            <SectionLabel>시작</SectionLabel>
            <Row label="날짜">
                <InputWithIcon
                    icon="calendar" value={fmtDate(start)} disabled={!canEditDetails}
                    onChange={(v) => setStart(parseLocal(v, allDay ? "00:00" : fmtTime(start)))}
                    type="date"
                />
            </Row>
            <Row label="시간">
                <InputWithIcon
                    icon="clock" value={fmtTime(start)} disabled={allDay || !canEditDetails}
                    onChange={(v) => setStart(parseLocal(fmtDate(start), v))} type="time"
                />
            </Row>

            {/* 종료 */}
            <SectionLabel className="mt-4">종료</SectionLabel>
            <Row label="날짜">
                <InputWithIcon
                    icon="calendar" value={fmtDate(end)} disabled={!canEditDetails}
                    onChange={(v) => setEnd(parseLocal(v, allDay ? "23:59" : fmtTime(end)))} type="date"
                />
            </Row>
            <Row label="시간">
                <InputWithIcon
                    icon="clock" value={fmtTime(end)} disabled={allDay || !canEditDetails}
                    onChange={(v) => setEnd(parseLocal(fmtDate(end), v))} type="time"
                />
            </Row>

            {/* 위치 */}
            <SectionLabel className="mt-4">위치</SectionLabel>
            <Row>
                <input
                    className="h-9 w-full rounded-md border border-[#D8DFE8] bg-white px-3 text-[13px] placeholder:text-[#9CA3AF] disabled:opacity-60"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="회의실"
                    disabled={!canEditDetails}
                />
            </Row>

            {/* 팀 필터 */}
            <SectionLabel className="mt-4">팀 필터</SectionLabel>
            <Row>
                <TeamFilterBox
                    allTeams={teamOptions}
                    value={filterTeams}
                    onChange={setFilterTeams}
                    editable={canManageAttendees}
                />
            </Row>

            {/* 참여자 */}
            <SectionLabel className="mt-4">참여자</SectionLabel>
            <ParticipantsEditor
                meetingId={meetingId}
                ownerId={ownerId}
                currentUserId={currentUserId}
                value={participants}
                onChange={setParticipants}
                filterTeams={filterTeams}
                canManage={canManageAttendees}
                teamDirectory={teamDirectory}
            />

            {/* 메타 */}
            <div className="mt-6 space-y-2">
                <MetaRow label="최종 편집자">
                    <Avatar text={initial(lastEditorName)} />
                    <span className="text-[13px]">{lastEditorName ?? "—"}</span>
                </MetaRow>
                <MetaRow label="최종 편집일">
                    <span className="text-[13px]">{formatKRDateTime(lastEditedAt)}</span>
                </MetaRow>
                <MetaRow label="생성자">
                    <Avatar text={initial(createdByName)} />
                    <span className="text-[13px]">{createdByName ?? "—"}</span>
                </MetaRow>
                <MetaRow label="생성일자">
                    <span className="text-[13px]">{formatKRDateTime(createdAt)}</span>
                </MetaRow>
            </div>
        </div>
    );
}

// UI 헬퍼

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`mt-3 mb-1 text-[12px] text-[#6B7280] ${className}`}>{children}</div>;
}

function Row({
                 label, children, className = "",
             }: { label?: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`grid grid-cols-[48px_1fr] items-center gap-2 ${className}`}>
            {label ? <div className="text-[12px] text-[#9AA3AF]">{label}</div> : <div />}
            <div>{children}</div>
        </div>
    );
}

function InputWithIcon({
                           icon, value, onChange, type, disabled,
                       }: {
    icon: "calendar" | "clock"; value: string; onChange: (v: string) => void;
    type: "date" | "time"; disabled?: boolean;
}) {
    return (
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="h-9 w-full rounded-md border border-[#D8DFE8] bg-white pr-9 pl-3 text-[13px] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
            />
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280]">
                {icon === "calendar" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" ry="2" fill="none" stroke="#9CA3AF"/><line x1="3" y1="9" x2="21" y2="9" stroke="#9CA3AF"/><line x1="8" y1="3" x2="8" y2="7" stroke="#9CA3AF"/><line x1="16" y1="3" x2="16" y2="7" stroke="#9CA3AF"/></svg>
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#9CA3AF"/><line x1="12" y1="7" x2="12" y2="12" stroke="#9CA3AF"/><line x1="12" y1="12" x2="16" y2="14" stroke="#9CA3AF"/></svg>
                )}
            </div>
        </div>
    );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[72px_1fr] items-center gap-2">
            <div className="text-[12px] text-[#6B7280]">{label}</div>
            <div className="flex items-center gap-2">{children}</div>
        </div>
    );
}

function Avatar({ text }: { text: string }) {
    return (
        <div className="w-6 h-6 rounded-full bg-[#E5E7EB] text-[#111827] text-[12px] flex items-center justify-center">
            {text}
        </div>
    );
}

// 필터/ 참여자

function TeamFilterBox({
                           allTeams, value, onChange, editable = true,
                       }: { allTeams: readonly string[]; value: string[]; onChange: (next: string[]) => void; editable?: boolean; }) {
    const ref = React.useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
        const onDown = (e: MouseEvent) => { if (!ref.current) return; if (!ref.current.contains(e.target as Node)) setOpen(false); };
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, []);

    const toggle = (t: string) => { if (!editable) return; onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]); };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => editable && setOpen((v) => !v)}
                className={["h-9 w-full rounded-md border border-[#D8DFE8] bg-white px-2 text-left", !editable ? "opacity-60 cursor-not-allowed" : ""].join(" ")}
            >
                <div className="flex flex-wrap items-center gap-2">
                    {value.length === 0 ? (
                        <span className="text-[12px] text-[#9CA3AF]">{editable ? "클릭해서 팀을 선택" : "팀 선택(읽기 전용)"}</span>
                    ) : (
                        value.map((t) => (
                            <span key={t} className="inline-flex h-6 items-center rounded-full border border-[#DADFE7] bg-white px-2 text-[12px] text-[#374151]">{t}</span>
                        ))
                    )}
                </div>
            </button>

            {open && editable && (
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-auto rounded-md border border-[#D8DFE8] bg-white shadow-md">
                    <div className="h-px bg-[#EEF2F7]" />
                    {allTeams.map((t) => {
                        const active = value.includes(t);
                        return (
                            <button
                                key={t}
                                type="button"
                                onClick={() => toggle(t)}
                                className={["w-full px-3 py-2 text-left text-[13px]", active ? "bg-[#F6FAFF]" : "hover:bg-[#F9FAFB]"].join(" ")}
                            >
                                <span className={["inline-flex h-6 items-center rounded-full border px-2", active ? "ring-1 ring-[#3B82F6]" : ""].join(" ")}>{t}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ParticipantsEditor({
                                meetingId, ownerId, currentUserId, value, onChange, filterTeams, canManage, teamDirectory,
                            }: {
    meetingId: string; ownerId: string; currentUserId?: string;
    value: string; onChange: (v: string) => void;
    filterTeams: string[]; canManage: boolean;
    teamDirectory?: Record<string, string[]>;
}) {
    const list = React.useMemo(() => value.split(",").map((s) => s.trim()).filter(Boolean), [value]);
    const [input, setInput] = React.useState("");

    // 부모가 준 teamDirectory에서 후보를 계산
    const memberTeamsMap = React.useMemo(() => {
        const map = new Map<string, Set<string>>();
        if (!teamDirectory) return map;
        filterTeams.forEach((t) => {
            (teamDirectory[t] ?? []).forEach((m) => {
                if (!map.has(m)) map.set(m, new Set());
                map.get(m)!.add(t);
            });
        });
        return map;
    }, [filterTeams, teamDirectory]);

    const candidates = React.useMemo(() => Array.from(memberTeamsMap.keys()), [memberTeamsMap]);

    const add = (name: string) => {
        if (!canManage) return;
        const v = name.trim();
        if (!v || list.includes(v)) return;
        onChange([...list, v].join(", "));
        setInput("");
    };
    const remove = (name: string) => {
        if (!currentUserId || currentUserId !== ownerId) return; // [CHANGED] 소유자만 삭제 가능
        onChange(list.filter((x) => x !== name).join(", "));
    };
    const initial = (s: string) => s.trim().charAt(0);

    return (
        <>
            <div className="rounded-md border border-[#D8DFE8] bg-white p-2">
                <div className="flex flex-wrap items-center gap-2">
                    {list.length === 0 && <span className="text-[12px] text-[#9CA3AF]">비어있음</span>}
                    {list.map((n) => (
                        <div key={n} className="inline-flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#D8DFE8] bg-[#EEF2F7] text-[12px] text-[#111827]">
                                {initial(n)}
                            </div>
                            <span className="text-[13px]">{n}</span>
                            {currentUserId === ownerId && (
                                <button className="ml-1 text-[#9CA3AF] hover:text-[#6B7280]" onClick={() => remove(n)} type="button" title="삭제">×</button>
                            )}
                        </div>
                    ))}
                    <input
                        className="ml-2 flex-1 min-w-[140px] rounded-sm bg-transparent text-[12px] outline-none placeholder:text-[#9CA3AF] disabled:opacity-50"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); } }}
                        placeholder={canManage ? "이름 입력 후 Enter" : "생성자만 추가할 수 있어요"}
                        disabled={!canManage}
                    />
                </div>
            </div>

            {/* 후보 */}
            <div className="mt-2">
                {filterTeams.length === 0 ? (
                    <div className="text-[12px] text-[#9CA3AF]">팀을 먼저 선택하세요.</div>
                ) : candidates.length === 0 ? (
                    <div className="text-[12px] text-[#9CA3AF]">선택된 팀의 후보가 없어요.</div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {candidates.map((m) => {
                            const selected = list.includes(m);
                            const teams = Array.from(memberTeamsMap.get(m) ?? []);
                            return (
                                <button
                                    key={m} type="button"
                                    disabled={selected || !canManage}
                                    className={[
                                        "inline-flex items-center gap-2 rounded-full border border-[#D8DFE8] px-3 h-7 text-[12px]",
                                        selected ? "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
                                            : !canManage ? "bg-white text-[#9CA3AF] cursor-not-allowed"
                                                : "bg-white text-[#374151] hover:bg-[#F4F7FB]"
                                    ].join(" ")}
                                    onClick={() => add(m)}
                                    title={selected ? "이미 추가됨" : canManage ? "추가" : "생성자만 추가 가능"}
                                >
                                    <span>{m}</span>
                                    <span className="flex items-center gap-1">
                    {teams.map((t) => (
                        <span key={t} className="h-5 rounded-full border border-[#D8DFE8] bg-white px-2 text-[11px] text-[#374151]">
                        {t}
                      </span>
                    ))}
                  </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}