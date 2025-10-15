// Details.tsx
import React from "react";

/* ───────────── 유틸 ───────────── */

function formatKRDateTime(input?: string | number | Date) {
    if (!input && input !== 0) return "—";
    const d = typeof input === "string" || typeof input === "number" ? new Date(input) : input;
    if (!d || Number.isNaN(d.getTime())) return "—";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    let h = d.getHours();
    const min = String(d.getMinutes()).padStart(2, "0");
    const ap = h < 12 ? "오전" : "오후";
    h = h % 12 || 12;
    return `${y}. ${m}. ${day} ${ap} ${h}:${min}`;
}

/* 화면용 표기 */
const dText = (d: Date) =>
    `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}`;
const tText = (d: Date) => {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ap = h < 12 ? "오전" : "오후";
    h = h % 12 || 12;
    return `${ap} ${String(h).padStart(2, "0")}:${m}`;
};

/* 네이티브 입력/파서 */
const toNativeDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toNativeTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const parseLocal = (date: string, time: string) => new Date(`${date}T${time || "00:00"}`);

/* ───────────── 타입 ───────────── */

type Props = {
    meetingId: string;
    ownerId: string;

    allDay: boolean; setAllDay: (v: boolean) => void;
    start: Date; setStart: (d: Date) => void;
    end: Date; setEnd: (d: Date) => void;

    team: string; setTeam: (v: string) => void;
    teamOptions: readonly string[];

    location: string; setLocation: (v: string) => void;

    participants: string; setParticipants: (v: string) => void;

    /* 상위 호환(표시 안 함) */
    lastEditorName?: string;
    lastEditedAt?: string | number | Date;

    createdByName?: string; createdAt?: string | number | Date;

    currentUserId?: string;
    currentUserName?: string;

    // key: 팀명, value: 멤버 이름 배열
    teamDirectory?: Record<string, string[]>;
};

/* ───────────── 메인 ───────────── */

export default function Details({
                                    meetingId, ownerId,
                                    allDay, setAllDay,
                                    start, setStart, end, setEnd,
                                    team, setTeam, teamOptions,
                                    location, setLocation,
                                    participants, setParticipants,
                                    lastEditorName, lastEditedAt,
                                    createdByName, createdAt,
                                    currentUserId, currentUserName,
                                    teamDirectory,
                                }: Props) {
    /* 권한 */
    const participantList = React.useMemo(
        () => participants.split(",").map(s => s.trim()).filter(Boolean),
        [participants]
    );
    const myName = (currentUserName ?? "").trim();
    const isOwner = !ownerId || (!!currentUserId && currentUserId === ownerId);
    const isParticipant = !!myName && participantList
        .some(p => p.localeCompare(myName, undefined, { sensitivity: "base" }) === 0);
    const canManageAttendees = isOwner;
    const canEditDetails = isOwner || isParticipant || meetingId === "new";

    /* 생성자/생성일 표기 */
    const isNew = meetingId === "new";
    const createdByDisplay = React.useMemo(() => {
        if (createdByName && createdByName.trim()) return createdByName;
        if (isNew || !ownerId) return myName || undefined;
        return undefined;
    }, [createdByName, isNew, ownerId, myName]);

    const createdAtDisplay = React.useMemo(() => {
        if (createdAt) return createdAt;
        if (isNew || !ownerId) return Date.now();
        return undefined;
    }, [createdAt, isNew, ownerId]);

    /* 추가: 생성자 이름(폴백 포함) */
    const creatorName = (createdByName?.trim() || myName || "").trim();

    /* setter (동작 그대로) */
    const wSetAllDay = (v: boolean) => setAllDay(v);
    const wSetStart  = (d: Date) => setStart(d);
    const wSetEnd    = (d: Date) => setEnd(d);
    const wSetLoc    = (v: string) => setLocation(v);
    const wSetPart   = (v: string) => setParticipants(v);
    const wSetTeam   = (v: string) => setTeam(v);

    const initial = (name?: string) => name?.trim()?.charAt(0) ?? "—";

    /* 추가: 참여자 후보에 생성자 강제 포함 */
    const participantsCandidates = React.useMemo(() => {
        const base = (teamDirectory?.[team] ?? []);
        const set = new Set<string>(base);
        if (creatorName) set.add(creatorName);
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [teamDirectory, team, creatorName]);

    /* 추가: 생성자 표시값(아바타/텍스트 공통 사용) */
    const creatorDisplay = createdByDisplay ?? creatorName;

    return (
        <section className="space-y-7 pt-5 text-xs text-slate-400" style={{ scrollbarGutter: "stable both-edges" as any }}>
            <div className="relative overflow-visible" style={{ minHeight: 320 }}>
                <div className="will-change-transform">
                    <div className="flex w-full items-start gap-3.5">
                        <div className="flex w-full flex-col space-y-2">

                            {/* 종일 */}
                            <InfoRow label="종일">
                                <div className="h-4 w-4">
                                    <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={allDay}
                                        data-state={allDay ? "checked" : "unchecked"}
                                        onClick={() => wSetAllDay(!allDay)}
                                        className={[
                                            "m-0 h-4 w-4 shrink-0 rounded-sm border p-0 text-center",
                                            "border-slate-300 hover:bg-slate-100",
                                            "data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white",
                                            !canEditDetails ? "opacity-50 cursor-not-allowed" : "",
                                        ].join(" ")}
                                        disabled={!canEditDetails}
                                    >
                                        {allDay && (
                                            <span className="pointer-events-none flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                             className="h-full w-full">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                                        )}
                                    </button>
                                </div>
                            </InfoRow>

                            {/* 시작 - 날짜 */}
                            <InfoRow label="시작">
                                <div className="meeting-date-picker relative -ml-[38px] flex h-full w-full rounded-sm py-2 pl-2 min-w-[154px]">
                                    <div className="flex w-full items-center space-x-[5px]">
                                        <span className="shrink-0 leading-none text-[10px] text-slate-500">날짜</span>
                                        <DateCell
                                            valueText={dText(start)}
                                            nativeValue={toNativeDate(start)}
                                            onChange={(iso) => wSetStart(parseLocal(iso, allDay ? "00:00" : toNativeTime(start)))}
                                            disabled={!canEditDetails}
                                        />
                                    </div>
                                </div>
                            </InfoRow>

                            {/* 시작 - 시간 */}
                            <InfoRow label="">
                                <div className="meeting-date-picker relative -ml-[38px] flex h-full w-full rounded-sm py-2 pl-2">
                                    <div className="flex w-full items-center space-x-[5px]">
                                        <span className="shrink-0 leading-none text-[10px] text-slate-500">시간</span>
                                        <div className="w-full min-w-[135px]">
                                            <TimeCell
                                                valueText={tText(start)}
                                                nativeValue={toNativeTime(start)}
                                                onChange={(hhmm) => wSetStart(parseLocal(toNativeDate(start), hhmm))}
                                                disabled={allDay || !canEditDetails}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </InfoRow>

                            {/* 종료 - 날짜 */}
                            <InfoRow label="종료">
                                <div className="meeting-date-picker relative -ml-[38px] flex h-full w-full rounded-sm py-2 pl-2 min-w-[154px]">
                                    <div className="flex w-full items-center space-x-[5px]">
                                        <span className="shrink-0 leading-none text-[10px] text-slate-500">날짜</span>
                                        <DateCell
                                            valueText={dText(end)}
                                            nativeValue={toNativeDate(end)}
                                            onChange={(iso) => wSetEnd(parseLocal(iso, allDay ? "23:59" : toNativeTime(end)))}
                                            disabled={!canEditDetails}
                                        />
                                    </div>
                                </div>
                            </InfoRow>

                            {/* 종료 - 시간 */}
                            <InfoRow label="">
                                <div className="meeting-date-picker relative -ml-[38px] flex h-full w-full rounded-sm py-2 pl-2">
                                    <div className="flex w-full items-center space-x-[5px]">
                                        <span className="shrink-0 leading-none text-[10px] text-slate-500">시간</span>
                                        <div className="w-full min-w-[135px]">
                                            <TimeCell
                                                valueText={tText(end)}
                                                nativeValue={toNativeTime(end)}
                                                onChange={(hhmm) => wSetEnd(parseLocal(toNativeDate(end), hhmm))}
                                                disabled={allDay || !canEditDetails}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </InfoRow>

                            {/* 위치 */}
                            <InfoRow label="위치">
                                <LocationField
                                    value={location}
                                    onChange={wSetLoc}
                                    disabled={!canEditDetails}
                                />
                            </InfoRow>

                            {/* 팀 (단일) — 자동완성 UI */}
                            <InfoRow label="팀">
                                <TeamAutocomplete
                                    value={team}
                                    onChange={(v) => wSetTeam(v)}
                                    options={teamOptions}
                                    disabled={!canManageAttendees}
                                />
                            </InfoRow>

                            {/* 참여자 — 자동완성 UI (팀 기반 후보 + 생성자 포함) */}
                            <div className="flex w-full items-start">
                                <div className="information-label mt-1.5 whitespace-nowrap"
                                     style={{ width: "clamp(65px, 62.5% - 72.5px, 115px)" }}>
                                    참여자
                                </div>
                                <div className="pl-2 relative flex-1">
                                    <ParticipantsAutocomplete
                                        value={participants}
                                        onChange={wSetPart}
                                        disabled={!canManageAttendees}
                                        candidates={participantsCandidates}
                                    />
                                </div>
                            </div>

                            {/* 메타 (생성자/생성일) */}
                            <div className="w-full text-xs text-slate-500 space-y-2 mt-2">
                                <InfoRow label="생성자">
                                    <div className="flex h-3.5 items-center space-x-2 overflow-visible">
                                        <div>
                                            <div className="profile-sm relative overflow-hidden rounded-full border border-slate-200">
                                                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-900">
                                                    {initial(creatorDisplay)}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="truncate text-slate-900">{creatorDisplay}</p>
                                    </div>
                                </InfoRow>

                                <InfoRow label="생성일">
                                    <p>{formatKRDateTime(createdAtDisplay)}</p>
                                </InfoRow>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ───────────── 프리미티브 ───────────── */

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex !min-h-7 w-full justify-between h-7 items-center">
            <div className="information-label flex whitespace-nowrap" style={{ width: "clamp(65px, 62.5% - 72.5px, 115px)" }}>
                {label}
            </div>
            <div className="pl-2 relative flex-1">{children}</div>
        </div>
    );
}

function CalendarIcon({ className = "" }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
             strokeWidth="1.5" stroke="currentColor" aria-hidden="true" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5A2.25 2.25 0 0 1 5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25M3 18.75A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75M3 18.75v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
    );
}
function ClockIcon({ className = "" }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
             strokeWidth="1.5" stroke="currentColor" aria-hidden="true" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
    );
}

/* ───────────── 자동완성 컴포넌트 ───────────── */

/** 위치: 클릭 시 파란 포커스 링이 뜨는 표시 전용 필드 (실제 입력은 투명 input) */
function LocationField({
                           value,
                           onChange,
                           disabled,
                       }: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}) {
    const [focused, setFocused] = React.useState(false);

    return (
        <div className={`relative w-full ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
            {/* 표시 박스 */}
            <div
                className={[
                    "flex h-[30px] items-center rounded-sm border px-2 text-xs transition",
                    value ? "bg-slate-100 text-slate-900" : "bg-white text-slate-400",
                    "border-slate-300",
                    focused ? "ring-2 ring-blue-500 border-blue-500 bg-white text-slate-900" : "",
                ].join(" ")}
            >
        <span className="line-clamp-1">
          {value || "위치를 입력해 주세요."}
        </span>
            </div>

            {/* 실제 입력 */}
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="위치를 입력해 주세요."
                disabled={disabled}
                className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </div>
    );
}

/** 팀: 단일 선택 자동완성 */
function TeamAutocomplete({
                              value, onChange, options, disabled,
                          }: { value: string; onChange: (v: string) => void; options: readonly string[]; disabled?: boolean }) {
    const [open, setOpen] = React.useState(false);
    const [q, setQ] = React.useState("");
    const boxRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const onDown = (e: MouseEvent) => { if (!boxRef.current) return; if (!boxRef.current.contains(e.target as Node)) setOpen(false); };
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, []);

    const filtered = React.useMemo(
        () => options.filter(o => o.toLowerCase().includes(q.trim().toLowerCase())),
        [options, q]
    );

    const currentLabel = value || "";

    return (
        <div ref={boxRef} className={`relative w-full ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
            <div className="rounded-md border border-slate-300 bg-white">
                <div className="flex items-center">
                    <input
                        className="w-full rounded-md bg-transparent px-3 py-2 text-xs text-slate-900 outline-none"
                        placeholder={currentLabel ? currentLabel : "팀 선택"}
                        value={q}
                        onFocus={() => !disabled && setOpen(true)}
                        onChange={(e) => setQ(e.target.value)}
                        disabled={disabled}
                    />
                </div>
            </div>

            {open && !disabled && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-300 bg-white shadow-md max-h-60 overflow-auto">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400">결과 없음</div>
                    ) : filtered.map(name => (
                        <button
                            key={name}
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                            onClick={() => { onChange(name); setQ(""); setOpen(false); }}
                        >
                            <Avatar text={name.trim().charAt(0)} highlight />
                            <span className="text-slate-900 text-xs">{name}</span>
                        </button>
                    ))}
                    {value && (
                        <div className="border-t border-slate-100">
                            <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
                                onClick={() => { onChange(""); setQ(""); setOpen(false); }}
                            >
                                선택 해제
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/** 참여자: 다중 선택 자동완성 (콤마-문자열로 상위와 동기화) */
function ParticipantsAutocomplete({
                                      value, onChange, disabled, candidates,
                                  }: {
    value: string; onChange: (v: string) => void; disabled?: boolean; candidates: string[];
}) {
    const list = React.useMemo(() => value.split(",").map(s => s.trim()).filter(Boolean), [value]);
    const [q, setQ] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const boxRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const onDown = (e: MouseEvent) => { if (!boxRef.current) return; if (!boxRef.current.contains(e.target as Node)) setOpen(false); };
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, []);

    const filtered = React.useMemo(() => {
        const base = candidates.filter(c => !list.includes(c)); // 이미 선택한 사람 제외
        const ql = q.trim().toLowerCase();
        return ql ? base.filter(c => c.toLowerCase().includes(ql)) : base;
    }, [candidates, list, q]);

    const add = (name: string) => {
        if (disabled) return;
        if (!name || list.includes(name)) return;
        onChange([...list, name].join(", "));
        setQ("");
        setOpen(false);
    };
    const remove = (name: string) => {
        if (disabled) return;
        onChange(list.filter(n => n !== name).join(", "));
    };

    return (
        <div ref={boxRef} className={`relative w-full ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
            {/* 입력 박스 + 선택된 사람(칩) */}
            <div className="rounded-md border border-slate-300 bg-white p-2">
                <div className="flex flex-wrap items-center gap-2">
                    {list.map(n => (
                        <span key={n} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-2 h-6 text-[12px]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-[11px] text-slate-900">{n.trim().charAt(0)}</span>
              <span className="text-slate-900">{n}</span>
                            {!disabled && (
                                <button className="text-slate-400 hover:text-slate-600" onClick={() => remove(n)} type="button" title="삭제">×</button>
                            )}
            </span>
                    ))}
                    <input
                        className="flex-1 min-w-[120px] rounded-sm bg-transparent text-[12px] outline-none placeholder:text-slate-400"
                        placeholder={list.length === 0 ? "이름 입력" : ""}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onFocus={() => !disabled && setOpen(true)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && filtered[0]) { e.preventDefault(); add(filtered[0]); }
                            if (e.key === "Backspace" && q === "" && !disabled && list.length > 0) {
                                remove(list[list.length - 1]); // 마지막 선택 삭제
                            }
                        }}
                        disabled={disabled}
                    />
                </div>
            </div>

            {/* 드롭다운 */}
            {open && !disabled && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-300 bg-white shadow-md max-h-60 overflow-auto">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400">결과 없음</div>
                    ) : filtered.map(name => (
                        <button
                            key={name}
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                            onClick={() => add(name)}
                        >
                            <Avatar text={name.trim().charAt(0)} highlight />
                            <span className="text-slate-900 text-xs">{name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ───────────── 공통 작은 컴포넌트 ───────────── */

function Avatar({ text, highlight = false }: { text: string; highlight?: boolean }) {
    return (
        <div className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px]
      ${highlight ? "border-blue-400 text-slate-900" : "border-slate-300 text-slate-900"} bg-slate-100`}>
            {text}
        </div>
    );
}

function DateCell({
                      valueText,           // 예: dText(start)
                      nativeValue,         // 예: toNativeDate(start)
                      onChange,            // (isoDateString)=>void
                      disabled,
                  }: {
    valueText: string;
    nativeValue: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            className={[
                "group h-full w-full !min-w-[135px] rounded p-2 text-left",
                "bg-transparent hover:bg-slate-200 dark:hover:bg-slate-700/50",
                "cursor-pointer relative",
                disabled ? "opacity-60 cursor-not-allowed hover:bg-transparent" : "",
            ].join(" ")}
        >
            {/* 투명 date input (실제 동작) */}
            <input
                type="date"
                aria-label="날짜"
                value={nativeValue}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="absolute inset-0 opacity-0 cursor-pointer appearance-none"
            />
            {/* 표시 레이어 */}
            <div className="flex items-center justify-between">
                <span className={disabled ? "text-slate-400" : "text-slate-900"}>{valueText}</span>
                <CalendarIcon className={["h-4 w-4", disabled ? "text-slate-400" : "text-slate-900 group-hover:text-slate-700"].join(" ")} />
            </div>
        </button>
    );
}

/** 시간 셀: 날짜 셀과 동일한 hover/클릭 감각 + 투명 time input */
function TimeCell({
                      valueText,           // 예: tText(start)
                      nativeValue,         // 예: toNativeTime(start)
                      onChange,            // (HH:mm)=>void
                      disabled,
                  }: {
    valueText: string;
    nativeValue: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            className={[
                "group h-full w-full !min-w-[135px] rounded p-2 text-left",
                "bg-transparent hover:bg-slate-200 dark:hover:bg-slate-700/50",
                "cursor-pointer relative",
                disabled ? "opacity-60 cursor-not-allowed hover:bg-transparent" : "",
            ].join(" ")}
        >
            {/* 투명 time input (실제 동작) */}
            <input
                type="time"
                aria-label="시간"
                value={nativeValue}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="absolute inset-0 opacity-0 cursor-pointer appearance-none"
            />
            {/* 표시 레이어 */}
            <div className="flex items-center justify-between">
                <span className={disabled ? "text-slate-400" : "text-slate-900"}>{valueText}</span>
                <ClockIcon className={["h-4 w-4", disabled ? "text-slate-400" : "text-slate-600 group-hover:text-slate-700"].join(" ")} />
            </div>
        </button>
    );
}
